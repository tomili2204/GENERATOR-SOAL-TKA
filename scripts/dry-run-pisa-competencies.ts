import fs from "fs";
import path from "path";

// Muat .env.local jika process.env.DATABASE_URL belum ada
if (!process.env.DATABASE_URL) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/^DATABASE_URL=(.+)$/m);
    if (match) {
      process.env.DATABASE_URL = match[1].trim();
    }
  }
}

import { db } from "../src/db";
import { questions, questionPackages } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== DRY RUN: AUDIT & PEMETAAN LABEL KOMPETENSI PISA KE BSKAP ===\n");

  // Ambil semua soal Bahasa Indonesia
  const allBahasaQuestions = await db
    .select({
      id: questions.id,
      code: questions.code,
      paketId: questions.paketId,
      jenjang: questions.jenjang,
      mapel: questions.mapel,
      elemen: questions.elemen,
      subElemen: questions.subElemen,
      kompetensi: questions.kompetensi,
      levelKognitif: questions.levelKognitif,
      status: questions.status,
      payload: questions.payload,
    })
    .from(questions)
    .where(sql`LOWER(${questions.mapel}) LIKE '%indonesia%' OR LOWER(${questions.mapel}) LIKE '%bahasa%'`);

  console.log(`Total soal Bahasa di database: ${allBahasaQuestions.length}`);

  // Pola pencarian label lama gaya PISA
  const pisaPatterns = [
    {
      pisaKey: "Mengakses dan Menemukan Informasi",
      targetBskap: "Pemahaman Tekstual",
      matcher: (s: string) => /mengakses/i.test(s),
    },
    {
      pisaKey: "Menginterpretasi dan Mengintegrasi",
      targetBskap: "Pemahaman Inferensial",
      matcher: (s: string) => /menginterpretasi/i.test(s),
    },
    {
      pisaKey: "Mengevaluasi dan Merefleksi",
      targetBskap: "Evaluasi dan Apresiasi",
      matcher: (s: string) => /mengevaluasi/i.test(s) && /merefleksi/i.test(s),
    },
  ];

  interface MatchedQuestion {
    id: string;
    code: string;
    paketId: string | null;
    jenjang: string;
    status: string;
    oldKompetensi: string;
    newKompetensi: string;
    oldLevelKognitif: string;
    newLevelKognitif: string;
    elemen: string;
    subElemen: string | null;
    pisaLabel: string;
    targetLabel: string;
    payloadSnippet?: any;
  }

  const matchedList: MatchedQuestion[] = [];
  const countByPisaLabel: Record<string, number> = {};
  const countByJenjang: Record<string, number> = {};
  const countByStatus: Record<string, number> = {};
  const countByPisaAndStatus: Record<string, Record<string, number>> = {};
  const countByPisaAndJenjang: Record<string, Record<string, number>> = {};

  for (const q of allBahasaQuestions) {
    const komp = q.kompetensi || "";
    const lk = q.levelKognitif || "";
    const combined = `${komp} | ${lk}`;

    for (const p of pisaPatterns) {
      if (p.matcher(combined)) {
        // Tentukan pemetaan
        let newKomp = komp;
        let newLk = lk;

        // Ganti bagian teks kompetensi
        if (p.matcher(komp)) {
          // Ganti frasa PISA dengan target BSKAP (pertahankan suffix deskripsi jika ada)
          newKomp = komp.replace(new RegExp(p.pisaKey, "gi"), p.targetBskap);
          if (newKomp === komp) {
            newKomp = komp.replace(/Mengakses(?:\s+dan\s+Menemukan\s+Informasi)?/gi, p.targetBskap)
                          .replace(/Menginterpretasi(?:\s+dan\s+Mengintegrasi)?/gi, p.targetBskap)
                          .replace(/Mengevaluasi(?:\s+dan\s+Merefleksi)?/gi, p.targetBskap);
          }
        }

        if (p.matcher(lk)) {
          newLk = p.targetBskap;
        }

        matchedList.push({
          id: q.id,
          code: q.code,
          paketId: q.paketId,
          jenjang: q.jenjang,
          status: q.status,
          oldKompetensi: komp,
          newKompetensi: newKomp,
          oldLevelKognitif: lk,
          newLevelKognitif: newLk,
          elemen: q.elemen,
          subElemen: q.subElemen,
          pisaLabel: p.pisaKey,
          targetLabel: p.targetBskap,
          payloadSnippet: q.payload ? {
            level_kognitif: (q.payload as any).level_kognitif,
            kompetensi: (q.payload as any).kompetensi,
          } : undefined,
        });

        countByPisaLabel[p.pisaKey] = (countByPisaLabel[p.pisaKey] || 0) + 1;
        countByJenjang[q.jenjang] = (countByJenjang[q.jenjang] || 0) + 1;
        countByStatus[q.status] = (countByStatus[q.status] || 0) + 1;

        if (!countByPisaAndStatus[p.pisaKey]) countByPisaAndStatus[p.pisaKey] = {};
        countByPisaAndStatus[p.pisaKey][q.status] = (countByPisaAndStatus[p.pisaKey][q.status] || 0) + 1;

        if (!countByPisaAndJenjang[p.pisaKey]) countByPisaAndJenjang[p.pisaKey] = {};
        countByPisaAndJenjang[p.pisaKey][q.jenjang] = (countByPisaAndJenjang[p.pisaKey][q.jenjang] || 0) + 1;

        break;
      }
    }
  }

  console.log(`\n=== 1. TOTAL SOAL TERIDENTIFIKASI MEMUAT LABEL PISA ===`);
  console.log(`Total soal Bahasa Indonesia: ${allBahasaQuestions.length}`);
  console.log(`Total soal memuat label PISA: ${matchedList.length} (${Math.round((matchedList.length / (allBahasaQuestions.length || 1)) * 100)}%)`);

  console.log(`\n=== 2. JUMLAH PER LABEL LAMA (PISA) ===`);
  for (const [k, v] of Object.entries(countByPisaLabel)) {
    console.log(`- ${k} -> ${pisaPatterns.find(p=>p.pisaKey===k)?.targetBskap}: ${v} soal`);
  }

  console.log(`\n=== 3. JUMLAH PER JENJANG ===`);
  for (const [k, v] of Object.entries(countByJenjang)) {
    console.log(`- ${k}: ${v} soal`);
  }

  console.log(`\n=== 4. JUMLAH PER STATUS VALIDASI ===`);
  for (const [k, v] of Object.entries(countByStatus)) {
    console.log(`- ${k}: ${v} soal`);
  }

  console.log(`\n=== 5. MATRIKS SILANG: LABEL PISA x STATUS VALIDASI ===`);
  console.table(countByPisaAndStatus);

  console.log(`\n=== 6. MATRIKS SILANG: LABEL PISA x JENJANG ===`);
  console.table(countByPisaAndJenjang);

  console.log(`\n=== 7. CONTOH 10 SOAL SEBELUM & SESUDAH PEMETAAN ===`);
  const samples = matchedList.slice(0, 10);
  samples.forEach((s, idx) => {
    console.log(`\n[Contoh #${idx + 1}] ID: ${s.id} | Kode: ${s.code} | Jenjang: ${s.jenjang} | Status: ${s.status}`);
    console.log(`  Elemen: "${s.elemen}" | SubElemen: "${s.subElemen || '-'}"`);
    console.log(`  [SEBELUM]`);
    console.log(`    Kompetensi   : "${s.oldKompetensi}"`);
    console.log(`    LevelKognitif: "${s.oldLevelKognitif}"`);
    if (s.payloadSnippet && Object.keys(s.payloadSnippet).length > 0) {
      console.log(`    Payload fields: ${JSON.stringify(s.payloadSnippet)}`);
    }
    console.log(`  [SESUDAH PEMETAAN]`);
    console.log(`    Kompetensi   : "${s.newKompetensi}"`);
    console.log(`    LevelKognitif: "${s.newLevelKognitif}"`);
  });

  // Periksa tabel fixed_taxonomies
  console.log(`\n=== 8. PEMERIKSAAN TABEL LAIN (fixed_taxonomies) ===`);
  const taxHits = await db.execute(sql`
    SELECT id, jenjang, mapel, category, code, name, description 
    FROM soal.fixed_taxonomies 
    WHERE LOWER(name) LIKE '%mengakses%' 
       OR LOWER(name) LIKE '%menginterpretasi%' 
       OR LOWER(name) LIKE '%mengevaluasi%'
  `);
  console.log(`fixed_taxonomies hits: ${(taxHits as any).rows?.length || 0}`);
  if ((taxHits as any).rows?.length) {
    console.log((taxHits as any).rows);
  }

  console.log("\n=== DRY RUN SELESAI (TIDAK ADA DATA YANG DIUBAH PADA LANGKAH INI) ===");
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
