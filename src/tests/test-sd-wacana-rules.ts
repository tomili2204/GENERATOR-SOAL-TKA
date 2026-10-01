import {
  validateLanguageTextComplexity,
  JENJANG_TEXT_CRITERIA,
  formatWacanaCriteriaText,
} from "../lib/generator/text-complexity";

async function runSdUnitTests() {
  console.log("=== UNIT TEST: REVISI ATURAN TEKS SD/MI (BSKAP 47/2025 & POLA 11) ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // 1. Kriteria SD (Target 5-7 kata/kalimat, Panjang 150-200 kata)
  // -------------------------------------------------------------
  console.log("--- 1. Uji Kriteria Rentang Kata per Kalimat SD (5-7, Rentang 150-200 kata) ---");
  const sdCriteria = JENJANG_TEXT_CRITERIA["SD/MI"];
  assert(sdCriteria.minWords === 150, "SD minWords tetap 150");
  assert(sdCriteria.maxWords === 200, "SD maxWords tetap 200");
  assert(sdCriteria.minWordsPerSentence === 5, "SD target minWordsPerSentence adalah 5");
  assert(sdCriteria.maxWordsPerSentence === 7, "SD target maxWordsPerSentence adalah 7");
  assert(sdCriteria.allowComplexSentences === false, "SD mengutamakan kalimat tunggal berpola dasar");

  const criteriaText = formatWacanaCriteriaText("SD/MI");
  assert(
    criteriaText === "150-200 kata, rata-rata 5-7 kata/kalimat",
    `formatWacanaCriteriaText("SD/MI") menghasilkan: "${criteriaText}"`
  );

  // -------------------------------------------------------------
  // 2. Gerbang Validasi SD (Toleransi Bawah 2, Toleransi Atas 8)
  // -------------------------------------------------------------
  console.log("\n--- 2. Uji Gerbang Validasi SD (Rentang Toleran 2 hingga 8 kata/kalimat) ---");
  // Teks SD ideal target rata-rata 6 kata/kalimat (180 kata dalam 3 paragraf)
  const sent6 = "Kelinci putih melompat ke kebun wortel."; // 6 kata
  const para1 = Array(10).fill(sent6).join(" ");
  const para2 = Array(10).fill(sent6).join(" ");
  const para3 = Array(10).fill(sent6).join(" ");
  const textIdeal = `${para1}\n\n${para2}\n\n${para3}`;

  const resIdeal = validateLanguageTextComplexity({
    rawJenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    text: textIdeal,
  });
  assert(resIdeal.valid, `Teks SD rata-rata 6 kata/kalimat LOLOS validasi (Aktual: ${resIdeal.wordCount} kata, avg: ${resIdeal.avgWordsPerSentence})`);

  // Teks SD seperti fabel resmi "Kenthus" (rata-rata 4.9 kata/kalimat) -> LOLOS di gerbang batas bawah
  // 170 kata, 35 kalimat pendek (avg ~4.8-5.0)
  const sent4 = "Kenthus melompat dengan gembira."; // 4 kata
  const sent5 = "Kancil segera memanggil kawan dekatnya."; // 5 kata
  const textKenthusLike = `${Array(18).fill(sent4).join(" ")}\n\n${Array(18).fill(sent5).join(" ")}`;
  const resKenthus = validateLanguageTextComplexity({
    rawJenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    text: textKenthusLike,
  });
  assert(
    resKenthus.valid,
    `Teks fabel SD rata-rata ~4.5-5 kata/kalimat (seperti Kenthus 4.9) LOLOS gerbang toleransi bawah (avg: ${resKenthus.avgWordsPerSentence})`
  );

  // Teks SD dengan rata-rata 7.5-8 kata/kalimat -> LOLOS di gerbang batas atas
  const sent8 = "Anak-anak kelas empat rajin membaca buku cerita bersama."; // 8 kata
  const textGate8 = `${Array(11).fill(sent8).join(" ")}\n\n${Array(11).fill(sent8).join(" ")}`;
  const resGate8 = validateLanguageTextComplexity({
    rawJenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    text: textGate8,
  });
  assert(
    resGate8.valid,
    `Teks SD rata-rata 8 kata/kalimat LOLOS gerbang toleransi atas (avg: ${resGate8.avgWordsPerSentence})`
  );

  // Teks SD terlalu panjang rata-rata per kalimat (> 8 kata/kalimat, misal 10) -> DITOLAK
  const sent10 = "Murid-murid sekolah dasar mengamati pertumbuhan tanaman kacang hijau di kebun belakang."; // 11 kata
  const textFailHigh = `${Array(8).fill(sent10).join(" ")}\n\n${Array(8).fill(sent10).join(" ")}`;
  const resFailHigh = validateLanguageTextComplexity({
    rawJenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    text: textFailHigh,
  });
  assert(!resFailHigh.valid, `Teks SD rata-rata >8 kata/kalimat DITOLAK (avg: ${resFailHigh.avgWordsPerSentence})`);

  // Teks SD terlalu pendek rata-rata per kalimat (< 2 kata/kalimat, misal 1 kata) -> DITOLAK
  const sent1 = "Lari! Pergi! Cepat! Ayo! Maju! Belajar! Makan! Duduk! Diam! Pulang!"; // rata-rata 1 kata
  const textFailLow = `${Array(9).fill(sent1).join(" ")}\n\n${Array(9).fill(sent1).join(" ")}`;
  const resFailLow = validateLanguageTextComplexity({
    rawJenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    text: textFailLow,
  });
  assert(!resFailLow.valid, `Teks SD rata-rata <2 kata/kalimat DITOLAK (avg: ${resFailLow.avgWordsPerSentence})`);

  // -------------------------------------------------------------
  // 3. Pemeriksaan Paragraf SD (Minimal 2 Paragraf untuk Wacana Prosa)
  // -------------------------------------------------------------
  console.log("\n--- 3. Uji Pemeriksaan Paragraf SD (Wajib Minimal 2 Paragraf) ---");
  // Teks SD tunggal 1 paragraf (tanpa \n\n) -> DITOLAK
  const textSinglePara = `${Array(30).fill(sent6).join(" ")}`;
  const resSinglePara = validateLanguageTextComplexity({
    rawJenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    text: textSinglePara,
  });
  assert(!resSinglePara.valid, "Teks SD tunggal 1 paragraf (tanpa \\n\\n) DITOLAK");
  assert(
    resSinglePara.reasons.some((r) => r.includes("minimal 2 paragraf")),
    "Memuat alasan kegagalan wacana tunggal wajib minimal 2 paragraf"
  );

  // Teks puisi SD (diawali judul/penanda puisi) -> DIKECUALIKAN dari syarat minimal 2 paragraf
  const puisiSD = `PUISI: SAHABAT KECILKU
${Array(25).fill("Kawan bermain di kala senja.").join("\n")}`;
  const resPuisiSD = validateLanguageTextComplexity({
    rawJenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    text: puisiSD,
  });
  assert(
    !resPuisiSD.reasons.some((r) => r.includes("minimal 2 paragraf")),
    "Puisi SD dikecualikan dari syarat minimal 2 paragraf wacana prosa"
  );

  // Teks ganda SD dengan sub-teks yang tidak memiliki konten paragraf -> DITOLAK
  const textDualBad = `**Teks 1: Bermain Bola**\nAnak-anak bermain di lapangan luas.\n**Teks 2: Menari Bersama**`;
  const resDualBad = validateLanguageTextComplexity({
    rawJenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    text: textDualBad,
  });
  assert(
    !resDualBad.valid && resDualBad.reasons.some((r) => r.includes("Teks ganda")),
    "Teks ganda SD dengan sub-teks kosong ditolak validator"
  );

  console.log(`\nHASIL AKHIR UNIT TEST SD: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runSdUnitTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
