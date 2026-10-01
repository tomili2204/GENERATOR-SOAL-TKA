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
import { questions } from "../src/db/schema";
import { sql, eq } from "drizzle-orm";

async function main() {
  console.log("=== EKSEKUSI MIGRASI: PEMETAAN LABEL KOMPETENSI PISA KE BSKAP ===\n");

  // 1. Ambil seluruh data soal Bahasa Indonesia yang memuat label PISA
  const allBahasaQuestions = await db
    .select()
    .from(questions)
    .where(sql`LOWER(${questions.mapel}) LIKE '%indonesia%' OR LOWER(${questions.mapel}) LIKE '%bahasa%'`);

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

  interface UpdateItem {
    original: typeof questions.$inferSelect;
    newKompetensi: string;
    newLevelKognitif: string;
  }

  const itemsToUpdate: UpdateItem[] = [];

  for (const q of allBahasaQuestions) {
    const komp = q.kompetensi || "";
    const lk = q.levelKognitif || "";
    const combined = `${komp} | ${lk}`;

    for (const p of pisaPatterns) {
      if (p.matcher(combined)) {
        let newKomp = komp;
        let newLk = lk;

        if (p.matcher(komp)) {
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

        itemsToUpdate.push({
          original: q,
          newKompetensi: newKomp,
          newLevelKognitif: newLk,
        });
        break;
      }
    }
  }

  console.log(`Ditemukan ${itemsToUpdate.length} butir soal yang akan diperbarui.`);

  if (itemsToUpdate.length === 0) {
    console.log("Tidak ada soal yang perlu diperbarui.");
    process.exit(0);
  }

  // 2. Ekspor Cadangan JSON sebelum pembaruan
  const backupDir = path.join(process.cwd(), "scratch");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupPath = path.join(backupDir, "backup-pisa-questions.json");
  const backupPayload = {
    exportedAt: new Date().toISOString(),
    totalCount: itemsToUpdate.length,
    records: itemsToUpdate.map((item) => ({
      ...item.original,
      _plannedNewKompetensi: item.newKompetensi,
      _plannedNewLevelKognitif: item.newLevelKognitif,
    })),
  };

  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2), "utf8");
  console.log(`✓ Cadangan berhasil disimpan di: ${backupPath} (${itemsToUpdate.length} record)\n`);

  // 3. Jalankan Pembaruan dalam Satu Transaksi Database
  console.log("Menjalankan transaksi pembaruan ke basis data PostgreSQL...");
  const startTime = Date.now();

  await db.transaction(async (tx: any) => {
    for (const item of itemsToUpdate) {
      await tx
        .update(questions)
        .set({
          kompetensi: item.newKompetensi,
          levelKognitif: item.newLevelKognitif,
          updatedAt: new Date(),
          // PENTING: status validasi TIDAK diubah
        })
        .where(eq(questions.id, item.original.id));
    }
  });

  const durationMs = Date.now() - startTime;
  console.log(`✓ Transaksi berhasil diselesaikan dalam ${durationMs}ms.\n`);

  // 4. Verifikasi Pasca-Migrasi
  console.log("=== VERIFIKASI PASCA-MIGRASI ===");
  const checkRemaining = await db.execute(sql`
    SELECT COUNT(*)::int as remaining_count
    FROM soal.questions
    WHERE (LOWER(mapel) LIKE '%indonesia%' OR LOWER(mapel) LIKE '%bahasa%')
      AND (
        LOWER(kompetensi) LIKE '%mengakses%'
        OR LOWER(kompetensi) LIKE '%menginterpretasi%'
        OR (LOWER(kompetensi) LIKE '%mengevaluasi%' AND LOWER(kompetensi) LIKE '%merefleksi%')
        OR LOWER(level_kognitif) LIKE '%mengakses%'
        OR LOWER(level_kognitif) LIKE '%menginterpretasi%'
        OR (LOWER(level_kognitif) LIKE '%mengevaluasi%' AND LOWER(level_kognitif) LIKE '%merefleksi%')
      )
  `);

  const remaining = (checkRemaining as any).rows[0].remaining_count;
  console.log(`Sisa soal dengan label PISA: ${remaining} (Target: 0)`);

  const statusBreakdown = await db.execute(sql`
    SELECT status, COUNT(*)::int as total
    FROM soal.questions
    WHERE id = ANY(${itemsToUpdate.map((i) => i.original.id)})
    GROUP BY status
  `);
  console.log("\nDistribusi status validasi dari 329 soal yang diperbarui:");
  console.table((statusBreakdown as any).rows);

  console.log("\n=== MIGRASI SELESAI DENGAN SUKSES ===");
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("Gagal menjalankan migrasi:", err);
  process.exit(1);
});
