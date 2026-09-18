function formatMathExplanation(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Pecah baris sebelum poin bernomor atau berhuruf:
  // Contoh: ". 1) ", ". 2) ", ". 3) ", ". 1. ", ") 2) "
  result = result.replace(/(\.|\))\s+(?=\d+[\)\.]\s+)/g, "$1\n\n");

  // 2. Pecah baris sebelum poin opsi:
  // Contoh: ". A: ", ". B: ", ". Opsi A: "
  result = result.replace(/(\.|\))\s+(?=[A-D]:\s+|Opsi\s+[A-D]:)/g, "$1\n\n");

  // 3. Pecah baris sebelum langkah atau pernyataan:
  // Contoh: ". Langkah 1: ", ". Pernyataan 1: ", ". Tahap 1: "
  result = result.replace(/(\.|\))\s+(?=(?:Langkah|Pernyataan|Tahap|Kasus)\s+\d+[:\.\s])/gi, "$1\n\n");

  // 4. Pecah baris sebelum kata kunci struktur:
  // Contoh: ". Diketahui:", ". Ditanya:", ". Jawab:", ". Penyelesaian:", ". Kesimpulan:", ". Jadi,"
  result = result.replace(/(\.|\))\s+(?=(?:Diketahui|Ditanya|Dijawab|Penyelesaian|Rumus|Analisis|Simpulan|Kesimpulan|Catatan|Koreksi)[:\s])/gi, "$1\n\n");

  // 5. Pecah baris jika ada kalimat kelanjutan seperti "Selisih ...", "Maka ...", "Sehingga ...", "Jadi ..."
  result = result.replace(/(\.|\))\s+(?=(?:Selisih|Maka|Sehingga|Jadi|Dengan demikian|Berdasarkan perhitungan)\s+)/gi, "$1\n");

  return result;
}

const sample1 = "Pola: $a=15, b=4$. 1) $U_{10} = 15 + (10-1)4 = 15 + 36 = 51$ (Benar). 2) $U_{20} = 15 + (19)4 = 15 + 76 = 91$. Selisih $U_{20} - U_1 = 91 - 15 = 76$ (Benar). 3) $S_{20} = \\frac{20}{2}(2(15) + (19)4) = 10(30 + 76) = 10(106) = 1.060$. (Koreksi: Perhitungan benar, maka pernyataan 3 Benar. Kunci diperbarui).";

console.log("=== ORIGINAL ===");
console.log(sample1);

console.log("\n=== STRUCTURED VERTICALLY ===");
console.log(formatMathExplanation(sample1));
