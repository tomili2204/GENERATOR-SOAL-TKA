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
import { buildSystemPrompt } from "../src/lib/generator/prompt-builder";
import {
  getStoredAiConfig,
  callGeminiResilient,
  parseGeminiJson,
  repairStimulusWacana,
} from "../src/lib/generator/gemini-generator";
import {
  validateLanguageTextComplexity,
  formatWacanaCriteriaText,
} from "../src/lib/generator/text-complexity";
import {
  analyzeStimulusText,
  aggregateMetrics,
  TextMetrics,
  TARGET_CONJUNCTIONS,
} from "./measure-stimulus-bin";
import { eq } from "drizzle-orm";

interface GenBatchPlan {
  themeName: string;
  genreDescription: string;
  count: number;
}

async function runSdEvaluation() {
  console.log("=== UJI DAN PENGUKURAN STIMULUS BAHASA INDONESIA SD/MI BARU DI PAKET DRAFT ===\n");

  const aiConfig = await getStoredAiConfig();
  if (!aiConfig.apiKey) {
    console.error("❌ Gemini API Key tidak terdeteksi di database / environment!");
    process.exit(1);
  }

  const model = aiConfig.modelName || "gemini-2.5-flash";
  console.log(`Model aktif: ${model}`);
  console.log("Menyiapkan paket uji draft khusus evaluasi SD/MI...");

  const draftPackageId = `pkg-draft-sd-eval-${Date.now()}`;
  const draftPackageCode = `DRAFT-EVAL-SD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  await db.insert(questionPackages).values({
    id: draftPackageId,
    code: draftPackageCode,
    nama: "Paket Uji Evaluasi Revisi Wacana SD (Draft Dev)",
    jenjang: "SD/MI" as any,
    mapel: "Bahasa Indonesia",
    tipeSumber: "draft_test",
    status: "draft",
    jumlahSoal: 0,
    authorId: "usr-admin-001",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Paket draft dibuat: [${draftPackageCode}] ${draftPackageId}\n`);

  const systemInstruction = buildSystemPrompt("SD/MI", "Bahasa Indonesia");

  const plans: GenBatchPlan[] = [
    {
      themeName: "Sains Alam & Hewan Sehari-hari",
      genreDescription: "Teks Informasi (artikel sains anak tentang kebiasaan hewan unik, tumbuhan di sekitar rumah, atau fakta alam konkret)",
      count: 3,
    },
    {
      themeName: "Fabel & Dongeng Hewan Berdialog",
      genreDescription: "Teks Fiksi Fabel (cerita hewan berdialog alami dengan alur maju, perilaku tokoh mencerminkan watak, penyelesaian tertutup)",
      count: 3,
    },
    {
      themeName: "Cerita Anak Keseharian & Budi Pekerti",
      genreDescription: "Teks Fiksi Narasi Realistis (kegiatan anak di sekolah/rumah, tolong-menolong, kejujuran, sikap empati dari tindakan nyata)",
      count: 3,
    },
    {
      themeName: "Teks Ganda Antarteks (Komparasi Dua Teks)",
      genreDescription: "Teks Ganda berkaitan format '**Teks 1: Judul**\\n...\\n\\n**Teks 2: Judul**\\n...' (mis. dua cerita tentang cara merawat hewan piaraan atau dua sudut pandang kegiatan di taman sekolah)",
      count: 3,
    },
  ];

  const generatedStimuliRecords: Array<{
    id: string;
    judul: string;
    konten: string;
    genre: string;
    metrics: TextMetrics;
    questions: any[];
  }> = [];

  let wacanaRepairAttempts = 0;
  let wacanaRepairSuccess = 0;
  let wacanaRepairFailed = 0;
  let globalQIndex = 0;

  for (let bIdx = 0; bIdx < plans.length; bIdx++) {
    const plan = plans[bIdx];
    console.log(`\n--- Memproses Batch ${bIdx + 1}/${plans.length}: ${plan.themeName} (${plan.count} stimulus) ---`);

    const userPrompt = `Hasilkan ${plan.count} stimulus wacana bacaan Bahasa Indonesia untuk jenjang SD/MI dengan tema "${plan.themeName}" (${plan.genreDescription}).
Setiap stimulus WAJIB memiliki 2 butir soal bertipe grup yang menguji:
1. Soal 1: Kompetensi "Pemahaman Inferensial" (menyimpulkan amanat, watak tokoh dari tindakan, hubungan sebab-akibat tersirat, atau perbandingan informasi. Kunci dilarang keras menyalin kata-kata stimulus!).
2. Soal 2: Kompetensi "Evaluasi dan Apresiasi" (menilai relevansi peristiwa dengan keseharian, menilai kebaikan tindakan tokoh, atau respons estetik).

PENTING ATURAN TEKS SD/MI:
- Panjang teks WAJIB: ${formatWacanaCriteriaText("SD/MI")} (150-200 kata).
- Utamakan kalimat sederhana berpola dasar SPOK. Panjang kalimat bervariasi: sebagian besar kalimat pendek, diselingi kalimat sedang, dan sesekali kalimat lebih panjang dibolehkan. Hindari deretan kalimat yang panjangnya kaku atau seragam.
- Boleh sesekali memakai penghubung sederhana (dan, tetapi, karena, agar, yang).
- Bagi teks menjadi beberapa paragraf logis (minimal 2-4 paragraf dipisah \\n\\n). Teks fabel atau cerita berdialog boleh memiliki lebih banyak paragraf pendek.
- Jaga kohesi pengacuan dengan kata ganti atau sebutan tokoh yang wajar. Pakai konjungsi penambahan dan penjelasan (selain itu, oleh karena itu, kemudian, selanjutnya, namun).
- Penjelasan makna istilah boleh menyatu mengalir dalam teks bila konsep itu memang topik teks (seperti "... yaitu hewan pemakan tumbuhan", "Mereka disebut folivora"). JANGAN menyisipkan kalimat definisi terpisah ("X adalah...") untuk kata yang lazim dikenal anak SD.

KEMBALIKAN HANYA ARRAY JSON VALID berisi objek stimulus dan butir soal sesuai format sistem:
[
  {"stimulus_id_sementara": "stim-${bIdx + 1}-1", "tipe": "teks", "konten": "Isi teks bacaan minimal 2 paragraf..."},
  {"jenjang": "SD/MI", "mapel": "Bahasa Indonesia", "elemen": "Membaca", "sub_elemen": "Pemahaman Teks", "kompetensi": "Pemahaman Inferensial", "level_kognitif": "L2", "tingkat_kesulitan": "sedang", "bentuk_soal": "PG", "jenis_soal": "grup", "stimulus_id_sementara": "stim-${bIdx + 1}-1", "tema_konteks": "${plan.themeName}", "soal_text": "...", "opsi": [{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}], "kunci_jawaban": ["B"], "pembahasan": "..."},
  {"jenjang": "SD/MI", "mapel": "Bahasa Indonesia", "elemen": "Membaca", "sub_elemen": "Pemahaman Teks", "kompetensi": "Evaluasi dan Apresiasi", "level_kognitif": "L3", "tingkat_kesulitan": "tinggi", "bentuk_soal": "PG", "jenis_soal": "grup", "stimulus_id_sementara": "stim-${bIdx + 1}-1", "tema_konteks": "${plan.themeName}", "soal_text": "...", "opsi": [{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}], "kunci_jawaban": ["C"], "pembahasan": "..."}
]`;

    try {
      const resp = await callGeminiResilient({
        apiKey: aiConfig.apiKey,
        preferredModel: model,
        systemInstruction,
        userPrompt,
        temperature: 0.7,
      });

      const parsed = parseGeminiJson(resp.rawText);
      const batchStimuli = parsed.filter((it: any) => !it.bentuk_soal && it.stimulus_id_sementara);
      const batchQuestions = parsed.filter((it: any) => !!it.bentuk_soal);

      console.log(`Menerima ${batchStimuli.length} stimulus dan ${batchQuestions.length} butir soal dari Gemini (${resp.usedModel}).`);

      for (const rawStim of batchStimuli) {
        let content = (rawStim.konten || "").trim();
        const stimTempId = rawStim.stimulus_id_sementara;

        // Validasi kompleksitas teks BSKAP SD
        let val = validateLanguageTextComplexity({
          rawJenjang: "SD/MI",
          mapel: "Bahasa Indonesia",
          text: content,
          sourceLabel: `Stimulus Evaluasi ${stimTempId}`,
        });

        if (!val.valid) {
          console.log(`⚠️ Stimulus "${stimTempId}" perlu perbaikan: ${val.reasons.join("; ")}`);
          wacanaRepairAttempts++;
          const repairRes = await repairStimulusWacana(
            aiConfig.apiKey,
            model,
            content,
            "SD/MI",
            val.reasons
          );

          if (repairRes.success) {
            const reVal = validateLanguageTextComplexity({
              rawJenjang: "SD/MI",
              mapel: "Bahasa Indonesia",
              text: repairRes.repairedText,
              sourceLabel: `Stimulus Evaluasi ${stimTempId} (repaired)`,
            });
            if (reVal.valid) {
              content = repairRes.repairedText;
              val = reVal;
              wacanaRepairSuccess++;
              console.log(`✅ Stimulus "${stimTempId}" BERHASIL diperbaiki!`);
            } else {
              wacanaRepairFailed++;
              console.log(`❌ Stimulus "${stimTempId}" tetap gagal setelah perbaikan: ${reVal.reasons.join("; ")}`);
            }
          } else {
            wacanaRepairFailed++;
            console.log(`❌ Gagal memperbaiki stimulus "${stimTempId}".`);
          }
        }

        // Simpan stimulus ke database
        const realStimId = `stm-eval-sd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.insert(stimulus).values({
          id: realStimId,
          jenjang: "SD/MI" as any,
          mapel: "Bahasa Indonesia",
          tipe: "teks",
          judul: `Stimulus Evaluasi SD (${plan.themeName})`,
          konten: content,
          jumlahKata: val.wordCount,
          dibuatOleh: "usr-admin-001",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Ukur karakteristik teks dengan skrip metrik
        const metrics = analyzeStimulusText(content);
        metrics.genre = plan.themeName;

        // Kaitkan soal ke stimulus dan simpan ke database
        const matchingQuestions = batchQuestions.filter(
          (q: any) => q.stimulus_id_sementara === stimTempId
        );

        for (const q of matchingQuestions) {
          globalQIndex++;
          const qId = `q-eval-sd-${Date.now()}-${globalQIndex}`;
          const qCode = `Q-EVAL-SD-${Date.now()}-${globalQIndex}`;
          await db.insert(questions).values({
            id: qId,
            code: qCode,
            nomorUrut: globalQIndex,
            jenjang: "SD/MI" as any,
            mapel: "Bahasa Indonesia",
            elemen: q.elemen || "Membaca",
            subElemen: q.sub_elemen || "Pemahaman Teks",
            kompetensi: q.kompetensi || "Pemahaman Inferensial",
            levelKognitif: (q.level_kognitif || "L2") as any,
            tingkatKesulitan: (q.tingkat_kesulitan || "sedang") as any,
            bentukSoal: (q.bentuk_soal || "PG") as any,
            jenisSoal: "grup",
            stimulusId: realStimId,
            paketId: draftPackageId,
            sumber: "ai_generated",
            status: "draft",
            authorId: "usr-admin-001",
            payload: q,
            temaKonteks: plan.themeName,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        generatedStimuliRecords.push({
          id: realStimId,
          judul: `Stimulus Evaluasi SD (${plan.themeName})`,
          konten: content,
          genre: plan.themeName,
          metrics,
          questions: matchingQuestions,
        });

        console.log(
          `✓ [${realStimId}] ${val.wordCount} kata, ${metrics.paragraphCount} paragraf, KPK: ${metrics.meanWps.toFixed(
            2
          )} (std: ${metrics.stdWps.toFixed(2)}), def: ${metrics.definitionCount}`
        );
      }
    } catch (err) {
      console.error(`Error pada batch ${plan.themeName}:`, err);
    }
  }

  // Update total soal di paket
  await db
    .update(questionPackages)
    .set({
      jumlahSoal: globalQIndex,
      updatedAt: new Date(),
    })
    .where(eq(questionPackages.id, draftPackageId));

  console.log(`\n=== PENGUKURAN METRIK KESELURUHAN HASIL GENERASI SD BARU (N = ${generatedStimuliRecords.length}) ===\n`);

  const agg = aggregateMetrics(generatedStimuliRecords.map((r) => r.metrics));

  console.log("------------------------------------------------------------------");
  console.log(`Jumlah Stimulus Terukur : ${agg.n}`);
  console.log(`Rata-rata Kata Total    : ${agg.wordsAvg.toFixed(1)} kata (rentang: ${agg.wordsMin} - ${agg.wordsMax})`);
  console.log(`Rata-rata Paragraf      : ${agg.paragraphsAvg.toFixed(2)}`);
  console.log(`Rata-rata KPK (Mean)    : ${agg.wpsMean.toFixed(2)} kata/kalimat`);
  console.log(`Simpangan Baku (StdDev) : ${agg.wpsStdAvg.toFixed(2)} (variasi panjang kalimat)`);
  console.log(`Rentang Kata per Kalimat: ${agg.minWpsMin} - ${agg.maxWpsMax} kata`);
  console.log(`% Kalimat > 12 kata     : ${agg.pctGt12Avg.toFixed(1)}%`);
  console.log(`Total Kalimat Definisi  : ${agg.totalDefinitions} (rata-rata ${agg.definitionsAvg.toFixed(2)} per stimulus)`);
  console.log("Pemakaian Konjungsi:");
  for (const c of TARGET_CONJUNCTIONS) {
    const total = agg.totalConjunctions[c] || 0;
    if (total > 0) {
      console.log(`  - "${c}": ${total} kali (${(total / (agg.n || 1)).toFixed(2)} / stimulus)`);
    }
  }
  console.log(`TTR (Kekayaan Kosakata) : ${(agg.ttrAvg * 100).toFixed(1)}%`);
  console.log("------------------------------------------------------------------");

  console.log("\nStatistik Perbaikan Wacana:");
  console.log(`- Percobaan repair wacana: ${wacanaRepairAttempts}`);
  console.log(`- Berhasil diperbaiki    : ${wacanaRepairSuccess}`);
  console.log(`- Gagal diperbaiki       : ${wacanaRepairFailed}`);

  // Simpan hasil ke file json untuk audit dan pelaporan
  const evalResult = {
    evaluatedAt: new Date().toISOString(),
    packageId: draftPackageId,
    packageCode: draftPackageCode,
    totalStimuli: generatedStimuliRecords.length,
    totalQuestions: globalQIndex,
    aggregateMetrics: agg,
    stimuliDetails: generatedStimuliRecords.map((r) => ({
      id: r.id,
      judul: r.judul,
      genre: r.genre,
      wordCount: r.metrics.wordCount,
      paragraphCount: r.metrics.paragraphCount,
      meanWps: r.metrics.meanWps,
      stdWps: r.metrics.stdWps,
      definitionCount: r.metrics.definitionCount,
      definitions: r.metrics.definitions,
      konten: r.konten,
    })),
  };

  const fs = await import("fs");
  fs.writeFileSync(
    "scratch/sd-wacana-eval-results.json",
    JSON.stringify(evalResult, null, 2),
    "utf-8"
  );
  console.log("\nHasil evaluasi lengkap disimpan di: scratch/sd-wacana-eval-results.json");
}

runSdEvaluation().catch((err) => {
  console.error("Gagal menjalankan evaluasi SD:", err);
  process.exit(1);
});
