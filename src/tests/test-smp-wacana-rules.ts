import {
  validateLanguageTextComplexity,
  JENJANG_TEXT_CRITERIA,
  checkInferensialKeyOverlap,
} from "../lib/generator/text-complexity";

async function runUnitTests() {
  console.log("=== UNIT TEST: REVISI ATURAN TEKS SMP & KUNCI INFERENSIAL/EVALUASI ===\n");
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
  // 1. Kriteria SMP Baru (Target 7-10 kata/kalimat, Gerbang Lolos 6-11)
  // -------------------------------------------------------------
  console.log("--- 1. Uji Kriteria Rentang Kata per Kalimat SMP (7-10, Gerbang 6-11) ---");
  const smpCriteria = JENJANG_TEXT_CRITERIA["SMP/MTs"];
  assert(smpCriteria.minWords === 200, "SMP minWords tetap 200");
  assert(smpCriteria.maxWords === 250, "SMP maxWords tetap 250");
  assert(smpCriteria.minWordsPerSentence === 7, "SMP target minWordsPerSentence adalah 7");
  assert(smpCriteria.maxWordsPerSentence === 10, "SMP target maxWordsPerSentence adalah 10");
  assert(smpCriteria.allowComplexSentences === true, "SMP mengizinkan kalimat majemuk setara / bertingkat 1 lapis");

  // Buat teks 210 kata dengan rata-rata 8,5 kata/kalimat (dalam 2 paragraf)
  const sent8 = "Kelompok siswa sedang meneliti tanaman bakau pesisir."; // 7 kata
  const sent10 = "Mereka mencatat pertumbuhan tinggi pohon secara berkala setiap bulan."; // 9 kata
  const para1 = Array(13).fill(sent8).join(" ");
  const para2 = Array(13).fill(sent10).join(" ");
  const textAvg8 = `${para1}\n\n${para2}`;

  const resAvg8 = validateLanguageTextComplexity({
    rawJenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    text: textAvg8,
  });
  assert(resAvg8.valid, `Teks SMP rata-rata 8 kata/kalimat LOLOS validasi (Aktual: ${resAvg8.wordCount} kata, avg: ${resAvg8.avgWordsPerSentence})`);

  // Teks SMP dengan rata-rata 6 kata/kalimat (gerbang batas bawah: 7 - 1 = 6) -> LOLOS
  const sent6 = "Siswa SMP mengamati burung camar laut."; // 6 kata
  const sent7 = "Mereka mencatat kebiasaan makannya setiap hari."; // 6 kata
  const textGate6 = `${Array(18).fill(sent6).join(" ")}\n\n${Array(18).fill(sent7).join(" ")}`;
  const resGate6 = validateLanguageTextComplexity({
    rawJenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    text: textGate6,
  });
  assert(resGate6.valid, `Teks SMP rata-rata ~5.5-6 kata/kalimat pada gerbang bawah LOLOS (avg: ${resGate6.avgWordsPerSentence})`);

  // Teks SMP dengan rata-rata 11 kata/kalimat (gerbang batas atas: 10 + 1 = 11) -> LOLOS
  const sent11 = "Siswa kelas delapan melakukan observasi langsung terhadap keanekaragaman hayati di hutan."; // 11 kata
  const textGate11 = `${Array(10).fill(sent11).join(" ")}\n\n${Array(10).fill(sent11).join(" ")}`;
  const resGate11 = validateLanguageTextComplexity({
    rawJenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    text: textGate11,
  });
  assert(resGate11.valid, `Teks SMP rata-rata 11 kata/kalimat pada gerbang atas LOLOS (avg: ${resGate11.avgWordsPerSentence})`);

  // Teks SMP dengan rata-rata 13 kata/kalimat (> 11) -> GAGAL
  const sent14 = "Siswa kelas delapan melakukan observasi lapangan secara langsung terhadap keanekaragaman hayati pohon mangrove di hutan pesisir."; // 15 kata
  const textFailHigh = `${Array(8).fill(sent14).join(" ")}\n\n${Array(8).fill(sent14).join(" ")}`;
  const resFailHigh = validateLanguageTextComplexity({
    rawJenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    text: textFailHigh,
  });
  assert(!resFailHigh.valid, `Teks SMP rata-rata >11 kata/kalimat DITOLAK (avg: ${resFailHigh.avgWordsPerSentence})`);

  // -------------------------------------------------------------
  // 2. Pemeriksaan Paragraf SMP
  // -------------------------------------------------------------
  console.log("\n--- 2. Uji Pemeriksaan Paragraf SMP ---");
  // Teks tunggal non-puisi tanpa paragraf (\n saja, bukan \n\n) -> GAGAL
  const textSinglePara = `${Array(26).fill(sent8).join(" ")}`;
  const resSinglePara = validateLanguageTextComplexity({
    rawJenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    text: textSinglePara,
  });
  assert(!resSinglePara.valid, "Teks SMP tunggal 1 paragraf (tanpa \\n\\n) DITOLAK");
  assert(
    resSinglePara.reasons.some((r) => r.includes("minimal 2 paragraf")),
    "Memuat alasan kegagalan minimal 2 paragraf"
  );

  // Teks puisi (diawali tipe puisi / baris-baris bait) -> dikecualikan dari syarat 2 paragraf
  const puisiText = `PUISI: DI TEPI PANTAI
${Array(28).fill("Ombak memecah sunyi pantai.").join("\n")}`;
  const resPuisi = validateLanguageTextComplexity({
    rawJenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    text: puisiText,
  });
  assert(
    !resPuisi.reasons.some((r) => r.includes("minimal 2 paragraf")),
    "Puisi dikecualikan dari syarat minimal 2 paragraf wacana prosa"
  );

  // -------------------------------------------------------------
  // 3. Blok "Daftar Istilah:" Tidak Dihitung
  // -------------------------------------------------------------
  console.log("\n--- 3. Uji Blok 'Daftar Istilah:' Tidak Ikut Dihitung ---");
  const baseText = `${para1}\n\n${para2}`;
  const baseRes = validateLanguageTextComplexity({
    rawJenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    text: baseText,
  });

  const textWithGlossary = `${baseText}

Daftar Istilah:
abrasi: pengikisan pantai oleh tenaga gelombang laut dan arus laut
ekosistem: keanekaragaman suatu komunitas beserta lingkungannya
reboisasi: penanaman kembali hutan yang telah ditebang`;

  const glossaryRes = validateLanguageTextComplexity({
    rawJenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    text: textWithGlossary,
  });

  assert(
    glossaryRes.wordCount === baseRes.wordCount,
    `Jumlah kata TIDAK bertambah karena Daftar Istilah di-strip (${glossaryRes.wordCount} vs ${baseRes.wordCount})`
  );
  assert(
    glossaryRes.sentenceCount === baseRes.sentenceCount,
    `Jumlah kalimat TIDAK bertambah (${glossaryRes.sentenceCount} vs ${baseRes.sentenceCount})`
  );

  // -------------------------------------------------------------
  // 4. Istilah Teknis: Dimatikan untuk SMP, Tetap Aktif untuk SD
  // -------------------------------------------------------------
  console.log("\n--- 4. Uji Peringatan Istilah Teknis (SMP Dimatikan, SD Tetap) ---");
  const techTextSMP = `${para1} Inflasi terjadi di pasar komoditas ekspor. Margin laba menurun akibat devisa dan likuiditas.\n\n${para2}`;
  const resTechSMP = validateLanguageTextComplexity({
    rawJenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    text: techTextSMP,
  });
  assert(
    !resTechSMP.warnings.some((w) => w.includes("Peringatan Istilah Teknis")),
    "SMP TIDAK memicu peringatan istilah teknis tanpa definisi langsung"
  );

  const techTextSD = `${Array(13).fill("Budi melihat inflasi margin dividen likuiditas ekspor.").join(" ")}\n\n${Array(12).fill("Budi melihat inflasi margin dividen likuiditas ekspor.").join(" ")}`;
  const resTechSD = validateLanguageTextComplexity({
    rawJenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    text: techTextSD,
  });
  assert(
    resTechSD.warnings.some((w) => w.includes("Peringatan Istilah Teknis")),
    "SD TETAP memicu peringatan istilah teknis"
  );

  // Snapshot kriteria SD
  const sdCriteria = JENJANG_TEXT_CRITERIA["SD/MI"];
  assert(sdCriteria.minWords === 150, "SD minWords tetap 150");
  assert(sdCriteria.maxWords === 200, "SD maxWords tetap 200");
  assert(sdCriteria.minWordsPerSentence === 5, "SD target minWordsPerSentence adalah 5");
  assert(sdCriteria.maxWordsPerSentence === 7, "SD maxWordsPerSentence tetap 7");
  assert(sdCriteria.allowComplexSentences === false, "SD allowComplexSentences tetap false");

  // -------------------------------------------------------------
  // 5. Pemeriksaan Kunci Soal Inferensial / Evaluasi
  // -------------------------------------------------------------
  console.log("\n--- 5. Uji Pemeriksaan Kemiripan Kunci Inferensial/Evaluasi (≥80%) ---");
  const stimulusSample = `Kader posyandu mencatat nama setiap warga lansia di balai desa.
Pendaftaran antrean dicatat lewat aplikasi pada telepon pintar warga.
Warga yang tidak memiliki ponsel tetap dilayani dengan sigap oleh petugas kantor desa.`;

  // Kunci menyalin mentah (≥80% kata berurutan)
  const verbatimKey = "Pendaftaran antrean dicatat lewat aplikasi pada telepon pintar warga desa.";
  const overlapVerbatim = checkInferensialKeyOverlap(verbatimKey, stimulusSample, 0.8);
  assert(
    overlapVerbatim.hasOverlap === true,
    `Kunci menyalin mentah terdeteksi tumpang tindih (rasio: ${Math.round(overlapVerbatim.ratio * 100)}% >= 80%)`
  );

  // Kunci menyimpulkan (inferensial sesungguhnya, kata-kata berbeda)
  const inferredKey = "Warga lanjut usia tetap memperoleh kemudahan akses walau mengalami kendala kepemilikan gawai pribadi.";
  const overlapInferred = checkInferensialKeyOverlap(inferredKey, stimulusSample, 0.8);
  assert(
    overlapInferred.hasOverlap === false,
    `Kunci inferensial/simpulan makna TIDAK terdeteksi tumpang tindih (rasio: ${Math.round(overlapInferred.ratio * 100)}%)`
  );

  // Kunci pendek (< 4 kata) diabaikan untuk mencegah false positive
  const shortKey = "kantor desa";
  const overlapShort = checkInferensialKeyOverlap(shortKey, stimulusSample, 0.8);
  assert(
    overlapShort.hasOverlap === false,
    "Kunci pendek <4 kata diabaikan dari peringatan"
  );

  console.log(`\nHASIL AKHIR UNIT TEST: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runUnitTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
