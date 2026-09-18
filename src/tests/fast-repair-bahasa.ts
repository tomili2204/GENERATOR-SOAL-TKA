import { db } from "../db";
import { stimulus } from "../db/schema";
import { eq, inArray } from "drizzle-orm";
import { getStoredAiConfig, callGeminiResilient } from "../lib/generator/gemini-generator";
import { validateLanguageTextComplexity, JENJANG_TEXT_CRITERIA } from "../lib/generator/text-complexity";

function cleanTextOutput(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) text = parsed.join("\n\n");
    } catch {
      text = text.replace(/^\[\s*"/, "").replace(/"\s*\]$/, "");
    }
  }
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.substring(1, text.length - 1);
  }
  return text.trim();
}

async function main() {
  console.log("=== PENYELARASAN CEPAT WACANA BAHASA INDONESIA (BSKAP) ===");
  const stims = await db.select().from(stimulus).where(eq(stimulus.mapel, "Bahasa Indonesia"));
  const toFix = [];

  for (const s of stims) {
    const val = validateLanguageTextComplexity({
      rawJenjang: s.jenjang,
      mapel: s.mapel,
      text: s.konten || "",
    });
    if (!val.valid) {
      toFix.push({ s, val });
    }
  }

  console.log(`Ditemukan ${toFix.length} stimulus yang perlu diselaraskan.`);
  if (toFix.length === 0) {
    console.log("Semua stimulus sudah 100% memenuhi ketentuan BSKAP!");
    process.exit(0);
  }

  const cfg = await getStoredAiConfig();
  let doneCount = 0;
  let successCount = 0;
  let failCount = 0;

  // Process dengan worker pool concurrency = 3
  const CONCURRENCY = 3;
  let currentIndex = 0;

  async function worker(workerId: number) {
    while (currentIndex < toFix.length) {
      const index = currentIndex++;
      const { s, val: initialVal } = toFix[index];
      const jenjang = s.jenjang;
      const criteria = JENJANG_TEXT_CRITERIA[jenjang] || JENJANG_TEXT_CRITERIA["SMP/MTs"];
      const targetWords = Math.round((criteria.minWords + criteria.maxWords) / 2);

      const isSD = jenjang.includes("SD");
      const isSMP = jenjang.includes("SMP");

      const prompt = `Anda adalah ahli bahasa dan pengembang teks asesmen membaca resmi Kemendikdasmen (Perkaban BSKAP No. 47/2025 dan No. 45/2025).
Tugas Anda: Merevisi dan menyempurnakan teks wacana berikut agar MEMENUHI ATURAN KERAS BSKAP untuk jenjang ${jenjang}:

ATURAN WAJIB DIPATUHI:
1. Panjang teks WAJIB berada di rentang ${criteria.minWords} - ${criteria.maxWords} kata (target: ${targetWords} kata). DILARANG KURANG DARI ${criteria.minWords} KATA DAN DILARANG LEBIH DARI ${criteria.maxWords} KATA!
2. Rata-rata kata per kalimat WAJIB di rentang ${criteria.minWordsPerSentence} - ${criteria.maxWordsPerSentence} kata/kalimat.
3. Struktur kalimat:
${isSD ? "- HANYA kalimat tunggal pola dasar SPOK (3-7 kata/kalimat). DILARANG KERAS menggunakan kalimat majemuk." : isSMP ? "- Kalimat tunggal berbagai pola DAN kalimat majemuk SETARA (dihubungkan 'dan', 'tetapi', 'atau'). DILARANG KERAS menggunakan kalimat majemuk bertingkat/kompleks dengan anak kalimat." : "- Kalimat kompleks dan inversi diperbolehkan (8-12 kata/kalimat)."}
4. Istilah teknis: maksimal 2-3 istilah teknis. Setiap istilah teknis yang digunakan WAJIB diberi penjelasan singkat dalam satu kalimat terpisah saat pertama kali muncul (contoh pola: "UMKM juga harus memahami bea masuk. Bea masuk adalah pajak barang impor.").
5. PERTAHANKAN seluruh nama tokoh, tempat, objek, fakta, alur cerita, dan konteks asli agar butir-butir soal yang terkait tetap valid dan selaras 100%!
6. Kembalikan HANYA teks wacana hasil revisi secara langsung, tanpa pembuka/penutup dan tanpa tanda kutip pembungkus/code fence.

TEKS ASLI:
${s.konten}`;

      let finalCheck = null;
      let revised = "";

      for (let att = 1; att <= 2; att++) {
        try {
          const aiRes = await callGeminiResilient({
            apiKey: cfg.apiKey,
            preferredModel: cfg.modelName,
            systemInstruction: `Anda adalah penyunting wacana TKA Bahasa Indonesia berstandar Perkaban BSKAP No. 47/2025. Hasilkan teks wacana murni sesuai batas jenjang ${jenjang} (${criteria.minWords}-${criteria.maxWords} kata, ${criteria.minWordsPerSentence}-${criteria.maxWordsPerSentence} kata/kalimat).`,
            userPrompt: prompt,
            temperature: 0.2,
          });

          revised = cleanTextOutput(aiRes.rawText);
          finalCheck = validateLanguageTextComplexity({
            rawJenjang: jenjang,
            mapel: s.mapel,
            text: revised,
          });

          if (finalCheck.valid) break;
        } catch (err: any) {
          // Retry next attempt
        }
      }

      doneCount++;
      if (finalCheck && finalCheck.valid) {
        await db
          .update(stimulus)
          .set({
            konten: revised,
            jumlahKata: finalCheck.wordCount,
            updatedAt: new Date(),
          })
          .where(eq(stimulus.id, s.id));

        successCount++;
        console.log(`[${doneCount}/${toFix.length}] OK ${s.id} (${jenjang}) -> ${finalCheck.wordCount} kata, avgWps ${finalCheck.avgWordsPerSentence}`);
      } else {
        failCount++;
        console.log(`[${doneCount}/${toFix.length}] FAIL ${s.id} (${jenjang}) -> kata: ${finalCheck?.wordCount || 0}`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  console.log("\n================================================");
  console.log(`HASIL: ${successCount} Berhasil Diselaraskan, ${failCount} Gagal.`);
  console.log("================================================");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
