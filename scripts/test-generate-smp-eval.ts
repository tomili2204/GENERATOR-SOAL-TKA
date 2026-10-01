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
  checkInferensialKeyOverlap,
} from "../src/lib/generator/text-complexity";
import {
  analyzeStimulusText,
  aggregateMetrics,
  TextMetrics,
} from "./measure-stimulus-bin";
import { eq } from "drizzle-orm";

interface GenBatchPlan {
  themeName: string;
  genreDescription: string;
  count: number;
}

async function runEvaluation() {
  console.log("=== LANGKAH 6: UJI DAN PENGUKURAN STIMULUS SMP BARU DI PAKET DRAFT ===\n");

  const aiConfig = await getStoredAiConfig();
  if (!aiConfig.apiKey) {
    console.error("❌ Gemini API Key tidak terdeteksi di database / environment!");
    process.exit(1);
  }

  const model = aiConfig.modelName || "gemini-3.8-flash";
  console.log(`Model aktif: ${model}`);
  console.log("Menyiapkan paket uji draft khusus evaluasi...");

  const draftPackageId = `pkg-draft-smp-eval-${Date.now()}`;
  const draftPackageCode = `DRAFT-EVAL-SMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  await db.insert(questionPackages).values({
    id: draftPackageId,
    code: draftPackageCode,
    nama: "Paket Uji Evaluasi Revisi Wacana SMP (Draft Dev)",
    jenjang: "SMP/MTs" as any,
    mapel: "Bahasa Indonesia",
    tipeSumber: "draft_test",
    status: "draft",
    jumlahSoal: 0,
    authorId: "usr-admin-001",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Paket draft dibuat: [${draftPackageCode}] ${draftPackageId}\n`);

  const systemInstruction = buildSystemPrompt("SMP/MTs", "Bahasa Indonesia");

  const plans: GenBatchPlan[] = [
    {
      themeName: "Lingkungan Hidup & Sains Populer",
      genreDescription: "Teks Informasi (artikel sains populer, observasi lingkungan, keanekaragaman hayati, teknologi hijau)",
      count: 3,
    },
    {
      themeName: "Karya Fiksi & Narasi Remaja",
      genreDescription: "Teks Fiksi (cerpen dengan karakter bulat, ada konflik interpersonal/batin dengan penyelesaian tertutup, alur campuran wajar, dialog alami)",
      count: 3,
    },
    {
      themeName: "Teks Ganda Antarteks (Komparasi Sudut Pandang)",
      genreDescription: "Teks Ganda berkaitan format '**Teks 1: Judul**\\n...\\n\\n**Teks 2: Judul**\\n...' (mis. dua sudut pandang tentang perpustakaan digital, dua ulasan inovasi ramah lingkungan)",
      count: 3,
    },
    {
      themeName: "Sosial Budaya, Tradisi & Inspirasi",
      genreDescription: "Teks Informasi Humaniora & Ulasan Budaya (revitalisasi kearifan lokal, tradisi nusantara, profil tokoh inspiratif)",
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

  let totalStimuliTarget = 12;
  let stimuliGeneratedCount = 0;
  let wacanaRepairAttempts = 0;
  let wacanaRepairSuccess = 0;
  let wacanaRepairFailed = 0;
  const inferensialWarnings: Array<{ qNo: number; stimId: string; reason: string }> = [];
  let globalQIndex = 0;

  for (let bIdx = 0; bIdx < plans.length; bIdx++) {
    const plan = plans[bIdx];
    console.log(`\n--- Memproses Batch ${bIdx + 1}/${plans.length}: ${plan.themeName} (${plan.count} stimulus) ---`);

    const userPrompt = `Hasilkan ${plan.count} stimulus wacana bacaan Bahasa Indonesia untuk jenjang SMP/MTs dengan tema "${plan.themeName}" (${plan.genreDescription}).
Setiap stimulus WAJIB memiliki 2 butir soal bertipe grup yang menguji:
1. Soal 1: Kompetensi "Pemahaman Inferensial" (menyimpulkan sebab-akibat tersirat, watak tokoh dari tindakan, atau pesan tersirat. Kunci dilarang menyalin kata-kata stimulus!).
2. Soal 2: Kompetensi "Evaluasi dan Apresiasi" (menilai gagasan, kesesuaian tindakan tokoh, atau efektivitas pesan penulis).

PENTING ATURAN SMP:
- Setiap stimulus wajib ${formatWacanaCriteriaText("SMP/MTs")} (200-250 kata).
- Variasikan panjang kalimat secara alami: kalimat sedang diselingi kalimat pendek untuk penekanan dan sesekali lebih panjang.
- Bagi teks menjadi beberapa paragraf logis (minimal 2-4 paragraf dipisah \\n\\n).
- Gunakan penggantian acuan (sinonim, kata ganti, sebutan lain) agar kata tidak berulang kaku di awal setiap kalimat.
- Jangan menyisipkan kalimat definisi ("X adalah ...") untuk kata yang lazim.
- Jika ada istilah khusus, cantumkan di akhir stimulus sebagai:
Daftar Istilah:
istilah: makna

KEMBALIKAN HANYA ARRAY JSON VALID berisi objek stimulus dan butir soal sesuai format sistem:
[
  {"stimulus_id_sementara": "stim-${bIdx + 1}-1", "tipe": "teks", "konten": "Isi teks bacaan minimal 2 paragraf..."},
  {"jenjang": "SMP/MTs", "mapel": "Bahasa Indonesia", "elemen": "Membaca", "sub_elemen": "Pemahaman Teks", "kompetensi": "Pemahaman Inferensial", "level_kognitif": "L2", "tingkat_kesulitan": "sedang", "bentuk_soal": "PG", "jenis_soal": "grup", "stimulus_id_sementara": "stim-${bIdx + 1}-1", "tema_konteks": "${plan.themeName}", "soal_text": "...", "opsi": [{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}], "kunci_jawaban": ["B"], "pembahasan": "..."},
  {"jenjang": "SMP/MTs", "mapel": "Bahasa Indonesia", "elemen": "Membaca", "sub_elemen": "Pemahaman Teks", "kompetensi": "Evaluasi dan Apresiasi", "level_kognitif": "L3", "tingkat_kesulitan": "tinggi", "bentuk_soal": "PG", "jenis_soal": "grup", "stimulus_id_sementara": "stim-${bIdx + 1}-1", "tema_konteks": "${plan.themeName}", "soal_text": "...", "opsi": [{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}], "kunci_jawaban": ["C"], "pembahasan": "..."}
  ...
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
      const batchStimuli = parsed.filter((it) => !it.bentuk_soal && it.stimulus_id_sementara);
      const batchQuestions = parsed.filter((it) => !!it.bentuk_soal);

      console.log(`Menerima ${batchStimuli.length} stimulus dan ${batchQuestions.length} butir soal dari Gemini (${resp.usedModel}).`);

      for (const rawStim of batchStimuli) {
        let content = (rawStim.konten || "").trim();
        const stimTempId = rawStim.stimulus_id_sementara;

        // Validasi kompleksitas teks BSKAP SMP
        let val = validateLanguageTextComplexity({
          rawJenjang: "SMP/MTs",
          mapel: "Bahasa Indonesia",
          text: content,
          sourceLabel: `Stimulus Evaluasi ${stimTempId}`,
        });

        if (!val.valid) {
          console.log(`⚠️ Stimulus "${stimTempId}" gagal validasi wacana: ${val.reasons.join("; ")}`);
          wacanaRepairAttempts++;
          const repairRes = await repairStimulusWacana(
            aiConfig.apiKey,
            model,
            content,
            "SMP/MTs",
            val.reasons
          );

          if (repairRes.success) {
            const reVal = validateLanguageTextComplexity({
              rawJenjang: "SMP/MTs",
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
        const realStimId = `stm-eval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.insert(stimulus).values({
          id: realStimId,
          jenjang: "SMP/MTs" as any,
          mapel: "Bahasa Indonesia",
          tipe: "teks",
          judul: `Stimulus Evaluasi (${plan.themeName})`,
          konten: content,
          jumlahKata: val.wordCount,
          dibuatOleh: "usr-admin-001",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const stimQuestions = batchQuestions.filter((q) => q.stimulus_id_sementara === stimTempId);
        for (const q of stimQuestions) {
          globalQIndex++;
          const qId = `q-eval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const qCode = `${draftPackageCode}-${String(globalQIndex).padStart(2, "0")}`;
          await db.insert(questions).values({
            id: qId,
            code: qCode,
            nomorUrut: globalQIndex,
            jenjang: "SMP/MTs" as any,
            mapel: "Bahasa Indonesia",
            elemen: q.elemen || "Membaca",
            subElemen: q.sub_elemen || "Pemahaman Teks",
            kompetensi: q.kompetensi || "Pemahaman Inferensial",
            levelKognitif: q.level_kognitif || "L2",
            tingkatKesulitan: q.tingkat_kesulitan || "sedang",
            bentukSoal: q.bentuk_soal || "PG",
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

          // Pemeriksaan kemiripan kunci inferensial (Langkah 5)
          const normKomp = (q.kompetensi || "").toLowerCase();
          if (normKomp.includes("inferensial") || normKomp.includes("evaluasi")) {
            const answerTexts: string[] = [];
            if (q.bentuk_soal === "PG" && Array.isArray(q.opsi) && Array.isArray(q.kunci_jawaban)) {
              const opt = q.opsi.find((o: any) => o.label === q.kunci_jawaban[0]);
              if (opt?.text) answerTexts.push(opt.text);
            }
            for (const ans of answerTexts) {
              const overlap = checkInferensialKeyOverlap(ans, content, 0.8);
              if (overlap.hasOverlap) {
                inferensialWarnings.push({
                  qNo: stimQuestions.indexOf(q) + 1,
                  stimId: realStimId,
                  reason: `Kemiripan kata berurutan ${Math.round(overlap.ratio * 100)}% (>=80%) dengan stimulus: "${overlap.matchingSentence?.slice(0, 60)}..."`,
                });
              }
            }
          }
        }

        // Ukur metrik teks menggunakan skrip pengukur resmi
        const metrics = analyzeStimulusText(content);
        generatedStimuliRecords.push({
          id: realStimId,
          judul: `Stimulus (${plan.themeName})`,
          konten: content,
          genre: metrics.genre,
          metrics,
          questions: stimQuestions,
        });

        stimuliGeneratedCount++;
        console.log(`[Stimulus #${stimuliGeneratedCount}] Kata: ${metrics.wordCount}, KPK: mean ${metrics.meanWps} (std ${metrics.stdWps}), Paragraf: ${metrics.paragraphCount}, Definisi: ${metrics.definitionCount}`);
      }

      // Jeda 2 detik antar panggilan
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err: any) {
      console.error(`Error pada batch ${plan.themeName}:`, err);
    }
  }

  console.log(`\n======================================================`);
  console.log(`SELESAI GENERATE: Total ${generatedStimuliRecords.length} stimulus berhasil dibuat.`);
  console.log(`Statistik Repair: ${wacanaRepairAttempts} upaya, ${wacanaRepairSuccess} berhasil, ${wacanaRepairFailed} gagal.`);
  console.log(`Peringatan Kunci Inferensial/Evaluasi: ${inferensialWarnings.length} terdeteksi.`);

  // Agregasi metrik dari seluruh stimulus baru
  const allNewMetrics = generatedStimuliRecords.map((r) => r.metrics);
  const summaryNew = aggregateMetrics(allNewMetrics);

  console.log("\n======================================================");
  console.log("=== RINGKASAN PENGUKURAN METRIK BARU (N = " + summaryNew.n + ") ===");
  console.log("======================================================");
  console.log(`Kata rata-rata: ${summaryNew.wordsAvg} (rentang ${summaryNew.wordsMin}-${summaryNew.wordsMax})`);
  console.log(`Kalimat rata-rata: ${summaryNew.sentencesAvg}`);
  console.log(`Paragraf rata-rata: ${summaryNew.paragraphsAvg}`);
  console.log(`Kata per kalimat (KPK): mean ${summaryNew.wpsMean}, std ${summaryNew.wpsStdAvg}`);
  console.log(`Min KPK: ${summaryNew.minWpsMin}, Max KPK: ${summaryNew.maxWpsMax}`);
  console.log(`Kalimat >12 kata: ${summaryNew.pctGt12Avg}%, >20 kata: ${summaryNew.pctGt20Avg}%`);
  console.log(`Kalimat definisi (strict): ${summaryNew.definitionsAvg} per stimulus (total ${summaryNew.totalDefinitions})`);
  console.log(`TTR: ${summaryNew.ttrAvg}%`);
  console.log("Top 5 pembuka kalimat:", summaryNew.top5Openers);
  console.log("Frekuensi konjungsi:", summaryNew.totalConjunctions);
  console.log("Distribusi genre:", summaryNew.genreDist);

  // Ambil 3 contoh utuh: satu informasi, satu fiksi, satu teks ganda
  const infoSample = generatedStimuliRecords.find((r) => r.genre.includes("Informasi") && !r.metrics.isDualText);
  const fictionSample = generatedStimuliRecords.find((r) => r.genre.includes("Fiksi"));
  const dualSample = generatedStimuliRecords.find((r) => r.metrics.isDualText);

  console.log("\n======================================================");
  console.log("=== 3 CONTOH HASIL STIMULUS BARU SECARA UTUH ===");
  console.log("======================================================\n");

  if (infoSample) {
    console.log("--- 1. CONTOH TEKS INFORMASI (TUNGGAL) ---");
    console.log(`ID: ${infoSample.id} | Genre: ${infoSample.genre} | Kata: ${infoSample.metrics.wordCount} | Paragraf: ${infoSample.metrics.paragraphCount} | KPK Mean: ${infoSample.metrics.meanWps} (std: ${infoSample.metrics.stdWps})`);
    console.log("\n[KONTEN STIMULUS]:\n" + infoSample.konten);
    console.log("\n[SOAL TERKAIT]:");
    infoSample.questions.forEach((q, idx) => {
      console.log(`\nSoal #${idx + 1} (${q.kompetensi} - Level ${q.level_kognitif}):`);
      console.log(q.soal_text);
      if (q.opsi) q.opsi.forEach((o: any) => console.log(`  ${o.label}. ${o.text}`));
      console.log(`Kunci: ${q.kunci_jawaban?.join(", ")}`);
      console.log(`Pembahasan: ${q.pembahasan}`);
    });
  }

  if (fictionSample) {
    console.log("\n\n--- 2. CONTOH TEKS FIKSI (NARASI) ---");
    console.log(`ID: ${fictionSample.id} | Genre: ${fictionSample.genre} | Kata: ${fictionSample.metrics.wordCount} | Paragraf: ${fictionSample.metrics.paragraphCount} | KPK Mean: ${fictionSample.metrics.meanWps} (std: ${fictionSample.metrics.stdWps})`);
    console.log("\n[KONTEN STIMULUS]:\n" + fictionSample.konten);
    console.log("\n[SOAL TERKAIT]:");
    fictionSample.questions.forEach((q, idx) => {
      console.log(`\nSoal #${idx + 1} (${q.kompetensi} - Level ${q.level_kognitif}):`);
      console.log(q.soal_text);
      if (q.opsi) q.opsi.forEach((o: any) => console.log(`  ${o.label}. ${o.text}`));
      console.log(`Kunci: ${q.kunci_jawaban?.join(", ")}`);
      console.log(`Pembahasan: ${q.pembahasan}`);
    });
  }

  if (dualSample) {
    console.log("\n\n--- 3. CONTOH TEKS GANDA (KOMPARASI DUA SUDUT PANDANG) ---");
    console.log(`ID: ${dualSample.id} | Genre: ${dualSample.genre} | Kata: ${dualSample.metrics.wordCount} | Paragraf Subteks: [${dualSample.metrics.subTextParagraphs.join(", ")}] | KPK Mean: ${dualSample.metrics.meanWps} (std: ${dualSample.metrics.stdWps})`);
    console.log("\n[KONTEN STIMULUS]:\n" + dualSample.konten);
    console.log("\n[SOAL TERKAIT]:");
    dualSample.questions.forEach((q, idx) => {
      console.log(`\nSoal #${idx + 1} (${q.kompetensi} - Level ${q.level_kognitif}):`);
      console.log(q.soal_text);
      if (q.opsi) q.opsi.forEach((o: any) => console.log(`  ${o.label}. ${o.text}`));
      console.log(`Kunci: ${q.kunci_jawaban?.join(", ")}`);
      console.log(`Pembahasan: ${q.pembahasan}`);
    });
  }

  // Update total soal pada paket draft
  const totalQuestionsInPkg = generatedStimuliRecords.reduce((acc, r) => acc + r.questions.length, 0);
  await db.update(questionPackages)
    .set({
      jumlahSoal: totalQuestionsInPkg,
      updatedAt: new Date(),
    })
    .where(eq(questionPackages.id, draftPackageId));

  console.log(`\nPaket draft [${draftPackageCode}] selesai diperbarui dengan ${totalQuestionsInPkg} butir soal.`);
  process.exit(0);
}

runEvaluation().catch((err) => {
  console.error("Fatal evaluation error:", err);
  process.exit(1);
});
