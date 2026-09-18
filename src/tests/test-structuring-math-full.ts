function formatMathExplanation(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Pecah baris sebelum nomor poin: " 1) ", " 2) ", " 3) ", " 1. ", " 2. "
  result = result.replace(/(\.|\))\s+(?=\d+[\)\.]\s+)/g, "$1\n\n");

  // 2. Pecah baris sebelum opsi: " A: ", " B: ", " C: ", " D: ", " Opsi A: "
  result = result.replace(/(\.|\))\s+(?=[A-D]:\s+|Opsi\s+[A-D]:)/g, "$1\n\n");

  // 3. Pecah baris sebelum Langkah / Pernyataan / Tahap:
  result = result.replace(/(\.|\))\s+(?=(?:Langkah|Pernyataan|Tahap|Kasus)\s+\d+[:\.\s])/gi, "$1\n\n");

  // 4. Pecah baris sebelum kata kunci struktur deduksi matematika:
  result = result.replace(/(\.|\))\s+(?=(?:Diketahui|Ditanya|Dijawab|Penyelesaian|Rumus|Analisis|Simpulan|Kesimpulan|Catatan|Koreksi)[:\s])/gi, "$1\n\n");

  // 5. Pecah baris untuk kalimat tindak lanjut perhitungan:
  result = result.replace(/(\.|\))\s+(?=(?:Selisih|Maka|Sehingga|Jadi|Dengan demikian|Berdasarkan perhitungan)\s+)/gi, "$1\n");

  // 6. Pecah baris sebelum catatan dalam kurung seperti (Koreksi: ...) atau (Catatan: ...)
  result = result.replace(/\s+(?=\((?:Koreksi|Catatan):)/gi, "\n");

  return result;
}

const testCases = [
  {
    name: "User Screenshot (A01-SMP-MAT-06)",
    input: "Pola: $a=15, b=4$. 1) $U_{10} = 15 + (10-1)4 = 15 + 36 = 51$ (Benar). 2) $U_{20} = 15 + (19)4 = 15 + 76 = 91$. Selisih $U_{20} - U_1 = 91 - 15 = 76$ (Benar). 3) $S_{20} = \\frac{20}{2}(2(15) + (19)4) = 10(30 + 76) = 10(106) = 1.060$. (Koreksi: Perhitungan benar, maka pernyataan 3 Benar. Kunci diperbarui).",
  },
  {
    name: "SAR Question (A01-SMP-MAT-05)",
    input: "A: Jarak AC = $\\sqrt{120^2 + 90^2} = \\sqrt{14400 + 8100} = \\sqrt{22500} = 150$ km (Benar). B: Arah Utara dan Timur saling tegak lurus, membentuk sudut $90^\\circ$ (Benar). C: Waktu = Jarak / Kecepatan = $150 / 50 = 3$ jam (Benar). D: Jarak total = $120 + 90 = 210$ km (Benar).",
  },
  {
    name: "Langkah-langkah Bertingkat",
    input: "Langkah 1: Hitung total luas $L = 20 \\times 14 = 280$. Langkah 2: Hitung kolam $r = 3.5$, $L = 38.5$. Langkah 3: Sisa taman $280 - 38.5 = 241.5$. Jadi, biaya total adalah Rp6.037.500.",
  },
];

for (const tc of testCases) {
  console.log(`\n================== ${tc.name} ==================`);
  console.log("--- FORMATTED ---");
  const lines = formatMathExplanation(tc.input).split("\n");
  lines.forEach((l) => console.log(l));
}
