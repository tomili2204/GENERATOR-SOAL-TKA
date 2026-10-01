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
import { questions, stimulus, questionPackages } from "../src/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import {
  analyzeStimulusText,
  aggregateMetrics,
  TextMetrics,
  TARGET_CONJUNCTIONS,
} from "./measure-stimulus-bin";

async function main() {
  console.log("=== ANALISIS & PENGUKURAN 12 STIMULUS SD/MI DARI PAKET EVALUASI TERBARU ===\n");

  // Ambil 12 stimulus SD yang baru dibuat untuk evaluasi
  const targetStimulusIds = [
    "stm-eval-sd-1790863936125-pqrl",
    "stm-eval-sd-1790863948062-g16p",
    "stm-eval-sd-1790863958929-c0ho",
    "stm-eval-sd-1790864002613-9kgm",
    "stm-eval-sd-1790864018499-97di",
    "stm-eval-sd-1790864037204-swed",
    "stm-eval-sd-1790864076673-jzis",
    "stm-eval-sd-1790864089110-e9cs",
    "stm-eval-sd-1790864101162-udq6",
    "stm-eval-sd-1790864155484-qvyh",
    "stm-eval-sd-1790864170207-9qro",
    "stm-eval-sd-1790864189335-25on",
  ];

  const stimuliRows = await db
    .select()
    .from(stimulus)
    .where(inArray(stimulus.id, targetStimulusIds));

  console.log(`Ditemukan ${stimuliRows.length} stimulus di database.\n`);

  const results: Array<{
    id: string;
    judul: string;
    konten: string;
    metrics: TextMetrics;
  }> = [];

  for (const s of stimuliRows) {
    const metrics = analyzeStimulusText(s.konten);
    results.push({
      id: s.id,
      judul: s.judul || "",
      konten: s.konten,
      metrics,
    });

    console.log(
      `✓ [${s.id}] Kata: ${metrics.wordCount} | Para: ${metrics.paragraphCount} | KPK Mean: ${metrics.meanWps.toFixed(
        2
      )} | KPK Std: ${metrics.stdWps.toFixed(2)} | Rentang: ${metrics.minWps}-${metrics.maxWps} | Def: ${metrics.definitionCount}`
    );
  }

  const agg = aggregateMetrics(results.map((r) => r.metrics));

  console.log("\n==================================================================");
  console.log(`PENGUKURAN AGREGAT 12 STIMULUS SD/MI HASIL GENERATOR BARU`);
  console.log("==================================================================");
  console.log(`Jumlah Stimulus          : ${agg.n}`);
  console.log(`Rata-rata Kata Total     : ${agg.wordsAvg.toFixed(1)} kata (rentang: ${agg.wordsMin} - ${agg.wordsMax})`);
  console.log(`Rata-rata Paragraf       : ${agg.paragraphsAvg.toFixed(2)} paragraf`);
  console.log(`Rata-rata KPK (Mean)     : ${agg.wpsMean.toFixed(2)} kata/kalimat`);
  console.log(`Simpangan Baku (StdDev)  : ${agg.wpsStdAvg.toFixed(2)}`);
  console.log(`Rentang Kata per Kalimat : ${agg.minWpsMin} - ${agg.maxWpsMax} kata`);
  console.log(`% Kalimat > 12 kata      : ${agg.pctGt12Avg.toFixed(1)}%`);
  console.log(`Total Kalimat Definisi   : ${agg.totalDefinitions} (rata-rata ${agg.definitionsAvg.toFixed(2)} / stimulus)`);
  console.log(`TTR (Kekayaan Kosakata)  : ${(agg.ttrAvg * 100).toFixed(1)}%`);
  console.log("\nFrekuensi Konjungsi:");
  for (const c of TARGET_CONJUNCTIONS) {
    const total = agg.totalConjunctions[c] || 0;
    if (total > 0) {
      console.log(`  - "${c}": ${total} kali (${(total / agg.n).toFixed(2)} / stimulus)`);
    }
  }

  // Tulis hasil ke scratch/sd-wacana-eval-results.json
  const exportData = {
    evaluatedAt: new Date().toISOString(),
    totalStimuli: results.length,
    aggregate: agg,
    stimuli: results.map((r) => ({
      id: r.id,
      judul: r.judul,
      wordCount: r.metrics.wordCount,
      paragraphCount: r.metrics.paragraphCount,
      meanWps: r.metrics.meanWps,
      stdWps: r.metrics.stdWps,
      minWps: r.metrics.minWps,
      maxWps: r.metrics.maxWps,
      pctGt12: r.metrics.pctGt12,
      definitionCount: r.metrics.definitionCount,
      definitions: r.metrics.definitions,
      conjunctions: r.metrics.conjCounts,
      konten: r.konten,
    })),
  };

  fs.writeFileSync(
    "scratch/sd-wacana-eval-results.json",
    JSON.stringify(exportData, null, 2),
    "utf-8"
  );
  console.log("\n✅ Berhasil menyimpan ringkasan evaluasi ke scratch/sd-wacana-eval-results.json");
}

main().catch((err) => {
  console.error("Gagal:", err);
  process.exit(1);
});
