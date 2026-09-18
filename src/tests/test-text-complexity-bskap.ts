import { validateLanguageTextComplexity, JENJANG_TEXT_CRITERIA } from "../lib/generator/text-complexity";

async function runTests() {
  console.log("=== UJI VALIDASI TEKS WACANA BSKAP No. 47/2025 & No. 45/2025 ===");
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

  // 1. Uji kasus stimulus dari tangkapan layar pengguna (172 kata, SMP/MTs)
  // Harus GAGAL karena rentang SMP/MTs adalah 200 - 250 kata
  const userScreenshotText = `Ekspor produk UMKM kini semakin mudah. Teknologi digital menghapus batasan jarak dan waktu. Dulu, pelaku usaha harus mencari pameran fisik. Sekarang, mereka cukup mengunggah katalog di internet. Platform perdagangan elektronik global menyediakan akses pasar luas.

Namun, ekspor digital memiliki tantangan tersendiri. Kualitas produk harus konsisten sesuai standar internasional. Pelaku UMKM juga wajib memahami regulasi ekspor. Setiap negara memiliki aturan bea masuk berbeda. Selain itu, kecepatan pengiriman menjadi faktor penentu. Konsumen digital menginginkan barang sampai dengan cepat.

Pemerintah memberikan dukungan melalui pelatihan literasi digital. Pelatihan ini membantu UMKM mengelola toko daring. Mereka belajar cara memotret produk yang menarik. Mereka juga diajarkan cara melakukan transaksi keuangan. Transaksi internasional memerlukan sistem pembayaran yang aman. Keamanan data konsumen harus menjadi prioritas utama.

Margin keuntungan ekspor biasanya lebih tinggi. Hal ini dikarenakan nilai tukar mata uang asing. Namun, biaya pengiriman internasional juga cukup mahal. UMKM harus menghitung biaya ini dengan cermat. Jangan sampai ongkos kirim lebih mahal dari barang. Strategi harga yang tepat akan menarik pembeli. Dengan digitalisasi, UMKM lokal bisa mendunia.`;

  const userTestRes = validateLanguageTextComplexity({
    rawJenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    text: userScreenshotText,
  });

  console.log("\n--- Kasus 1: Stimulus Screenshot Pengguna (SMP/MTs) ---");
  console.log(`Aktual: ${userTestRes.wordCount} kata, ${userTestRes.avgWordsPerSentence} kata/kalimat`);
  assert(!userTestRes.valid, "Stimulus screenshot ditolak (karena kata < batas bawah 200 kata)");
  assert(
    userTestRes.reasons.some((r) => r.includes("KURANG dari batas minimal")),
    "Memuat alasan kegagalan batas bawah kata"
  );

  // 2. Uji filter mapel Matematika: WAJIB DI-SKIP TOTAL (tidak ada kegagalan)
  console.log("\n--- Kasus 2: Mapel Matematika (Wajib Dilewati Total) ---");
  const mathText = "Sebuah tenda kemah berbentuk prisma segitiga memiliki luas alas 6 m² dan tinggi 2,5 m. Berapakah volumenya?";
  const mathTestRes = validateLanguageTextComplexity({
    rawJenjang: "SD/MI",
    mapel: "Matematika",
    text: mathText,
  });
  assert(mathTestRes.skipped === true, "Mapel Matematika dilewati (skipped = true)");
  assert(mathTestRes.valid === true, "Mapel Matematika selalu valid");
  assert(mathTestRes.reasons.length === 0, "Mapel Matematika tidak memiliki daftar penolakan");

  // 3. Uji jenjang SD/MI yang valid (150-200 kata, 3-7 kata/kalimat, kalimat tunggal)
  console.log("\n--- Kasus 3: Stimulus SD/MI Standar BSKAP (Valid) ---");
  const validSdText = `Budi memelihara seekor kucing belang.
Kucing itu diberi nama Si Belang.
Si Belang sangat lucu dan ramah.
Setiap pagi Budi memberi makan.
Makanannya berupa ikan rebus segar.
Si Belang selalu makan dengan lahap.
Setelah makan, kucing itu bermain bola.
Budi mengajak bermain di halaman rumah.
Halaman rumah Budi cukup luas.
Rumput hijau tumbuh di taman.
Budi merawat taman dengan rajin.
Ayah membantu menyiram tanaman bunga.
Ibu menanam bunga mawar merah.
Bunga mawar mekar dengan harum.
Kupu-kupu terbang di atas bunga.
Si Belang suka mengejar kupu-kupu itu.
Namun kupu-kupu terbang sangat tinggi.
Si Belang akhirnya tidur di teras.
Teras rumah terasa sejuk sekali.
Angin berhembus pelan saat siang.
Budi masuk ke dalam rumah.
Budi membaca buku cerita bergambar.
Cerita itu tentang hewan hutan.
Hutan adalah tempat tinggal aneka satwa.
Ekosistem adalah hubungan antarmakhluk hidup.
Semua makhluk hidup saling membutuhkan.
Manusia wajib menjaga kebersihan alam.
Alam yang bersih menyehatkan tubuh.
Budi sangat sayang pada lingkungannya.
Keluarga Budi hidup rukun selalu.`;

  const sdTestRes = validateLanguageTextComplexity({
    rawJenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    text: validSdText,
  });
  console.log(`SD/MI Aktual: ${sdTestRes.wordCount} kata, ${sdTestRes.avgWordsPerSentence} kata/kalimat`);
  assert(sdTestRes.valid, `SD/MI stimulus valid (${sdTestRes.wordCount} kata, rata-rata ${sdTestRes.avgWordsPerSentence})`);

  // 4. Uji jenjang SMP/MTs yang valid (200-250 kata, 5-9 kata/kalimat)
  console.log("\n--- Kasus 4: Stimulus SMP/MTs Standar BSKAP (Valid) ---");
  const validSmpText = `Hutan mangrove merupakan benteng alami pesisir pantai.
Hutan ini melindungi daratan dari ancaman abrasi laut.
Abrasi adalah peristiwa pengikisan pantai oleh gelombang laut.
Pohon mangrove memiliki akar tunjang yang sangat kokoh.
Akar tersebut menahan hantaman ombak besar setiap hari.
Kawasan bakau menjadi habitat beragam biota laut.
Ikan kecil dan kepiting berlindung di sela akar.
Bibit udang juga mencari makan di lumpur bakau.
Kelompok pemuda desa merawat kelestarian hutan bakau ini.
Mereka menanam ribuan bibit bakau baru di pesisir.
Kegiatan reboisasi dilakukan secara terencana dan berkala.
Reboisasi adalah kegiatan penanaman kembali kawasan hutan.
Kelestarian bakau berdampak baik bagi warga sekitar pantai.
Hasil tangkapan nelayan tradisional meningkat cukup pesat.
Pendapatan keluarga nelayan kini menjadi jauh lebih baik.
Kawasan pesisir ini juga dijadikan objek ekowisata bahari.
Banyak pelajar berkunjung untuk mempelajari ekosistem pesisir.
Pengunjung wajib menaati tata tertib kebersihan lingkungan pantai.
Warga melarang pembuangan sampah plastik di area bakau.
Sampah plastik dapat merusak kesuburan tanah lumpur pesisir.
Kemitraan antara warga dan pemerintah berjalan sangat harmonis.
Kerja sama ini berhasil menjaga keasrian lingkungan pesisir.
Pesisir yang lestari memberi manfaat bagi generasi penerus.
Masyarakat desa merasa sangat bangga akan prestasi ini.
Semua pihak berkomitmen melanjutkan program pemeliharaan pantai.
Generasi muda siap meneruskan tradisi pelestarian alam bahari.
Pohon bakau yang tumbuh subur mempercantik pemandangan alam.
Burung camar kerap singgah bertengger di ranting pohon.`;

  const smpTestRes = validateLanguageTextComplexity({
    rawJenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    text: validSmpText,
  });
  console.log(`SMP/MTs Aktual: ${smpTestRes.wordCount} kata, ${smpTestRes.avgWordsPerSentence} kata/kalimat`);
  assert(smpTestRes.valid, `SMP/MTs stimulus valid (${smpTestRes.wordCount} kata, rata-rata ${smpTestRes.avgWordsPerSentence})`);

  // 5. Uji jenjang SMA/MA & SMK/MAK yang valid (250-300 kata, 8-12 kata/kalimat)
  console.log("\n--- Kasus 5: Stimulus SMA/MA Standar BSKAP (Valid) ---");
  const smaSentences = [
    "Perekonomian digital telah mengalami perkembangan sangat pesat selama satu dekade.",
    "Transformasi teknologi membuka peluang baru bagi integrasi sektor usaha mikro.",
    "Pelaku usaha domestik kini dapat memanfaatkan platform perdagangan elektronik internasional.",
    "Namun demikian, penetrasi pasar mancanegara menuntut pemahaman regulasi ekspor yang ketat.",
    "Sistem tarif bea masuk berbeda-beda pada setiap negara tujuan pengiriman.",
    "Konsistensi standarisasi mutu barang menjadi parameter utama membangun kredibilitas dagang.",
    "Pelaku bisnis dituntut menguasai literasi finansial mengenai fluktuasi nilai tukar.",
    "Strategi penetapan harga komoditas harus memperhitungkan beban biaya logistik internasional.",
    "Hal ini bertujuan agar margin laba bersih tetap terjaga proporsional.",
    "Pemerintah memfasilitasi program pendampingan komprehensif guna mengakselerasi kesiapan operasional usaha.",
    "Pelatihan mencakup manajemen rantai pasok digital dan kepatuhan hukum perdagangan.",
    "Proteksi kerahasiaan data konsumen menjadi prioritas penting dalam transaksi digital.",
    "Sinergi yang solid antara regulator pemerintah dan perbankan memperkuat ekonomi.",
    "Inovasi sistem pembayaran lintas batas negara mempercepat arus transaksi keuangan.",
    "Tata kelola manajemen risiko yang matang menjaga daya saing komoditas.",
    "Transformasi struktural ini bermuara pada peningkatan cadangan devisa negara berharga.",
    "Perluasan lapangan kerja produktif terbuka luas di berbagai pelosok daerah.",
    "Kemandirian ekonomi berbasis inovasi teknologi mengangkat martabat bangsa di dunia.",
    "Seluruh elemen masyarakat berkomitmen mewujudkan ekosistem perdagangan adil dan berkelanjutan.",
    "Digitalisasi menjadi keharusan strategis bagi ketahanan ekonomi nasional masa depan.",
    "Dengan semangat inovasi pantang menyerah produk lokal menembus pasar internasional.",
    "Pencapaian ini memperkokoh posisi tawar ekonomi Indonesia di pergaulan antarbangsa.",
    "Karya anak bangsa memiliki mutu tinggi diakui oleh konsumen mancanegara.",
    "Kemitraan strategis multisektor senantiasa menjadi motor penggerak dinamika ekonomi global.",
    "Generasi muda terinspirasi untuk terus berinovasi dan berkontribusi nyata pembangunan.",
    "Semua pemangku kepentingan menyongsong era perdagangan digital dengan integritas tinggi.",
    "Keberlanjutan inisiatif strategis ini diwariskan demi kejayaan ekonomi nusantara mendatang."
  ];
  const validSmaText = smaSentences.join("\n");

  const smaTestRes = validateLanguageTextComplexity({
    rawJenjang: "SMA/MA",
    mapel: "Bahasa Indonesia",
    text: validSmaText,
  });
  console.log(`SMA/MA Aktual: ${smaTestRes.wordCount} kata, ${smaTestRes.avgWordsPerSentence} kata/kalimat`);
  assert(smaTestRes.valid, `SMA/MA stimulus valid (${smaTestRes.wordCount} kata, rata-rata ${smaTestRes.avgWordsPerSentence})`);

  console.log(`\nHASIL AKHIR: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
