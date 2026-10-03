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
import { eq, inArray } from "drizzle-orm";
import { analyzeStimulusText } from "./measure-stimulus-bin";

async function inspectPackages() {
  console.log("=== INSPEKSI DETAIL PAKET GENERASI PAGI INI ===\n");

  const targetCodes = ["A25-SD-BIN", "A27-SD-MAT", "A33-SMP-MAT"];
  const pkgs = await db
    .select()
    .from(questionPackages)
    .where(inArray(questionPackages.code, targetCodes));

  for (const pkg of pkgs) {
    console.log(`\n==================================================================`);
    console.log(`PAKET: [${pkg.code}] ${pkg.nama}`);
    console.log(`Jenjang: ${pkg.jenjang} | Mapel: ${pkg.mapel} | Status: ${pkg.status}`);
    console.log(`Waktu Generate: ${pkg.createdAt?.toISOString()} (WIB: ${new Date(pkg.createdAt!.getTime() + 7*3600000).toISOString().replace("Z", "+07:00")})`);
    console.log(`==================================================================`);

    const qList = await db
      .select()
      .from(questions)
      .where(eq(questions.paketId, pkg.id));

    console.log(`Total Soal: ${qList.length} butir`);

    // Cek bentuk soal
    const bentukCounts: Record<string, number> = {};
    const kompCounts: Record<string, number> = {};
    const levelCounts: Record<string, number> = {};
    const stimIds = new Set<string>();

    for (const q of qList) {
      bentukCounts[q.bentukSoal] = (bentukCounts[q.bentukSoal] || 0) + 1;
      const komp = q.kompetensi || "tanpa_kompetensi";
      kompCounts[komp] = (kompCounts[komp] || 0) + 1;
      levelCounts[q.levelKognitif] = (levelCounts[q.levelKognitif] || 0) + 1;
      if (q.stimulusId) stimIds.add(q.stimulusId);
    }

    console.log(`Distribusi Bentuk Soal:`, bentukCounts);
    console.log(`Distribusi Level Kognitif:`, levelCounts);
    console.log(`Kompetensi (${Object.keys(kompCounts).length} varian):`);
    for (const [k, v] of Object.entries(kompCounts)) {
      console.log(`  - ${k}: ${v} butir`);
    }

    // Periksa stimulus jika ada
    if (stimIds.size > 0) {
      console.log(`\nStimulus Terkait (${stimIds.size} stimulus):`);
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

inspectPackages().catch((err) => {
  console.error("Gagal:", err);
  process.exit(1);
});
