import { db } from "../db";
import { stimulus } from "../db/schema";
import { eq } from "drizzle-orm";
import { getStoredAiConfig, callGeminiResilient } from "../lib/generator/gemini-generator";
import { validateLanguageTextComplexity, JENJANG_TEXT_CRITERIA, countWords } from "../lib/generator/text-complexity";

function cleanOutput(raw: string): string {
  let text = raw.trim();
  // Jika model membungkus dalam array JSON ["..."]
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        text = parsed.join("\n\n");
      }
    } catch {
      text = text.replace(/^\[\s*"/, "").replace(/"\s*\]$/, "");
    }
  }
  // Jika dibungkus tanda kutip
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.substring(1, text.length - 1);
  }
  return text.trim();
}

async function repairAll() {
  console.log("=== MEMULAI PERBAIKAN OTOMATIS WACANA BAHASA INDONESIA (BSKAP) ===");
  const stims = await db.select().from(stimulus).where(eq(stimulus.mapel, "Bahasa Indonesia"));
  console.log(`Total Stimulus Bahasa Indonesia: ${stims.length}`);

  const toRepair = [];
  for (const s of stims) {
    const val = validateLanguageTextComplexity({
      rawJenjang: s.jenjang,
      mapel: s.mapel,
      text: s.konten || "",
      sourceLabel: s.id,
    });
    if (!val.valid) {
      toRepair.push({ s, val });
    }
  }

  console.log(`Stimulus yang perlu diperbaiki: ${toRepair.length} butir.\n`);
  const cfg = await getStoredAiConfig();

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < toRepair.length; i++) {
    const { s, val: initialVal } = toRepair[i];
    const jenjang = s.jenjang;
    const criteria = JENJANG_TEXT_CRITERIA[jenjang] || JENJANG_TEXT_CRITERIA["SMP/MTs"];
    const targetWords = Math.round((criteria.minWords + criteria.maxWords) / 2);

    console.log(`[${i + 1}/${toRepair.length}] Memperbaiki ${s.id} (${jenjang})...`);
    console.log(`  Semula: ${initialVal.wordCount} kata, ${initialVal.avgWordsPerSentence} kata/kalimat.`);

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

    let revised = "";
    let finalCheck = null;

    // Up to 2 attempts
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await callGeminiResilient({
          apiKey: cfg.apiKey,
          preferredModel: cfg.modelName,
          systemInstruction: `Anda adalah penyunting wacana TKA Bahasa Indonesia berstandar Perkaban BSKAP No. 47/2025. Hasilkan teks wacana murni sesuai batas jenjang ${jenjang} (${criteria.minWords}-${criteria.maxWords} kata, ${criteria.minWordsPerSentence}-${criteria.maxWordsPerSentence} kata/kalimat).`,
          userPrompt: attempt === 1 ? prompt : `${prompt}\n\nPERHATIAN PERCOBAAN 2: Teks sebelumnya masih melanggar: ${finalCheck?.reasons.join("; ")}. Mohon hitung dengan teliti agar panjangnya tepat ${targetWords} kata!`,
          temperature: 0.2,
        });

        revised = cleanOutput(res.rawText);
        finalCheck = validateLanguageTextComplexity({
          rawJenjang: jenjang,
          mapel: s.mapel,
          text: revised,
        });

        if (finalCheck.valid) break;
      } catch (err: any) {
        console.error(`  Error saat memanggil AI: ${err.message}`);
      }
    }

    if (finalCheck && finalCheck.valid) {
      await db
        .update(stimulus)
        .set({
          konten: revised,
          jumlahKata: finalCheck.wordCount,
          updatedAt: new Date(),
        })
        .where(eq(stimulus.id, s.id));

      console.log(`  -> SUKSES: ${finalCheck.wordCount} kata, ${finalCheck.avgWordsPerSentence} kata/kalimat. Disimpan!`);
      successCount++;
    } else {
      console.log(`  -> GAGAL MEMENUHI SYARAT: ${finalCheck?.wordCount || 0} kata. Alasan:`, finalCheck?.reasons);
      failedCount++;
    }
  }

  console.log("\n=======================================================");
  console.log(`PERBAIKAN SELESAI: ${successCount} Berhasil Diselaraskan, ${failedCount} Gagal.`);
  console.log("=======================================================");
  process.exit(0);
}

repairAll().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
