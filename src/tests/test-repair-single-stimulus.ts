import { db } from "../db";
import { stimulus, questions } from "../db/schema";
import { eq } from "drizzle-orm";
import { getStoredAiConfig, callGeminiResilient } from "../lib/generator/gemini-generator";
import { validateLanguageTextComplexity, JENJANG_TEXT_CRITERIA } from "../lib/generator/text-complexity";

async function repairSingle() {
  const targetId = "stm-1789666902624-ywon";
  const recs = await db.select().from(stimulus).where(eq(stimulus.id, targetId));
  if (recs.length === 0) {
    console.log("Stimulus tidak ditemukan:", targetId);
    process.exit(1);
  }

  const stim = recs[0];
  console.log("Original Jenjang:", stim.jenjang);
  console.log("Original Content:\n", stim.konten);

  const initialCheck = validateLanguageTextComplexity({
    rawJenjang: stim.jenjang,
    mapel: stim.mapel,
    text: stim.konten || "",
  });
  console.log("Initial Check:", {
    wordCount: initialCheck.wordCount,
    avgWps: initialCheck.avgWordsPerSentence,
    valid: initialCheck.valid,
    reasons: initialCheck.reasons,
  });

  const cfg = await getStoredAiConfig();
  const criteria = JENJANG_TEXT_CRITERIA[stim.jenjang] || JENJANG_TEXT_CRITERIA["SMP/MTs"];

  const repairPrompt = `Anda adalah ahli bahasa dan pengembang teks asesmen membaca resmi Kemendikdasmen (Perkaban BSKAP No. 47/2025).
Tugas Anda: Merevisi dan menyempurnakan teks wacana berikut agar MEMENUHI ATURAN KERAS BSKAP untuk jenjang ${stim.jenjang}:

ATURAN WAJIB DIPATUHI:
1. Panjang teks WAJIB berada di rentang ${criteria.minWords} - ${criteria.maxWords} kata (target: ${Math.round((criteria.minWords + criteria.maxWords) / 2)} kata).
2. Rata-rata kata per kalimat WAJIB di rentang ${criteria.minWordsPerSentence} - ${criteria.maxWordsPerSentence} kata/kalimat.
3. Struktur kalimat untuk ${stim.jenjang}:
${stim.jenjang.includes("SD") ? "- HANYA kalimat tunggal pola dasar SPOK (3-7 kata/kalimat). DILARANG kalimat majemuk." : "- Kalimat tunggal dan kalimat majemuk SETARA (dihubungkan 'dan', 'tetapi', 'atau'). DILARANG kalimat majemuk bertingkat/kompleks dengan anak kalimat."}
4. Istilah teknis maksimal 2-3 istilah. Setiap istilah teknis wajib diberi kalimat penjelasan definisi terpisah saat pertama kali muncul (misal: "Bea masuk adalah pajak barang impor.").
5. PERTAHANKAN seluruh entitas, alur cerita, fakta, dan informasi asli agar butir-butir soal yang terkait tetap valid 100%!
6. Kembalikan HANYA teks wacana hasil revisi secara langsung, tanpa pembuka/penutup dan tanpa markdown code fence.

TEKS ASLI:
${stim.konten}`;

  const aiRes = await callGeminiResilient({
    apiKey: cfg.apiKey,
    preferredModel: cfg.modelName,
    systemInstruction: "Anda adalah penyunting wacana TKA Bahasa Indonesia berstandar Perkaban BSKAP No. 47/2025. Kembalikan teks wacana murni sesuai aturan panjang dan kalimat.",
    userPrompt: repairPrompt,
    temperature: 0.3,
  });

  const revisedText = aiRes.rawText.trim();
  console.log("\n================ REVISED CONTENT ================\n", revisedText);

  const finalCheck = validateLanguageTextComplexity({
    rawJenjang: stim.jenjang,
    mapel: stim.mapel,
    text: revisedText,
  });

  console.log("\nFinal Check:", {
    wordCount: finalCheck.wordCount,
    avgWps: finalCheck.avgWordsPerSentence,
    valid: finalCheck.valid,
    reasons: finalCheck.reasons,
    warnings: finalCheck.warnings,
  });

  if (finalCheck.valid) {
    await db.update(stimulus).set({
      konten: revisedText,
      jumlahKata: finalCheck.wordCount,
      updatedAt: new Date(),
    }).where(eq(stimulus.id, targetId));
    console.log("BERHASIL DISIMPAN KE DATABASE!");
  } else {
    console.log("BELUM MEMENUHI SYARAT, PERLU ITERASI.");
  }

  process.exit(0);
}

repairSingle().catch((e) => {
  console.error(e);
  process.exit(1);
});
