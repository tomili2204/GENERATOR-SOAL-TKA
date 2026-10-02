import fs from "fs";
import path from "path";

// 1. Muat Environment Database
if (!process.env.DATABASE_URL) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || "";
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val.trim();
      }
    }
  }
}

import { db } from "../src/db";
import { questions, stimulus, questionPackages } from "../src/db/schema";
import { sql, eq, inArray } from "drizzle-orm";

interface QuestionRecord {
  id: string;
  code: string;
  paketId: string | null;
  elemen: string;
  subElemen: string | null;
  kompetensi: string | null;
  levelKognitif: string | null;
  payload: any;
  status: string;
}

export function standardizeSMPTaxonomy(q: QuestionRecord): {
  elemen: string;
  subElemen: string;
  kompetensi: string;
  levelKognitif: string;
} {
  const oldKomp = (q.kompetensi || "").trim();
  const oldSub = (q.subElemen || "").trim();
  const oldLk = (q.levelKognitif || "").trim();
  const oldEl = (q.elemen || "").trim();

  // 1. Tentukan Kompetensi Target: Pemahaman Tekstual | Pemahaman Inferensial | Evaluasi dan Apresiasi
  let targetKompetensi = "";

  const combined = `${oldKomp} | ${oldLk} | ${oldSub} | ${oldEl}`.toLowerCase();

  // Evaluasi dan Apresiasi
  if (
    /evaluasi\s+dan\s+apresiasi/i.test(combined) ||
    /mengevaluasi/i.test(combined) ||
    /apresiasi/i.test(combined) ||
    /merefleksi/i.test(combined) ||
    /b\.3/i.test(combined) ||
    /a\.3/i.test(combined) ||
    /fakta\s+(?:vs|dan)\s+opini/i.test(combined) ||
    /keabsahan\s+argumen/i.test(combined) ||
    /menilai\s+(?:kesesuaian|keakuratan|kualitas|relevansi|kelayakan|keefektifan|argumen|efektivitas|tujuan|kelemahan)/i.test(combined)
  ) {
    targetKompetensi = "Evaluasi dan Apresiasi";
  }
  // Pemahaman Tekstual
  else if (
    /pemahaman\s+tekstual/i.test(combined) ||
    /mengakses(?:\s+dan\s+menemukan)?/i.test(combined) ||
    /menemukan\s+informasi/i.test(combined) ||
    /b\.1/i.test(combined) ||
    /a\.1/i.test(combined) ||
    /informasi\s+(?:eksplisit|tersurat)/i.test(combined) ||
    /rincian\s+(?:tersurat|data|fakta)/i.test(combined) ||
    /membaca\s+(?:data|proporsi|urutan)/i.test(combined) ||
    /mengidentifikasi\s+(?:informasi\s+penting|objek|latar|istilah|data)/i.test(combined) ||
    /mengelompokkan\s+istilah/i.test(combined) ||
    /menyusun\s+kembali/i.test(combined)
  ) {
    targetKompetensi = "Pemahaman Tekstual";
  }
  // Pemahaman Inferensial
  else if (
    /pemahaman\s+inferensial/i.test(combined) ||
    /menginterpretasi(?:\s+dan\s+mengintegrasi)?/i.test(combined) ||
    /b\.2/i.test(combined) ||
    /a\.2/i.test(combined) ||
    /inferensial/i.test(combined) ||
    /sebab[- ]akibat/i.test(combined) ||
    /ide\s+pokok/i.test(combined) ||
    /watak\s+tokoh/i.test(combined) ||
    /amanat/i.test(combined) ||
    /memadukan/i.test(combined) ||
    /membandingkan/i.test(combined) ||
    /memprediksi/i.test(combined) ||
    /menyimpulkan/i.test(combined) ||
    /menafsirkan/i.test(combined) ||
    /kelogisan/i.test(combined)
  ) {
    targetKompetensi = "Pemahaman Inferensial";
  }
  // Fallback berdasarkan level kognitif lama
  else if (/penalaran|l3/i.test(oldLk)) {
    targetKompetensi = "Evaluasi dan Apresiasi";
  } else if (/aplikasi|l2/i.test(oldLk)) {
    targetKompetensi = "Pemahaman Inferensial";
  } else if (/pengetahuan|pemahaman|l1/i.test(oldLk)) {
    targetKompetensi = "Pemahaman Tekstual";
  } else {
    targetKompetensi = "Pemahaman Inferensial";
  }

  // 2. Ekstrak & Bersihkan Sub-Elemen
  let extractedSub = "";

  if (oldKomp.includes(":")) {
    const parts = oldKomp.split(":");
    extractedSub = parts.slice(1).join(":").trim();
  } else if (
    !["pemahaman tekstual", "pemahaman inferensial", "evaluasi dan apresiasi"].includes(oldKomp.toLowerCase())
  ) {
    extractedSub = oldKomp;
  } else if (oldSub && oldSub !== oldKomp) {
    extractedSub = oldSub;
  }

  // Bersihkan kode prefiks (misal "A.1", "B.2.", "B.3 - ")
  extractedSub = extractedSub.replace(/^[A-Z]\.\d+\.?\s*[-–:]?\s*/i, "").trim();

  // Jika masih kosong atau nama kompetensi umum, buatkan deskripsi operasional standar
  if (!extractedSub || ["pemahaman tekstual", "pemahaman inferensial", "evaluasi dan apresiasi"].includes(extractedSub.toLowerCase())) {
    if (targetKompetensi === "Pemahaman Tekstual") {
      extractedSub = "Menemukan dan mengidentifikasi informasi tersurat dalam teks";
    } else if (targetKompetensi === "Pemahaman Inferensial") {
      extractedSub = "Menyimpulkan makna tersirat, hubungan sebab-akibat, atau gagasan utama teks";
    } else {
      extractedSub = "Menilai keabsahan informasi, akurasi fakta vs opini, atau relevansi nilai teks";
    }
  }

  extractedSub = extractedSub.charAt(0).toUpperCase() + extractedSub.slice(1);

  return {
    elemen: "Membaca dan Memirsa",
    subElemen: extractedSub,
    kompetensi: targetKompetensi,
    levelKognitif: targetKompetensi,
  };
}

export function splitSingleParagraphToMulti(content: string): string {
  const parts = content.split(/(\n\s*(?:daftar\s+istilah|glosarium)[\s\S]*$)/i);
  const mainText = parts[0].trim();
  const glossary = parts[1] || "";

  const existingParas = mainText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (existingParas.length > 1) {
    return content;
  }

  const sentences = mainText.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [mainText];
  if (sentences.length <= 4) {
    return content;
  }

  const totalWords = mainText.split(/\s+/).filter(Boolean).length;
  const targetNumParas = totalWords >= 210 ? 3 : 2;
  const sentencesPerPara = Math.ceil(sentences.length / targetNumParas);

  const newParas: string[] = [];
  for (let i = 0; i < sentences.length; i += sentencesPerPara) {
    const chunk = sentences.slice(i, i + sentencesPerPara).join("").trim();
    if (chunk) newParas.push(chunk);
  }

  const formattedMain = newParas.join("\n\n");
  return glossary ? `${formattedMain}\n\n${glossary.trim()}` : formattedMain;
}

async function main() {
  console.log("================================================================================");
  console.log("STANDARISASI KOMPREHENSIF SELURUH SOAL & WACANA BAHASA INDONESIA SMP");
  console.log("Standar: BSKAP No. 47/2025, Kurikulum Merdeka, Multi-Paragraf Wacana");
  console.log("================================================================================\n");

  // 1. Ambil Semua Soal SMP Bahasa Indonesia
  const allSmpQuestions = await db
    .select({
      id: questions.id,
      code: questions.code,
      paketId: questions.paketId,
      elemen: questions.elemen,
      subElemen: questions.subElemen,
      kompetensi: questions.kompetensi,
      levelKognitif: questions.levelKognitif,
      payload: questions.payload,
      status: questions.status,
      stimulusId: questions.stimulusId,
    })
    .from(questions)
    .where(sql`${questions.jenjang} ILIKE '%smp%' AND ${questions.mapel} ILIKE '%indonesia%'`);

  console.log(`Ditemukan ${allSmpQuestions.length} butir soal Bahasa Indonesia SMP.`);

  // 2. Ambil Semua Stimulus Terkait
  const smpStimulusIds = Array.from(
    new Set(allSmpQuestions.map((q) => q.stimulusId).filter(Boolean) as string[])
  );

  let smpStimuli: typeof stimulus.$inferSelect[] = [];
  if (smpStimulusIds.length > 0) {
    smpStimuli = await db
      .select()
      .from(stimulus)
      .where(inArray(stimulus.id, smpStimulusIds));
  }
  console.log(`Ditemukan ${smpStimuli.length} stimulus wacana terkait.`);

  // 3. Simpan Cadangan (Backup Safe)
  const backupDir = path.join(process.cwd(), "scratch");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `backup-smp-bin-${Date.now()}.json`);

  const backupData = {
    timestamp: new Date().toISOString(),
    totalQuestions: allSmpQuestions.length,
    totalStimuli: smpStimuli.length,
    questions: allSmpQuestions,
    stimuli: smpStimuli,
  };
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf8");
  console.log(`\n✓ Backup aman tersimpan di: ${backupPath}\n`);

  // 4. Siapkan Data Pembaruan Soal
  const questionUpdates: Array<{
    id: string;
    elemen: string;
    subElemen: string;
    kompetensi: string;
    levelKognitif: string;
    payload: any;
  }> = [];

  for (const q of allSmpQuestions) {
    const std = standardizeSMPTaxonomy(q);
    const updatedPayload = {
      ...(q.payload || {}),
      elemen: std.elemen,
      sub_elemen: std.subElemen,
      kompetensi: std.kompetensi,
      level_kognitif: std.levelKognitif,
    };

    questionUpdates.push({
      id: q.id,
      elemen: std.elemen,
      subElemen: std.subElemen,
      kompetensi: std.kompetensi,
      levelKognitif: std.levelKognitif,
      payload: updatedPayload,
    });
  }

  // 5. Siapkan Data Pembaruan Wacana (Multi-Paragraf)
  const stimuliUpdates: Array<{
    id: string;
    newContent: string;
  }> = [];

  let singleParaFixed = 0;
  for (const st of smpStimuli) {
    const formatted = splitSingleParagraphToMulti(st.konten || "");
    if (formatted !== st.konten) {
      stimuliUpdates.push({
        id: st.id,
        newContent: formatted,
      });
      singleParaFixed++;
    }
  }

  console.log(`• Rencana pembaruan Butir Soal: ${questionUpdates.length} butir`);
  console.log(`• Rencana format ulang Wacana : ${stimuliUpdates.length} stimulus (paragraf tunggal -> multi)\n`);

  // 6. Jalankan Transaksi Database
  console.log("Menjalankan transaksi pembaruan ke database PostgreSQL...");
  const tStart = Date.now();

  await db.transaction(async (tx) => {
    // A. Update Soal
    for (const u of questionUpdates) {
      await tx
        .update(questions)
        .set({
          elemen: u.elemen,
          subElemen: u.subElemen,
          kompetensi: u.kompetensi,
          levelKognitif: u.levelKognitif,
          payload: u.payload,
          updatedAt: new Date(),
        })
        .where(eq(questions.id, u.id));
    }

    // B. Update Wacana
    for (const s of stimuliUpdates) {
      await tx
        .update(stimulus)
        .set({
          konten: s.newContent,
          updatedAt: new Date(),
        })
        .where(eq(stimulus.id, s.id));
    }
  });

  console.log(`✓ Transaksi database sukses dalam ${Date.now() - tStart}ms!\n`);

  // 7. Verifikasi Pasca-Standarisasi
  console.log("================================================================================");
  console.log("VERIFIKASI PASCA-STANDARISASI");
  console.log("================================================================================");

  const checkTaxonomy = await db.execute(sql`
    SELECT kompetensi, COUNT(*)::int as total
    FROM soal.questions
    WHERE jenjang ILIKE '%smp%' AND mapel ILIKE '%indonesia%'
    GROUP BY kompetensi
    ORDER BY total DESC
  `);
  console.log("\nDistribusi Kompetensi BSKAP SMP Terverifikasi:");
  console.table((checkTaxonomy as any).rows);

  const checkElemen = await db.execute(sql`
    SELECT elemen, COUNT(*)::int as total
    FROM soal.questions
    WHERE jenjang ILIKE '%smp%' AND mapel ILIKE '%indonesia%'
    GROUP BY elemen
  `);
  console.log("Distribusi Elemen SMP Terverifikasi:");
  console.table((checkElemen as any).rows);

  const checkLevelKog = await db.execute(sql`
    SELECT level_kognitif, COUNT(*)::int as total
    FROM soal.questions
    WHERE jenjang ILIKE '%smp%' AND mapel ILIKE '%indonesia%'
    GROUP BY level_kognitif
  `);
  console.log("Distribusi Level Kognitif SMP Terverifikasi:");
  console.table((checkLevelKog as any).rows);

  // Cek Stimulus
  let remainingSingle = 0;
  let verifiedMulti = 0;
  if (smpStimulusIds.length > 0) {
    const postStimuli = await db
      .select()
      .from(stimulus)
      .where(inArray(stimulus.id, smpStimulusIds));

    for (const st of postStimuli) {
      const parts = (st.konten || "").split(/(\n\s*(?:daftar\s+istilah|glosarium)[\s\S]*$)/i);
      const paras = parts[0].trim().split(/\n\s*\n/).filter((p) => p.trim().length > 0);
      if (paras.length <= 1) remainingSingle++;
      else verifiedMulti++;
    }
  }

  console.log(`\nStatus Format Wacana SMP:`);
  console.log(`• Multi-paragraf: ${verifiedMulti} stimulus (${Math.round((verifiedMulti/smpStimuli.length)*100)}%)`);
  console.log(`• Paragraf tunggal tersisa: ${remainingSingle} stimulus`);

  console.log("\n================================================================================");
  console.log("STANDARISASI SELURUH SOAL & WACANA SMP BAHASA INDONESIA SELESAI DENGAN SUKSES!");
  console.log("================================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Gagal standarisasi:", e);
    process.exit(1);
  });
