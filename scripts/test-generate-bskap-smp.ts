import fs from "fs";
import path from "path";

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
import { questions, questionPackages, stimulus } from "../src/db/schema";
import { generateBatchQuestions, getStoredAiConfig } from "../src/lib/generator/gemini-generator";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== UJI GENERATOR: PEMBUATAN PAKET DRAFT BAHASA INDONESIA SMP (3 KOMPETENSI BSKAP) ===\n");

  const aiConfig = await getStoredAiConfig();
  console.log(`Model aktif: ${aiConfig.modelName}`);

  const startTime = Date.now();
  console.log("Memulai pembuatan paket uji via generateBatchQuestions...");

  // Generate batch paket uji 15 butir untuk verifikasi cepat & akurat
  const genResult = await generateBatchQuestions({
    jenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    totalSoal: 15,
    triggeredBy: "manual_admin",
  });

  console.log(`Generate selesai dalam ${Math.round((Date.now() - startTime) / 1000)}s.`);
  console.log(`Status Result: ${genResult.status} | Lolos: ${genResult.totalLolos}/${genResult.totalDiminta}`);
  console.log(`Kode Paket: ${genResult.packageCode} | ID: ${genResult.packageId}\n`);

  if (!genResult.packageId) {
    console.error("Gagal mendapatkan packageId dari generator!");
    process.exit(1);
  }

  // Tandai paket sebagai draft uji agar tidak tercampur produksi
  await db
    .update(questionPackages)
    .set({
      status: "draft",
      nama: `[UJI EVALUASI DRAFT] ${genResult.packageCode} - 3 Kompetensi BSKAP`,
    })
    .where(eq(questionPackages.id, genResult.packageId));

  // Ambil semua soal dari paket uji yang baru dibuat
  const createdQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.paketId, genResult.packageId))
    .orderBy(questions.nomorUrut);

  console.log(`=== ANALISIS SOAL PAKET BARU (${createdQuestions.length} butir) ===\n`);

  const officialBskapLabels = [
    "Pemahaman Tekstual",
    "Pemahaman Inferensial",
    "Evaluasi dan Apresiasi",
  ];

  let officialCount = 0;
  let pisaLeakCount = 0;
  const competencyDist: Record<string, number> = {};
  const levelKognitifDist: Record<string, number> = {};

  createdQuestions.forEach((q: any, idx: number) => {
    const komp = q.kompetensi || "";
    const lk = q.levelKognitif || "";

    // Cek apakah memuat salah satu dari 3 label resmi
    const matchedBskap = officialBskapLabels.find((l) => komp.includes(l));
    if (matchedBskap) {
      officialCount++;
      competencyDist[matchedBskap] = (competencyDist[matchedBskap] || 0) + 1;
    } else {
      console.warn(`[PERINGATAN] Soal #${q.nomorUrut} (${q.code}) tidak memuat 3 label resmi: "${komp}"`);
    }

    levelKognitifDist[lk] = (levelKognitifDist[lk] || 0) + 1;

    // Cek kebocoran label PISA
    if (
      /mengakses dan menemukan/i.test(komp) ||
      /menginterpretasi dan mengintegrasi/i.test(komp) ||
      /mengevaluasi dan merefleksi/i.test(komp) ||
      /mengakses/i.test(lk) ||
      /menginterpretasi/i.test(lk) ||
      /merefleksi/i.test(lk)
    ) {
      pisaLeakCount++;
      console.error(`[LEAK PISA] Soal #${q.nomorUrut} (${q.code}): kompetensi="${komp}", levelKognitif="${lk}"`);
    }

    console.log(
      `Slot #${q.nomorUrut.toString().padStart(2, "0")} [${q.bentukSoal.padEnd(12)}] Level: ${lk.padEnd(24)} | Kompetensi: ${komp}`
    );
  });

  console.log("\n=== KESIMPULAN KEPATUHAN TAKSONOMI ===");
  console.log(`Total butir soal baru    : ${createdQuestions.length}`);
  console.log(`Sesuai 3 label BSKAP resmi: ${officialCount} (${Math.round((officialCount / createdQuestions.length) * 100)}%)`);
  console.log(`Kebocoran label PISA     : ${pisaLeakCount} (Target: 0)`);

  console.log("\nDistribusi Kompetensi Resmi:");
  console.table(competencyDist);

  console.log("\nDistribusi Level Kognitif:");
  console.table(levelKognitifDist);

  if (pisaLeakCount === 0 && officialCount === createdQuestions.length) {
    console.log("\n✓ 100% SOAL BARU PATUH PADA 3 KOMPETENSI RESMI PERKABAN BSKAP NO. 47/2025!");
  } else {
    console.error("\n❌ Masih ada ketidaksesuaian label kompetensi.");
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("Error menjalankan uji generate:", err);
  process.exit(1);
});
