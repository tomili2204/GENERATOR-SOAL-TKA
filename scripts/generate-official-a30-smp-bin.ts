import fs from "fs";
import path from "path";

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
import { questionPackages, questions, stimulus } from "../src/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { generateBatchQuestions } from "../src/lib/generator/gemini-generator";
import { analyzeStimulusText } from "./measure-stimulus-bin";

async function main() {
  console.log("================================================================================");
  console.log("PROSES PEMBUATAN PAKET RESMI A30-SMP-BIN (30 BUTIR SOAL)");
  console.log("Standar BSKAP No. 47/2025 & Aturan Wacana SMP Terbaru");
  console.log("================================================================================\n");

  // 1. Bersihkan kode pada paket uji coba draft lama agar sequence A30 bebas untuk paket resmi
  console.log("Langkah 1: Memeriksa dan merapikan kode paket uji draft...");
  const oldTestPkgs = await db
    .select()
    .from(questionPackages)
    .where(eq(questionPackages.code, "A30-SMP-BIN"));

  for (const pkg of oldTestPkgs) {
    if (pkg.status === "draft" || pkg.nama.includes("UJI")) {
      const newDraftCode = `DRAFT-TEST-A30-SMP-BIN-${Date.now().toString().slice(-4)}`;
      console.log(`Mengubah kode paket draft lama [${pkg.id}] dari "${pkg.code}" menjadi "${newDraftCode}"`);
      await db
        .update(questionPackages)
        .set({ code: newDraftCode })
        .where(eq(questionPackages.id, pkg.id));

      // Update kode butir-butir soal di dalamnya
      await db.execute(sql`
        UPDATE soal.questions 
        SET code = REPLACE(code, 'A30-SMP-BIN-', ${newDraftCode} || '-')
        WHERE paket_id = ${pkg.id} AND code LIKE 'A30-SMP-BIN-%'
      `);
    }
  }

  // 2. Jalankan Generator Batch Resmi
  console.log("\nLangkah 2: Menjalankan generateBatchQuestions untuk SMP/MTs Bahasa Indonesia (30 butir)...");
  console.log("Model: Gemini 2.5 Flash / 3.8 Flash | Mode: auto_multi tema konteks");
  const startTime = Date.now();

  const result = await generateBatchQuestions({
    jenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    totalSoal: 30,
    triggeredBy: "manual_admin",
    themeMode: "auto_multi",
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nGenerator selesai dalam ${durationSec} detik!`);
  console.log("Hasil generateBatchQuestions:", {
    success: result.success,
    status: result.status,
    totalDiminta: result.totalDiminta,
    totalDiterima: result.totalDiterima,
    totalLolos: result.totalLolos,
    totalGagal: result.totalGagal,
    packageId: result.packageId,
    packageCode: result.packageCode,
  });

  if (!result.success || !result.packageId) {
    console.error("Gagal membuat paket:", result.errorMessage);
    if (result.detailPemeriksaan && result.detailPemeriksaan.length > 0) {
      console.error("Detail pemeriksaan:", result.detailPemeriksaan);
    }
    process.exit(1);
  }

  // 3. Inspeksi Mendalam Hasil Paket Baru
  console.log("\nLangkah 3: Mengambil dan memverifikasi data paket dari database...");
  const [createdPkg] = await db
    .select()
    .from(questionPackages)
    .where(eq(questionPackages.id, result.packageId));

  console.log(`\nDATA PAKET:`);
  console.log(`- ID: ${createdPkg.id}`);
  console.log(`- Kode: ${createdPkg.code}`);
  console.log(`- Nama: ${createdPkg.nama}`);
  console.log(`- Status: ${createdPkg.status}`);
  console.log(`- Jumlah Soal Tercatat: ${createdPkg.jumlahSoal}`);

  const qItems = await db
    .select()
    .from(questions)
    .where(eq(questions.paketId, createdPkg.id));

  console.log(`\nTOTAL BUTIR SOAL RIIL DI DATABASE: ${qItems.length} butir`);

  // Distribusi Bentuk Soal
  const distBentuk: Record<string, number> = {};
  const distKognitif: Record<string, number> = {};
  const distKesulitan: Record<string, number> = {};
  const distKompetensi: Record<string, number> = {};
  const stimIds = new Set<string>();

  for (const q of qItems) {
    distBentuk[q.bentukSoal] = (distBentuk[q.bentukSoal] || 0) + 1;
    distKognitif[q.levelKognitif] = (distKognitif[q.levelKognitif] || 0) + 1;
    distKesulitan[q.tingkatKesulitan] = (distKesulitan[q.tingkatKesulitan] || 0) + 1;
    
    const komp = q.kompetensi || "tanpa_kompetensi";
    distKompetensi[komp] = (distKompetensi[komp] || 0) + 1;

    if (q.stimulusId) stimIds.add(q.stimulusId);
  }

  console.log("\nDISTRIBUSI BENTUK SOAL:");
  for (const [k, v] of Object.entries(distBentuk)) {
    console.log(`  - ${k}: ${v} butir`);
  }

  console.log("\nDISTRIBUSI TINGKAT KESULITAN:");
  for (const [k, v] of Object.entries(distKesulitan)) {
    console.log(`  - ${k}: ${v} butir`);
  }

  console.log("\nDISTRIBUSI LEVEL KOGNITIF:");
  for (const [k, v] of Object.entries(distKognitif)) {
    console.log(`  - ${k}: ${v} butir`);
  }

  // Pengelompokan 3 Kompetensi BSKAP No. 47/2025
  const bskapGroups = {
    "Pemahaman Tekstual": 0,
    "Pemahaman Inferensial": 0,
    "Evaluasi dan Apresiasi": 0,
    "Lainnya / Format Lama": 0,
  };

  for (const [komp, count] of Object.entries(distKompetensi)) {
    if (komp.startsWith("Pemahaman Tekstual")) {
      bskapGroups["Pemahaman Tekstual"] += count;
    } else if (komp.startsWith("Pemahaman Inferensial")) {
      bskapGroups["Pemahaman Inferensial"] += count;
    } else if (komp.startsWith("Evaluasi dan Apresiasi")) {
      bskapGroups["Evaluasi dan Apresiasi"] += count;
    } else {
      bskapGroups["Lainnya / Format Lama"] += count;
    }
  }

  console.log("\nDISTRIBUSI 3 KOMPETENSI MEMBACA BSKAP NO. 47/2025:");
  for (const [grp, count] of Object.entries(bskapGroups)) {
    console.log(`  * ${grp}: ${count} butir`);
  }

  // Metrik Stimulus Wacana
  console.log(`\nANALISIS WACANA/STIMULUS (${stimIds.size} wacana terhubung):`);
  if (stimIds.size > 0) {
    const stimList = await db
      .select()
      .from(stimulus)
      .where(inArray(stimulus.id, Array.from(stimIds)));

    for (let i = 0; i < stimList.length; i++) {
      const st = stimList[i];
      const m = analyzeStimulusText(st.konten);
      console.log(`  Stimulus #${i + 1} [${st.id}]:`);
      console.log(`    Judul: "${st.judul}"`);
      console.log(`    Jumlah Kata: ${m.wordCount} kata (target SMP: 200-250)`);
      console.log(`    Jumlah Paragraf: ${m.paragraphCount} paragraf`);
      console.log(`    Rerata KPK: ${m.meanWps.toFixed(2)} kata/kalimat (target SMP: 7.0-10.0)`);
      console.log(`    Rentang KPK: ${m.minWps} - ${m.maxWps} kata/kalimat (std: ${m.stdWps.toFixed(2)})`);
      console.log(`    Daftar Istilah Terpisah: ${m.definitionCount > 0 ? `ADA (${m.definitionCount} entri)` : "TIDAK ADA"}`);
    }
  }

  console.log("\n================================================================================");
  console.log(`KESIMPULAN: Paket ${createdPkg.code} berhasil dibuat dengan status "${createdPkg.status}"!`);
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
