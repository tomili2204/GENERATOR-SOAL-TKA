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
import { questionPackages, questions, stimulus, auditLogs } from "../src/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { analyzeStimulusText } from "./measure-stimulus-bin";

async function inspectSmpBin() {
  console.log("=== INSPEKSI LENGKAP PAKET BAHASA INDONESIA SMP/MTS ===\n");

  // Ambil paket Bahasa Indonesia SMP terbaru
  const smpBinPkgs = await db
    .select()
    .from(questionPackages)
    .where(
      and(
        eq(questionPackages.jenjang, "SMP/MTs" as any),
        eq(questionPackages.mapel, "Bahasa Indonesia")
      )
    )
    .orderBy(desc(questionPackages.createdAt))
    .limit(10);

  console.log(`Ditemukan ${smpBinPkgs.length} paket Bahasa Indonesia SMP/MTs terbaru:`);
  for (const pkg of smpBinPkgs) {
    const wib = new Date(pkg.createdAt!.getTime() + 7 * 3600000).toISOString().replace("Z", "+07:00");
    console.log(`- [${pkg.code}] "${pkg.nama}" | Status: ${pkg.status} | Jumlah Soal: ${pkg.jumlahSoal} | Dibuat: ${pkg.createdAt?.toISOString()} (WIB: ${wib}) | Tipe: ${pkg.tipeSumber}`);
  }

  // Periksa 3 paket SMP BIN teratas secara detail
  for (const pkg of smpBinPkgs.slice(0, 3)) {
    console.log(`\n==================================================================`);
    console.log(`DETAIL PAKET: [${pkg.code}] ${pkg.nama}`);
    console.log(`ID: ${pkg.id} | Status: ${pkg.status} | Tipe: ${pkg.tipeSumber}`);
    console.log(`==================================================================`);

    const qList = await db
      .select()
      .from(questions)
      .where(eq(questions.paketId, pkg.id));

    console.log(`Total Soal: ${qList.length} butir`);

    const bentukCounts: Record<string, number> = {};
    const kompCounts: Record<string, number> = {};
    const stimIds = new Set<string>();

    for (const q of qList) {
      bentukCounts[q.bentukSoal] = (bentukCounts[q.bentukSoal] || 0) + 1;
      const komp = q.kompetensi || "tanpa_kompetensi";
      kompCounts[komp] = (kompCounts[komp] || 0) + 1;
      if (q.stimulusId) stimIds.add(q.stimulusId);
    }

    console.log(`Distribusi Bentuk Soal:`, bentukCounts);
    console.log(`Kompetensi (${Object.keys(kompCounts).length} varian):`);
    for (const [k, v] of Object.entries(kompCounts)) {
      console.log(`  - ${k}: ${v} butir`);
    }

    if (stimIds.size > 0) {
      console.log(`Stimulus Terkait (${stimIds.size} stimulus):`);
      const stimList = await db
        .select()
        .from(stimulus)
        .where(inArray(stimulus.id, Array.from(stimIds)));

      for (const st of stimList) {
        const m = analyzeStimulusText(st.konten);
        console.log(`  * [${st.id}] "${st.judul}"`);
        console.log(`    Kata: ${m.wordCount} | Paragraf: ${m.paragraphCount} | KPK Mean: ${m.meanWps.toFixed(1)} (std: ${m.stdWps.toFixed(1)}) | Def: ${m.definitionCount}`);
      }
    }
  }
}

inspectSmpBin().catch((err) => {
  console.error("Gagal:", err);
  process.exit(1);
});
