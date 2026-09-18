/**
 * Bank Soal Mock TKA Standar Pusmendik Kemendikdasmen & Defantri.com
 * Digunakan untuk Pengujian Otomatis, CI Offline, dan Simulasi Tanpa Kuota API.
 * Menghasilkan 30 butir soal lengkap dengan 1 stimulus grup berbasis Tabel Markdown,
 * multi-step reasoning (HOTS), keterikatan stimulus 100%, dan bebas dari soal trivial.
 */

export function generateMockGeminiBatchResponse(
  jenjang: string,
  mapel: string,
  totalCount: number = 30,
  distB?: { PG: number; PGK_MCMA: number; PGK_KATEGORI: number },
  distK?: { rendah: number; sedang: number; tinggi: number }
): string {
  const isMatematika = mapel.toLowerCase().includes("matematika");
  const isBahasa = mapel.toLowerCase().includes("bahasa");

  const items: any[] = [];

  // ==========================================
  // 1. STIMULUS GRUP RESMI (TABEL MARKDOWN & CERITA KONTEKSTUAL)
  // ==========================================
  if (isMatematika) {
    items.push({
      stimulus_id_sementara: "stim-01",
      tipe: "data",
      konten: `### Laporan Penjualan dan Persediaan Koperasi Siswa Mandiri (${jenjang})

Koperasi Siswa Mandiri mencatat data transaksi penjualan alat tulis dan persediaan barang selama 5 hari sekolah dalam tabel berikut:

| Hari | Buku Tulis (pcs) | Pensil 2B (pcs) | Penggaris (pcs) | Total Pendapatan Kotor (Rp) |
|---|---|---|---|---|
| Senin | 40 | 25 | 15 | 245.000 |
| Selasa | 35 | 30 | 10 | 220.000 |
| Rabu | 50 | 20 | 25 | 310.000 |
| Kamis | 30 | 15 | 20 | 195.000 |
| Jumat | 45 | 40 | 10 | 275.000 |

*Keterangan Tambahan:*
1. Harga jual per unit: Buku Tulis = Rp $4.000,00$, Pensil 2B = Rp $2.500,00$, dan Penggaris = Rp $1.500,00$.
2. Keuntungan bersih koperasi ditetapkan sebesar $20\\%$ dari total pendapatan kotor setiap hari.
3. Koperasi menyisihkan $10\\%$ dari keuntungan bersih setiap hari untuk dialokasikan ke Dana Sosial Siswa Kurang Mampu.`,
    });
  } else {
    let mockStimulusContent = "";
    if (jenjang.includes("SD")) {
      mockStimulusContent = `### Memelihara Kucing dan Menjaga Lingkungan Rumah (${jenjang})

Budi memelihara seekor kucing belang.
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
    } else if (jenjang.includes("SMP")) {
      mockStimulusContent = `### Kearifan Konservasi Hutan Mangrove di Pesisir Nusantara (${jenjang})

Hutan mangrove merupakan benteng alami pesisir pantai.
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
    } else {
      mockStimulusContent = `### Perekonomian Digital dan Daya Saing Ekspor UMKM (${jenjang})

Perekonomian digital telah mengalami perkembangan sangat pesat selama satu dekade.
Transformasi teknologi membuka peluang baru bagi integrasi sektor usaha mikro.
Pelaku usaha domestik kini dapat memanfaatkan platform perdagangan elektronik internasional.
Namun demikian, penetrasi pasar mancanegara menuntut pemahaman regulasi ekspor yang ketat.
Sistem tarif bea masuk berbeda-beda pada setiap negara tujuan pengiriman.
Konsistensi standarisasi mutu barang menjadi parameter utama membangun kredibilitas dagang.
Pelaku bisnis dituntut menguasai literasi finansial mengenai fluktuasi nilai tukar.
Strategi penetapan harga komoditas harus memperhitungkan beban biaya logistik internasional.
Hal ini bertujuan agar margin laba bersih tetap terjaga proporsional.
Pemerintah memfasilitasi program pendampingan komprehensif guna mengakselerasi kesiapan operasional usaha.
Pelatihan mencakup manajemen rantai pasok digital dan kepatuhan hukum perdagangan.
Proteksi kerahasiaan data konsumen menjadi prioritas penting dalam transaksi digital.
Sinergi yang solid antara regulator pemerintah dan perbankan memperkuat ekonomi.
Inovasi sistem pembayaran lintas batas negara mempercepat arus transaksi keuangan.
Tata kelola manajemen risiko yang matang menjaga daya saing komoditas.
Transformasi struktural ini bermuara pada peningkatan cadangan devisa negara berharga.
Perluasan lapangan kerja produktif terbuka luas di berbagai pelosok daerah.
Kemandirian ekonomi berbasis inovasi teknologi mengangkat martabat bangsa di dunia.
Seluruh elemen masyarakat berkomitmen mewujudkan ekosistem perdagangan adil dan berkelanjutan.
Digitalisasi menjadi keharusan strategis bagi ketahanan ekonomi nasional masa depan.
Dengan semangat inovasi pantang menyerah produk lokal menembus pasar internasional.
Pencapaian ini memperkokoh posisi tawar ekonomi Indonesia di pergaulan antarbangsa.
Karya anak bangsa memiliki mutu tinggi diakui oleh konsumen mancanegara.
Kemitraan strategis multisektor senantiasa menjadi motor penggerak dinamika ekonomi global.
Generasi muda terinspirasi untuk terus berinovasi dan berkontribusi nyata pembangunan.
Semua pemangku kepentingan menyongsong era perdagangan digital dengan integritas tinggi.
Keberlanjutan inisiatif strategis ini diwariskan demi kejayaan ekonomi nusantara mendatang.`;
    }

    items.push({
      stimulus_id_sementara: "stim-01",
      tipe: "teks",
      konten: mockStimulusContent,
    });
  }

  // ==========================================
  // 2. BANK SOAL LENGKAP 30 BUTIR MATEMATIKA (STANDAR PUSMENDIK & DEFANTRI)
  // ==========================================
  const mathQuestions: any[] = [
    // --- SLOT 1: PG, Tunggal, Rendah (Pecahan Campuran & Resep Proporsional) ---
    {
      jenjang,
      mapel,
      elemen: "Bilangan",
      sub_elemen: jenjang.includes("SMP") ? "Bilangan Real" : "Bilangan Rasional",
      kompetensi: "Operasi hitung pecahan dalam masalah proporsional kontekstual",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "rendah",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Ibu Fatimah membuat kue bolu kukus untuk pesanan bazar sekolah. Untuk membuat $2$ loyang kue, diperlukan $\\frac{3}{4}\\text{ kg}$ tepung terigu dan $1\\frac{1}{2}\\text{ cangkir}$ gula pasir. Jika Ibu Fatimah mendapat pesanan sebanyak $6$ loyang kue bolu kukus, total tepung terigu yang harus disiapkan adalah...`,
      gambar: null,
      opsi: [
        { label: "A", text: `$1\\frac{1}{2}\\text{ kg}$` },
        { label: "B", text: `$2\\frac{1}{4}\\text{ kg}$` },
        { label: "C", text: `$3\\text{ kg}$` },
        { label: "D", text: `$4\\frac{1}{2}\\text{ kg}$` },
      ],
      kunci_jawaban: ["B"],
      pembahasan: `Langkah 1: Tentukan faktor kelipatan pesanan kue: $k = \\frac{6}{2} = 3\\text{ kali}$.\nLangkah 2: Hitung kebutuhan tepung terigu: $3 \\times \\frac{3}{4} = \\frac{9}{4} = 2\\frac{1}{4}\\text{ kg}$.\n$\\therefore$ Pilihan yang benar adalah B.`,
    },

    // --- SLOT 2: PG, Tunggal, Rendah (Bilangan Bulat & Skor Kompetisi PEMDAS) ---
    {
      jenjang,
      mapel,
      elemen: "Bilangan",
      sub_elemen: jenjang.includes("SMP") ? "Bilangan Real" : "Bilangan Rasional",
      kompetensi: "Operasi bilangan bulat campuran dengan aturan penskoran kompetisi",
      level_kognitif: "Pengetahuan dan Pemahaman",
      tingkat_kesulitan: "rendah",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Dalam suatu kompetisi sains antarsekolah, aturan penskoran yang berlaku adalah: jawaban benar bernilai $+4$, jawaban salah bernilai $-1$, dan butir soal yang tidak dijawab bernilai $0$. Dari total $40$ soal yang diujikan, Rian menjawab $34$ butir soal dan berhasil memperoleh $28$ jawaban benar. Skor total yang diperoleh Rian dalam kompetisi tersebut adalah...`,
      gambar: null,
      opsi: [
        { label: "A", text: `$106$` },
        { label: "B", text: `$112$` },
        { label: "C", text: `$118$` },
        { label: "D", text: `$124$` },
      ],
      kunci_jawaban: ["A"],
      pembahasan: `Langkah 1: Identifikasi jumlah respon soal: Jawaban benar $= 28$, jawaban salah $= 34 - 28 = 6$, tidak dijawab $= 40 - 34 = 6$.\nLangkah 2: Hitung skor masing-masing kategori: Skor benar $= 28 \\times 4 = 112$; Skor salah $= 6 \\times (-1) = -6$; Skor kosong $= 6 \\times 0 = 0$.\nLangkah 3: Hitung total skor: $112 + (-6) + 0 = 106$.\n$\\therefore$ Pilihan yang benar adalah A.`,
    },

    // --- SLOT 3: PG, Tunggal, Rendah (FPB/KPK Berkonteks Kalender) ---
    {
      jenjang,
      mapel,
      elemen: "Bilangan",
      sub_elemen: jenjang.includes("SMP") ? "Bilangan Real" : "Bilangan Rasional",
      kompetensi: "Kelipatan Persekutuan Terkecil (KPK) berkonteks penanggalan kalender",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "rendah",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Naufal dan Zaki berlatih renang di kolam renang yang sama. Naufal berlatih secara rutin setiap $4$ hari sekali, sedangkan Zaki berlatih setiap $6$ hari sekali. Jika pada hari Rabu, tanggal 6 Agustus mereka berlatih bersama untuk pertama kalinya, pada hari dan tanggal berapakah mereka akan berlatih bersama untuk kedua kalinya?`,
      gambar: null,
      opsi: [
        { label: "A", text: `Minggu, 17 Agustus` },
        { label: "B", text: `Senin, 18 Agustus` },
        { label: "C", text: `Selasa, 19 Agustus` },
        { label: "D", text: `Rabu, 20 Agustus` },
      ],
      kunci_jawaban: ["B"],
      pembahasan: `Langkah 1: Tentukan KPK dari periode latihan: $\\text{KPK}(4, 6) = 12\\text{ hari}$.\nLangkah 2: Tambahkan tanggal: $6\\text{ Agustus} + 12\\text{ hari} = 18\\text{ Agustus}$.\nLangkah 3: Tentukan pergeseran hari: $12 \\pmod 7 = 5\\text{ hari}$. Lima hari setelah hari Rabu adalah hari Senin.\n$\\therefore$ Mereka berlatih bersama lagi pada hari Senin, 18 Agustus (Pilihan B).`,
    },

    // --- SLOT 4: PG, Tunggal, Sedang (Luas Bangun Berarsir Taman & Kolam dengan Diagram SVG) ---
    {
      jenjang,
      mapel,
      elemen: "Geometri dan Pengukuran",
      sub_elemen: "Pengukuran",
      kompetensi: "Luas bangun datar gabungan dan estimasi biaya penanaman rumput",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Sebuah taman sekolah berbentuk persegi panjang dengan ukuran panjang $20\\text{ m}$ dan lebar $14\\text{ m}$. Tepat di tengah taman dibangun sebuah kolam ikan berbentuk lingkaran dengan diameter $7\\text{ m}$ (gunakan $\\pi = \\frac{22}{7}$). Seluruh permukaan taman di luar kolam akan ditanami rumput hias dengan biaya pemasangan Rp $25.000,00\\text{ per m}^2$. Total biaya penanaman rumput tersebut adalah...`,
      gambar: {
        tipe: "svg",
        svg_content: `<svg viewBox="0 0 300 180" width="280" height="160" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="280" height="150" fill="#a7f3d0" stroke="#047857" stroke-width="2"/><circle cx="150" cy="85" r="45" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/><text x="150" y="88" font-size="11" text-anchor="middle" fill="#0369a1" font-weight="bold">Kolam (d = 7 m)</text><text x="150" y="25" font-size="11" text-anchor="middle" fill="#065f46">Panjang = 20 m</text><text x="285" y="90" font-size="11" text-anchor="end" fill="#065f46">Lebar = 14 m</text></svg>`,
        deskripsi_alt: "Denah taman persegi panjang 20m x 14m dengan kolam lingkaran diameter 7m di tengahnya",
      },
      opsi: [
        { label: "A", text: `Rp $6.037.500,00$` },
        { label: "B", text: `Rp $6.425.000,00$` },
        { label: "C", text: `Rp $7.000.000,00$` },
        { label: "D", text: `Rp $7.962.500,00$` },
      ],
      kunci_jawaban: ["A"],
      pembahasan: `Langkah 1: Hitung luas taman total: $L_{\\text{taman}} = 20 \\times 14 = 280\\text{ m}^2$.\nLangkah 2: Hitung luas kolam lingkaran: $r = \\frac{7}{2} = 3,5\\text{ m}$.\n$L_{\\text{kolam}} = \\frac{22}{7} \\times \\frac{7}{2} \\times \\frac{7}{2} = \\frac{77}{2} = 38,5\\text{ m}^2$.\nLangkah 3: Hitung luas rumput: $280 - 38,5 = 241,5\\text{ m}^2$.\nLangkah 4: Hitung total biaya: $241,5 \\times 25.000 = \\text{Rp}6.037.500,00$.\n$\\therefore$ Pilihan yang benar adalah A.`,
    },

    // --- SLOT 5: PG, Grup stim-01, Sedang (Dana Sosial dari Stimulus Koperasi) ---
    {
      jenjang,
      mapel,
      elemen: "Data",
      sub_elemen: "Penyajian dan Penggunaan Data",
      kompetensi: "Pengambilan informasi dan perhitungan persentase berantai dari tabel",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Berdasarkan tabel rekapitulasi Koperasi Siswa Mandiri pada stimulus di atas, berapakah besar alokasi dana sosial yang berhasil dikumpulkan oleh koperasi khusus pada hari Rabu?`,
      gambar: null,
      opsi: [
        { label: "A", text: `Rp $4.400,00$` },
        { label: "B", text: `Rp $6.200,00$` },
        { label: "C", text: `Rp $31.000,00$` },
        { label: "D", text: `Rp $62.000,00$` },
      ],
      kunci_jawaban: ["B"],
      pembahasan: `Langkah 1: Ambil data pendapatan kotor hari Rabu dari tabel: $\\text{Rp}310.000,00$.\nLangkah 2: Hitung keuntungan bersih (20\\%): $20\\% \\times 310.000 = \\text{Rp}62.000,00$.\nLangkah 3: Hitung dana sosial (10\\% dari keuntungan bersih): $10\\% \\times 62.000 = \\text{Rp}6.200,00$.\n$\\therefore$ Pilihan yang benar adalah B.`,
    },

    // --- SLOT 6: PG, Grup stim-01, Sedang (Rata-rata Penjualan Buku Tulis dari Tabel) ---
    {
      jenjang,
      mapel,
      elemen: "Data",
      sub_elemen: "Penyajian dan Penggunaan Data",
      kompetensi: "Menentukan nilai rata-rata (mean) dari data tabel frekuensi",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Berdasarkan data tabel penjualan pada stimulus di atas, rata-rata jumlah buku tulis yang terjual per hari selama $5$ hari sekolah adalah...`,
      gambar: null,
      opsi: [
        { label: "A", text: `$38\\text{ pcs}$` },
        { label: "B", text: `$39\\text{ pcs}$` },
        { label: "C", text: `$40\\text{ pcs}$` },
        { label: "D", text: `$42\\text{ pcs}$` },
      ],
      kunci_jawaban: ["C"],
      pembahasan: `Langkah 1: Jumlahkan penjualan buku tulis: $40 + 35 + 50 + 30 + 45 = 200\\text{ pcs}$.\nLangkah 2: Bagi dengan banyaknya hari (5 hari): $\\bar{x} = \\frac{200}{5} = 40\\text{ pcs}$.\n$\\therefore$ Rata-rata penjualan buku tulis per hari adalah 40 pcs (Pilihan C).`,
    },

    // --- SLOT 7: PG, Grup stim-01, Sedang (Keuntungan Bersih Hari Jumat) ---
    {
      jenjang,
      mapel,
      elemen: "Bilangan",
      sub_elemen: jenjang.includes("SMP") ? "Bilangan Real" : "Bilangan Rasional",
      kompetensi: "Penerapan persentase keuntungan dalam kegiatan ekonomi koperasi",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Jika pada hari Jumat seluruh keuntungan bersih koperasi disumbangkan untuk perbaikan rak perpustakaan sekolah sebesar $50\\%$, sisa keuntungan bersih yang tetap disimpan di kas koperasi adalah...`,
      gambar: null,
      opsi: [
        { label: "A", text: `Rp $27.500,00$` },
        { label: "B", text: `Rp $35.000,00$` },
        { label: "C", text: `Rp $55.000,00$` },
        { label: "D", text: `Rp $68.750,00$` },
      ],
      kunci_jawaban: ["A"],
      pembahasan: `Langkah 1: Ambil total pendapatan hari Jumat: $\\text{Rp}275.000,00$.\nLangkah 2: Hitung keuntungan bersih (20\\%): $0,20 \\times 275.000 = \\text{Rp}55.000,00$.\nLangkah 3: Sisa kas setelah disumbangkan 50\\%: $50\\% \\times 55.000 = \\text{Rp}27.500,00$.\n$\\therefore$ Pilihan yang benar adalah A.`,
    },

    // --- SLOT 8: PG, Grup stim-01, Sedang (Rasio Penjualan Penggaris vs Pensil) ---
    {
      jenjang,
      mapel,
      elemen: "Bilangan",
      sub_elemen: jenjang.includes("SMP") ? "Bilangan Real" : "Bilangan Rasional",
      kompetensi: "Perbandingan senilai kuantitas barang dari tabel data",
      level_kognitif: "Pengetahuan dan Pemahaman",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Berdasarkan tabel pada stimulus, perbandingan paling sederhana antara total penggaris yang terjual selama $5$ hari dengan total pensil 2B yang terjual selama $5$ hari adalah...`,
      gambar: null,
      opsi: [
        { label: "A", text: `$1 : 2$` },
        { label: "B", text: `$4 : 5$` },
        { label: "C", text: `$8 : 13$` },
        { label: "D", text: `$13 : 8$` },
      ],
      kunci_jawaban: ["C"],
      pembahasan: `Langkah 1: Hitung total penggaris: $15 + 10 + 25 + 20 + 10 = 80\\text{ pcs}$.\nLangkah 2: Hitung total pensil: $25 + 30 + 20 + 15 + 40 = 130\\text{ pcs}$.\nLangkah 3: Tentukan rasio: $\\frac{80}{130} = 8 : 13$.\n$\\therefore$ Pilihan yang benar adalah C.`,
    },

    // --- SLOT 9: PG, Tunggal, Sedang (Volume Balok Berongga dengan Tebal Kayu) ---
    {
      jenjang,
      mapel,
      elemen: "Geometri dan Pengukuran",
      sub_elemen: "Pengukuran",
      kompetensi: "Volume bangun ruang sisi datar dengan memperhitungkan ketebalan dinding",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Sebuah kotak perkakas berbentuk balok tertutup dibuat dari papan kayu dengan ketebalan $1\\text{ cm}$ pada seluruh sisinya. Ukuran luar kotak tersebut adalah: panjang $32\\text{ cm}$, lebar $22\\text{ cm}$, dan tinggi $16\\text{ cm}$. Volume ruang kosong di bagian dalam kotak tersebut adalah...`,
      gambar: null,
      opsi: [
        { label: "A", text: `$7.840\\text{ cm}^3$` },
        { label: "B", text: `$8.400\\text{ cm}^3$` },
        { label: "C", text: `$9.600\\text{ cm}^3$` },
        { label: "D", text: `$11.264\\text{ cm}^3$` },
      ],
      kunci_jawaban: ["B"],
      pembahasan: `Langkah 1: Hitung ukuran bagian dalam balok (dikurangi 2 kali tebal dinding 1 cm):\n$p_{\\text{dalam}} = 32 - 2(1) = 30\\text{ cm}$,\n$l_{\\text{dalam}} = 22 - 2(1) = 20\\text{ cm}$,\n$t_{\\text{dalam}} = 16 - 2(1) = 14\\text{ cm}$.\nLangkah 2: Hitung volume bagian dalam: $V = 30 \\times 20 \\times 14 = 8.400\\text{ cm}^3$.\n$\\therefore$ Pilihan yang benar adalah B.`,
    },

    // --- SLOT 10: PG, Tunggal, Sedang (Skala Peta & Selisih Jarak Tempuh Dua Rute) ---
    {
      jenjang,
      mapel,
      elemen: "Bilangan",
      sub_elemen: jenjang.includes("SMP") ? "Bilangan Real" : "Bilangan Rasional",
      kompetensi: "Skala dan perbandingan jarak tempuh pada peta",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Sebuah peta jalur ekspedisi dibuat dengan skala $1 : 1.500.000$. Jarak pada peta tertera sebagai berikut:\n- Kota A ke posko P = $3\\text{ cm}$\n- Posko P ke kota B = $2\\text{ cm}$\n- Kota A ke posko Q = $2\\text{ cm}$\n- Posko Q ke kota B = $2,5\\text{ cm}$\n\nKurir 1 mengantarkan barang dari kota A ke kota B melalui posko P, sedangkan Kurir 2 melalui posko Q. Selisih jarak tempuh sebenarnya antara Kurir 1 dan Kurir 2 adalah...`,
      gambar: null,
      opsi: [
        { label: "A", text: `$5,0\\text{ km}$` },
        { label: "B", text: `$7,5\\text{ km}$` },
        { label: "C", text: `$10,0\\text{ km}$` },
        { label: "D", text: `$15,0\\text{ km}$` },
      ],
      kunci_jawaban: ["B"],
      pembahasan: `Langkah 1: Hitung total jarak peta rute 1 (A-P-B): $3 + 2 = 5\\text{ cm}$.\nLangkah 2: Hitung total jarak peta rute 2 (A-Q-B): $2 + 2,5 = 4,5\\text{ cm}$.\nLangkah 3: Hitung selisih jarak peta: $5 - 4,5 = 0,5\\text{ cm}$.\nLangkah 4: Konversi ke jarak sebenarnya: $0,5 \\times 1.500.000\\text{ cm} = 750.000\\text{ cm} = 7,5\\text{ km}$.\n$\\therefore$ Pilihan yang benar adalah B.`,
    },

    // --- SLOT 11: PG, Tunggal, Sedang (Perbandingan Berbalik Nilai Pekerja Tambahan) ---
    {
      jenjang,
      mapel,
      elemen: "Bilangan",
      sub_elemen: jenjang.includes("SMP") ? "Bilangan Real" : "Bilangan Rasional",
      kompetensi: "Perbandingan berbalik nilai pada efisiensi waktu kerja",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Proyek perbaikan gedung serbaguna ditargetkan selesai dalam waktu $30$ hari dengan mempekerjakan $15$ orang tukang. Setelah pekerjaan berjalan selama $6$ hari, pekerjaan terpaksa dihentikan selama $4$ hari karena kendala pengiriman semen. Jika kemampuan kerja setiap tukang dianggap sama, banyak pekerja tambahan yang harus ditugaskan agar proyek tetap selesai tepat waktu adalah...`,
      gambar: null,
      opsi: [
        { label: "A", text: `$2\\text{ orang}$` },
        { label: "B", text: `$3\\text{ orang}$` },
        { label: "C", text: `$5\\text{ orang}$` },
        { label: "D", text: `$6\\text{ orang}$` },
      ],
      kunci_jawaban: ["B"],
      pembahasan: `Langkah 1: Hitung sisa beban hari kerja semula: $30 - 6 = 24\\text{ hari}$.\nBeban kerja tersisa $= 24 \\times 15 = 360\\text{ orang-hari}$.\nLangkah 2: Hitung sisa waktu efektif pelaksanaan: $24 - 4 = 20\\text{ hari}$.\nLangkah 3: Tentukan pekerja yang dibutuhkan: $\\frac{360}{20} = 18\\text{ orang}$.\nLangkah 4: Hitung pekerja tambahan: $18 - 15 = 3\\text{ orang}$.\n$\\therefore$ Pilihan yang benar adalah B.`,
    },

    // --- SLOT 12: PG, Tunggal, Sedang (Rata-Rata Gabungan Nilai Siswa) ---
    {
      jenjang,
      mapel,
      elemen: "Data",
      sub_elemen: "Penyajian dan Penggunaan Data",
      kompetensi: "Menghitung rata-rata nilai gabungan dua kelompok siswa",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Nilai rata-rata ulangan matematika dari suatu kelas yang terdiri atas $28$ orang siswa adalah $75$. Jika ada $2$ orang siswa pindahan yang nilainya digabungkan dengan rata-rata nilai kedua anak tersebut adalah $85$, maka nilai rata-rata ulangan matematika kelas tersebut saat ini adalah...`,
      gambar: null,
      opsi: [
        { label: "A", text: `$75,50$` },
        { label: "B", text: `$75,67$` },
        { label: "C", text: `$76,00$` },
        { label: "D", text: `$76,25$` },
      ],
      kunci_jawaban: ["B"],
      pembahasan: `Langkah 1: Hitung total nilai semula: $28 \\times 75 = 2.100$.\nLangkah 2: Hitung total nilai tambahan 2 siswa: $2 \\times 85 = 170$.\nLangkah 3: Hitung total nilai gabungan: $2.100 + 170 = 2.270$.\nLangkah 4: Hitung rata-rata baru untuk 30 siswa: $\\bar{x}_{\\text{baru}} = \\frac{2.270}{30} = 75,67$.\n$\\therefore$ Pilihan yang benar adalah B.`,
    },

    // --- SLOT 13: PG, Tunggal, Tinggi (SPLDV Tarif Tiket Wahana Sains) ---
    {
      jenjang,
      mapel,
      elemen: "Aljabar",
      sub_elemen: jenjang.includes("SMP") ? "Persamaan dan Pertidaksamaan Linier" : "Operasi Aljabar",
      kompetensi: "Pemodelan dan penyelesaian Sistem Persamaan Linear Dua Variabel",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "tinggi",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Di sebuah museum edukasi antariksa, harga tanda masuk untuk $2$ orang dewasa dan $3$ orang anak-anak adalah Rp $105.000,00$, sedangkan harga tiket masuk untuk $1$ orang dewasa dan $2$ orang anak-anak adalah Rp $60.000,00$. Jika Pak Hendra mengajak keluarga yang terdiri atas $3$ orang dewasa dan $1$ orang anak-anak, berapakah total biaya tiket yang harus dibayar?`,
      gambar: null,
      opsi: [
        { label: "A", text: `Rp $90.000,00$` },
        { label: "B", text: `Rp $95.000,00$` },
        { label: "C", text: `Rp $105.000,00$` },
        { label: "D", text: `Rp $115.000,00$` },
      ],
      kunci_jawaban: ["C"],
      pembahasan: `Langkah 1: Bentuk model matematika (d = dewasa, a = anak):\n(1) $2d + 3a = 105.000$\n(2) $d + 2a = 60.000 \\implies d = 60.000 - 2a$\nLangkah 2: Substitusikan ke persamaan (1):\n$2(60.000 - 2a) + 3a = 105.000 \\implies 120.000 - a = 105.000 \\implies a = 15.000$.\n$d = 60.000 - 2(15.000) = 30.000$.\nLangkah 3: Hitung tiket 3 dewasa dan 1 anak: $3(30.000) + 1(15.000) = 90.000 + 15.000 = \\text{Rp}105.000,00$.\n$\\therefore$ Pilihan yang benar adalah C.`,
    },

    // --- SLOT 14: PG, Tunggal, Tinggi (Kecepatan Rata-Rata dengan Istirahat) ---
    {
      jenjang,
      mapel,
      elemen: "Geometri dan Pengukuran",
      sub_elemen: "Pengukuran",
      kompetensi: "Menghitung kecepatan rata-rata dan waktu tempuh beristirahat",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "tinggi",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Pak Doni mengendarai mobil dari kota X ke kota Y yang berjarak $180\\text{ km}$. Beliau berangkat pukul $07.00$ dengan kecepatan rata-rata $60\\text{ km/jam}$. Di perjalanan, beliau sempat beristirahat di rest area selama $30\\text{ menit}$. Pada pukul berapakah Pak Doni tiba di kota Y?`,
      gambar: null,
      opsi: [
        { label: "A", text: `Pukul $09.30$` },
        { label: "B", text: `Pukul $10.00$` },
        { label: "C", text: `Pukul $10.30$` },
        { label: "D", text: `Pukul $11.00$` },
      ],
      kunci_jawaban: ["C"],
      pembahasan: `Langkah 1: Hitung waktu bergerak murni: $t = \\frac{s}{v} = \\frac{180}{60} = 3\\text{ jam}$.\nLangkah 2: Tambahkan waktu istirahat: $3\\text{ jam} + 30\\text{ menit} = 3\\text{ jam } 30\\text{ menit}$.\nLangkah 3: Waktu tiba: $07.00 + 03.30 = 10.30$.\n$\\therefore$ Pilihan yang benar adalah C.`,
    },

    // --- SLOT 15: PG, Tunggal, Tinggi (Diskon Bertingkat & Pembelian Buku) ---
    {
      jenjang,
      mapel,
      elemen: "Bilangan",
      sub_elemen: jenjang.includes("SMP") ? "Bilangan Real" : "Bilangan Rasional",
      kompetensi: "Penerapan diskon ganda bertingkat dan perhitungan harga akhir",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "tinggi",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Sebuah toko buku memberikan promo diskon bertingkat untuk pembeli grosir sebesar $20\\% + 10\\%$. Artinya, harga barang didiskon $20\\%$ terlebih dahulu, kemudian harga setelah diskon tersebut didiskon lagi sebesar $10\\%$. Jika harga label satu set ensiklopedia adalah Rp $500.000,00$, berapakah harga yang harus dibayar oleh pembeli?`,
      gambar: null,
      opsi: [
        { label: "A", text: `Rp $350.000,00$` },
        { label: "B", text: `Rp $360.000,00$` },
        { label: "C", text: `Rp $375.000,00$` },
        { label: "D", text: `Rp $400.000,00$` },
      ],
      kunci_jawaban: ["B"],
      pembahasan: `Langkah 1: Hitung harga setelah diskon pertama (20\\%): $500.000 - (0,20 \\times 500.000) = \\text{Rp}400.000,00$.\nLangkah 2: Hitung harga setelah diskon kedua (10\\% dari 400.000): $400.000 - (0,10 \\times 400.000) = \\text{Rp}360.000,00$.\n$\\therefore$ Pilihan yang benar adalah B.`,
    },

    // --- SLOT 16: PGK_MCMA, Tunggal, Rendah (Sifat Faktorisasi Prima & Keterbagian) ---
    {
      jenjang,
      mapel,
      elemen: "Bilangan",
      sub_elemen: jenjang.includes("SMP") ? "Bilangan Real" : "Bilangan Rasional",
      kompetensi: "Analisis sifat faktorisasi prima dan kelipatan bilangan",
      level_kognitif: "Pengetahuan dan Pemahaman",
      tingkat_kesulitan: "rendah",
      bentuk_soal: "PGK_MCMA",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Diberikan bilangan bulat $N = 72$. Pilihlah SEMUA pernyataan matematika di bawah ini yang bernilai benar mengenai bilangan $N$:`,
      gambar: null,
      opsi: [
        { label: "A", text: `Faktorisasi prima dari $N$ adalah $2^3 \\times 3^2$.` },
        { label: "B", text: `$N$ memiliki total $12$ faktor positif.` },
        { label: "C", text: `$N$ habis dibagi oleh bilangan $16$.` },
        { label: "D", text: `Selisih antara faktor prima terbesar dan terkecil dari $N$ adalah $5$.` },
      ],
      kunci_jawaban: ["A", "B"],
      pembahasan: `Uji Pernyataan:\n- A: $72 = 8 \\times 9 = 2^3 \\times 3^2$ (Benar).\n- B: Banyak faktor $= (3+1)(2+1) = 4 \\times 3 = 12$ (Benar).\n- C: $72 : 16 = 4,5$ (Salah, tidak habis dibagi).\n- D: Faktor prima dari $72$ adalah $2$ dan $3$. Selisihnya adalah $3 - 2 = 1$, bukan $5$ (Salah).\n$\\therefore$ Kunci jawaban yang benar: A dan B.`,
    },

    // --- SLOT 17: PGK_MCMA, Tunggal, Rendah (Konversi Satuan Baku) ---
    {
      jenjang,
      mapel,
      elemen: "Geometri dan Pengukuran",
      sub_elemen: "Pengukuran",
      kompetensi: "Kesetaraan hubungan antar-satuan baku volume dan massa",
      level_kognitif: "Pengetahuan dan Pemahaman",
      tingkat_kesulitan: "rendah",
      bentuk_soal: "PGK_MCMA",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Di laboratorium sekolah terdapat beberapa wadah cairan kimia. Pilihlah SEMUA konversi satuan baku di bawah ini yang bernilai setara:`,
      gambar: null,
      opsi: [
        { label: "A", text: `$2,5\\text{ liter} = 2.500\\text{ ml}$` },
        { label: "B", text: `$3\\text{ m}^3 = 300\\text{ dm}^3$` },
        { label: "C", text: `$450\\text{ gram} = 4,5\\text{ kg}$` },
        { label: "D", text: `$1\\text{ dm}^3 = 100\\text{ cm}^3$` },
      ],
      kunci_jawaban: ["A"],
      pembahasan: `Analisis Konversi:\n- A: $1\\text{ liter} = 1.000\\text{ ml} \\implies 2,5\\text{ liter} = 2.500\\text{ ml}$ (Benar).\n- B: $1\\text{ m}^3 = 1.000\\text{ dm}^3 \\implies 3\\text{ m}^3 = 3.000\\text{ dm}^3$, bukan $300\\text{ dm}^3$ (Salah).\n- C: $450\\text{ gram} = 0,45\\text{ kg}$, bukan $4,5\\text{ kg}$ (Salah).\n- D: $1\\text{ dm}^3 = 1.000\\text{ cm}^3$, bukan $100\\text{ cm}^3$ (Salah).\n$\\therefore$ Kunci jawaban yang benar hanya A.`,
    },

    // --- SLOT 18: PGK_MCMA, Grup stim-01, Sedang (Analisis Pendapatan dari Tabel Koperasi) ---
    {
      jenjang,
      mapel,
      elemen: "Data",
      sub_elemen: "Penyajian dan Penggunaan Data",
      kompetensi: "Memvalidasi beberapa kesimpulan dari data tabel penjualan koperasi",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_MCMA",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Berdasarkan data tabel penjualan Koperasi Siswa Mandiri pada stimulus, pilihlah SEMUA pernyataan di bawah ini yang bernilai benar:`,
      gambar: null,
      opsi: [
        { label: "A", text: `Pendapatan kotor tertinggi terjadi pada hari Rabu sebesar Rp $310.000,00$.` },
        { label: "B", text: `Selisih pendapatan kotor antara hari Jumat dan hari Selasa adalah Rp $55.000,00$.` },
        { label: "C", text: `Pendapatan kotor pada hari Kamis lebih besar dibandingkan pendapatan pada hari Selasa.` },
        { label: "D", text: `Total pendapatan kotor koperasi selama $5$ hari sekolah mencapai Rp $1.245.000,00$.` },
      ],
      kunci_jawaban: ["A", "B", "D"],
      pembahasan: `Pemeriksaan Tabel:\n- A: Hari Rabu $= 310.000$ (tertinggi) (Benar).\n- B: Jumat $= 275.000$, Selasa $= 220.000 \\implies 275.000 - 220.000 = 55.000$ (Benar).\n- C: Kamis $= 195.000 < \\text{Selasa } (220.000)$ (Salah).\n- D: Total $= 245.000 + 220.000 + 310.000 + 195.000 + 275.000 = 1.245.000$ (Benar).\n$\\therefore$ Kunci jawaban yang tepat: A, B, D.`,
    },

    // --- SLOT 19: PGK_MCMA, Grup stim-01, Sedang (Analisis Kuantitas Barang Koperasi) ---
    {
      jenjang,
      mapel,
      elemen: "Data",
      sub_elemen: "Penyajian dan Penggunaan Data",
      kompetensi: "Interpretasi kuantitas barang dari tabel stimulus",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_MCMA",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Berdasarkan rincian barang terjual pada tabel stimulus, pilihlah SEMUA pernyataan yang bernilai benar:`,
      gambar: null,
      opsi: [
        { label: "A", text: `Jumlah buku tulis yang terjual pada hari Rabu merupakan yang terbanyak dalam sepekan.` },
        { label: "B", text: `Pensil 2B terjual paling sedikit pada hari Kamis.` },
        { label: "C", text: `Total penggaris yang terjual selama sepekan adalah $100\\text{ pcs}$.` },
        { label: "D", text: `Kuantitas pensil 2B yang terjual pada hari Senin lebih banyak daripada hari Jumat.` },
      ],
      kunci_jawaban: ["A", "B"],
      pembahasan: `Verifikasi Data:\n- A: Buku tulis Rabu $= 50\\text{ pcs}$ (paling tinggi) (Benar).\n- B: Pensil Kamis $= 15\\text{ pcs}$ (paling sedikit) (Benar).\n- C: Total penggaris $= 15 + 10 + 25 + 20 + 10 = 80\\text{ pcs}$, bukan 100 pcs (Salah).\n- D: Pensil Senin ($25\\text{ pcs}$) < Pensil Jumat ($40\\text{ pcs}$) (Salah).\n$\\therefore$ Kunci jawaban: A dan B.`,
    },

    // --- SLOT 20: PGK_MCMA, Grup stim-01, Sedang (Analisis Keuntungan & Dana Sosial) ---
    {
      jenjang,
      mapel,
      elemen: "Bilangan",
      sub_elemen: jenjang.includes("SMP") ? "Bilangan Real" : "Bilangan Rasional",
      kompetensi: "Perhitungan komparatif keuntungan bersih dan dana sosial dari tabel",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_MCMA",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Perhatikan aturan alokasi keuntungan koperasi pada stimulus. Pilihlah SEMUA pernyataan yang bernilai benar:`,
      gambar: null,
      opsi: [
        { label: "A", text: `Keuntungan bersih koperasi pada hari Senin adalah Rp $49.000,00$.` },
        { label: "B", text: `Dana sosial yang disisihkan pada hari Kamis adalah Rp $3.900,00$.` },
        { label: "C", text: `Total keuntungan bersih koperasi selama $5$ hari adalah Rp $249.000,00$.` },
        { label: "D", text: `Dana sosial hari Selasa lebih besar daripada dana sosial hari Jumat.` },
      ],
      kunci_jawaban: ["A", "B", "C"],
      pembahasan: `Perhitungan:\n- A: Senin: $20\\% \\times 245.000 = 49.000$ (Benar).\n- B: Kamis: Pendapatan $= 195.000 \\implies$ Untung $= 39.000 \\implies$ Dana sosial $= 10\\% \\times 39.000 = 3.900$ (Benar).\n- C: Total untung bersih $= 20\\% \\times 1.245.000 = 249.000$ (Benar).\n- D: Dana sosial Selasa $= 10\\% \\times 44.000 = 4.400$; Jumat $= 5.500$. Jadi Selasa < Jumat (Salah).\n$\\therefore$ Kunci jawaban: A, B, C.`,
    },

    // --- SLOT 21: PGK_MCMA, Grup stim-01, Sedang (Perbandingan Penjualan Harian) ---
    {
      jenjang,
      mapel,
      elemen: "Data",
      sub_elemen: "Penyajian dan Penggunaan Data",
      kompetensi: "Analisis perbandingan proporsi penjualan barang koperasi",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_MCMA",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Berdasarkan perbandingan kuantitas barang yang terjual di Koperasi Siswa Mandiri, pilihlah SEMUA pernyataan yang bernilai benar:`,
      gambar: null,
      opsi: [
        { label: "A", text: `Pada hari Senin, penjualan buku tulis ($40\\text{ pcs}$) lebih banyak daripada gabungan pensil dan penggaris ($40\\text{ pcs}$).` },
        { label: "B", text: `Penjualan penggaris paling tinggi terjadi pada hari Rabu sebanyak $25\\text{ pcs}$.` },
        { label: "C", text: `Total penjualan pensil 2B selama sepekan adalah $130\\text{ pcs}$.` },
        { label: "D", text: `Rata-rata penjualan pensil 2B per hari selama sepekan adalah $30\\text{ pcs}$.` },
      ],
      kunci_jawaban: ["B", "C"],
      pembahasan: `Pemeriksaan:\n- A: Pensil ($25$) + Penggaris ($15$) $= 40$. Jadi jumlahnya sama persis, bukan lebih banyak (Salah).\n- B: Penggaris Rabu $= 25$ (tertinggi) (Benar).\n- C: Total pensil $= 25 + 30 + 20 + 15 + 40 = 130$ (Benar).\n- D: Rata-rata pensil $= 130 : 5 = 26\\text{ pcs}$, bukan 30 pcs (Salah).\n$\\therefore$ Kunci jawaban: B dan C.`,
    },

    // --- SLOT 22: PGK_MCMA, Tunggal, Tinggi (Sifat Geometri Bangun Ruang & Jaring-Jaring) ---
    {
      jenjang,
      mapel,
      elemen: "Geometri dan Pengukuran",
      sub_elemen: "Objek Geometri",
      kompetensi: "Karakteristik rusuk, sisi, dan jaring-jaring bangun ruang prisma",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "tinggi",
      bentuk_soal: "PGK_MCMA",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Diberikan sebuah prisma tegak segitiga siku-siku. Pilihlah SEMUA pernyataan geometri berikut yang bernilai benar mengenai prisma tersebut:`,
      gambar: null,
      opsi: [
        { label: "A", text: `Prisma tersebut memiliki $5$ bidang sisi, $9$ rusuk, dan $6$ titik sudut.` },
        { label: "B", text: `Dua bidang sisi alas dan tutupnya memiliki bentuk dan ukuran yang kongruen.` },
        { label: "C", text: `Semua bidang sisi tegaknya selalu berbentuk persegi yang memiliki ukuran sama persis.` },
        { label: "D", text: `Jika panjang sisi siku-siku alas adalah $6\\text{ cm}$ dan $8\\text{ cm}$, maka keliling bidang alasnya adalah $24\\text{ cm}$.` },
      ],
      kunci_jawaban: ["A", "B", "D"],
      pembahasan: `Analisis Sifat Prisma Segitiga:\n- A: Memiliki 5 sisi, 9 rusuk, 6 titik sudut (Benar).\n- B: Sisi alas dan tutup prisma selalu kongruen (Benar).\n- C: Sisi tegak berbentuk persegi panjang dengan lebar sesuai panjang sisi alas segitiga siku-siku, sehingga tidak selalu sama ukurannya (Salah).\n- D: Hipotenusa $= \\sqrt{6^2 + 8^2} = 10\\text{ cm} \\implies$ Keliling $= 6 + 8 + 10 = 24\\text{ cm}$ (Benar).\n$\\therefore$ Kunci jawaban: A, B, D.`,
    },

    // --- SLOT 23: PGK_MCMA, Tunggal, Tinggi (Pertidaksamaan Linear Kontekstual) ---
    {
      jenjang,
      mapel,
      elemen: "Aljabar",
      sub_elemen: jenjang.includes("SMP") ? "Persamaan dan Pertidaksamaan Linier" : "Operasi Aljabar",
      kompetensi: "Menyelesaikan pertidaksamaan linear satu variabel kontekstual muatan",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "tinggi",
      bentuk_soal: "PGK_MCMA",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Sebuah mobil bak terbuka memiliki daya angkut maksimum $800\\text{ kg}$. Pak Rahmat sebagai sopir memiliki berat badan $65\\text{ kg}$ dan akan mengangkut sejumlah kotak sembako yang masing-masing beratnya $25\\text{ kg}$. Jika $x$ menyatakan banyak kotak sembako yang dapat diangkut dalam satu kali perjalanan, pilihlah SEMUA pernyataan yang bernilai benar:`,
      gambar: null,
      opsi: [
        { label: "A", text: `Model pertidaksamaan dari permasalahan tersebut adalah $25x + 65 \\le 800$.` },
        { label: "B", text: `Banyak kotak sembako maksimal yang dapat diangkut adalah $29$ kotak.` },
        { label: "C", text: `Jika Pak Rahmat membawa $30$ kotak sembako, mobil tersebut mengalami kelebihan muatan.` },
        { label: "D", text: `Berat total muatan kotak sembako maksimum yang aman diangkut adalah $725\\text{ kg}$.` },
      ],
      kunci_jawaban: ["A", "B", "C", "D"],
      pembahasan: `Langkah 1: Bentuk model pertidaksamaan: $25x + 65 \\le 800$ (Pernyataan A Benar).\nLangkah 2: Selesaikan: $25x \\le 735 \\implies x \\le 29,4$.\nKarena jumlah kotak harus berupa bilangan bulat, maka $x_{\\text{maks}} = 29\\text{ kotak}$ (Pernyataan B Benar).\nLangkah 3: Uji 30 kotak: $25(30) + 65 = 750 + 65 = 815\\text{ kg} > 800\\text{ kg}$ (Pernyataan C Benar).\n- Pernyataan D Benar karena $29 \\times 25\\text{ kg} = 725\\text{ kg} \\le 735\\text{ kg}$.\n$\\therefore$ Kunci jawaban: A, B, C, D (Semua Benar).`,
    },

    // --- SLOT 24: PGK_KATEGORI, Grup stim-01, Sedang (Evaluasi Target Koperasi) ---
    {
      jenjang,
      mapel,
      elemen: "Data",
      sub_elemen: "Penyajian dan Penggunaan Data",
      kompetensi: "Mengevaluasi kesesuaian pernyataan target berdasarkan data stimulus",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_KATEGORI",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Pengurus koperasi menargetkan pendapatan kotor harian minimal adalah Rp $200.000,00$. Tentukan apakah setiap pernyataan berikut bernilai Sesuai atau Tidak Sesuai berdasarkan data tabel stimulus:`,
      gambar: null,
      pernyataan: [
        { no: 1, text: "Pendapatan kotor pada hari Senin, Selasa, Rabu, dan Jumat berhasil melampaui target minimal koperasi." },
        { no: 2, text: "Hari Kamis merupakan satu-satunya hari di mana target minimal pendapatan koperasi tidak tercapai." },
        { no: 3, text: "Rata-rata pendapatan harian koperasi selama 5 hari belum mencapai target minimal yang ditetapkan." },
      ],
      kategori_respons: ["Sesuai", "Tidak Sesuai"],
      kunci_jawaban: ["Sesuai", "Sesuai", "Tidak Sesuai"],
      pembahasan: `1. Senin (245rb), Selasa (220rb), Rabu (310rb), Jumat (275rb) semuanya > 200rb (Sesuai).\n2. Kamis (195rb) adalah satu-satunya hari < 200rb (Sesuai).\n3. Rata-rata pendapatan harian $= 1.245.000 / 5 = \\text{Rp}249.000,00 > 200.000$ (sehingga pernyataan belum mencapai target adalah Tidak Sesuai).`,
    },

    // --- SLOT 25: PGK_KATEGORI, Grup stim-01, Sedang (Verifikasi Dana Sosial Koperasi) ---
    {
      jenjang,
      mapel,
      elemen: "Bilangan",
      sub_elemen: jenjang.includes("SMP") ? "Bilangan Real" : "Bilangan Rasional",
      kompetensi: "Memvalidasi kebenaran perhitungan dana sosial dari data tabel",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_KATEGORI",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Tentukan apakah setiap pernyataan berikut mengenai perolehan dana sosial koperasi bernilai Benar atau Salah:`,
      gambar: null,
      pernyataan: [
        { no: 1, text: "Besar dana sosial yang disisihkan pada hari Senin adalah Rp4.900,00." },
        { no: 2, text: "Total dana sosial yang terkumpul selama 5 hari sekolah mencapai Rp24.900,00." },
        { no: 3, text: "Dana sosial pada hari Rabu lebih kecil dibandingkan dana sosial pada hari Selasa." },
      ],
      kategori_respons: ["Benar", "Salah"],
      kunci_jawaban: ["Benar", "Benar", "Salah"],
      pembahasan: `1. Senin: Untung $= 49.000 \\implies$ Dana sosial $= 10\\% \\times 49.000 = \\text{Rp}4.900,00$ (Benar).\n2. Total dana sosial $= 10\\% \\times 249.000 = \\text{Rp}24.900,00$ (Benar).\n3. Dana sosial Rabu (Rp6.200) > Selasa (Rp4.400), maka pernyataan lebih kecil adalah Salah.`,
    },

    // --- SLOT 26: PGK_KATEGORI, Tunggal, Sedang (Sudut Berpenyiku & Berpelurus) ---
    {
      jenjang,
      mapel,
      elemen: "Geometri dan Pengukuran",
      sub_elemen: "Objek Geometri",
      kompetensi: "Hubungan antar-sudut berpelurus dan berpenyiku",
      level_kognitif: "Pengetahuan dan Pemahaman",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_KATEGORI",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Diberikan dua buah sudut saling berpenyiku (komplementer) $\\angle A$ dan $\\angle B$ dengan perbandingan besar sudut $2 : 3$. Tentukan apakah setiap pernyataan berikut bernilai Benar atau Salah:`,
      gambar: null,
      pernyataan: [
        { no: 1, text: "Jumlah besar sudut A dan sudut B adalah 90 derajat." },
        { no: 2, text: "Besar sudut A adalah 36 derajat." },
        { no: 3, text: "Pelurus dari sudut B adalah 126 derajat." },
      ],
      kategori_respons: ["Benar", "Salah"],
      kunci_jawaban: ["Benar", "Benar", "Benar"],
      pembahasan: `1. Sudut berpenyiku berjumlah $90^\\circ$ (Benar).\n2. $\\angle A = \\frac{2}{2+3} \\times 90^\\circ = \\frac{2}{5} \\times 90^\\circ = 36^\\circ$ (Benar).\n3. $\\angle B = 90^\\circ - 36^\\circ = 54^\\circ$. Pelurus $\\angle B = 180^\\circ - 54^\\circ = 126^\\circ$ (Benar).`,
    },

    // --- SLOT 27: PGK_KATEGORI, Tunggal, Sedang (Peluang Kejadian Tunggal) ---
    {
      jenjang,
      mapel,
      elemen: "Data dan Peluang",
      sub_elemen: "Peluang",
      kompetensi: "Penentuan peluang teoritis pada pelemparan sebuah dadu",
      level_kognitif: "Pengetahuan dan Pemahaman",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_KATEGORI",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Sebuah dadu bermata enam yang seimbang dilempar undi sebanyak satu kali. Tentukan apakah setiap pernyataan nilai peluang berikut bernilai Benar atau Salah:`,
      gambar: null,
      pernyataan: [
        { no: 1, text: "Peluang munculnya mata dadu bilangan prima adalah 1/2." },
        { no: 2, text: "Peluang munculnya mata dadu faktor dari 6 adalah 2/3." },
        { no: 3, text: "Peluang munculnya mata dadu lebih dari 4 adalah 1/3." },
      ],
      kategori_respons: ["Benar", "Salah"],
      kunci_jawaban: ["Benar", "Benar", "Benar"],
      pembahasan: `1. Bilangan prima pada dadu: {2, 3, 5} -> $P = 3/6 = 1/2$ (Benar).\n2. Faktor dari 6: {1, 2, 3, 6} -> $P = 4/6 = 2/3$ (Benar).\n3. Mata dadu > 4: {5, 6} -> $P = 2/6 = 1/3$ (Benar).`,
    },

    // --- SLOT 28: PGK_KATEGORI, Tunggal, Sedang (Konversi Kecepatan & Debit) ---
    {
      jenjang,
      mapel,
      elemen: "Geometri dan Pengukuran",
      sub_elemen: "Pengukuran",
      kompetensi: "Konversi satuan laju perubahan kecepatan dan debit air",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_KATEGORI",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Tentukan apakah setiap pernyataan konversi laju perubahan berikut bernilai Benar atau Salah:`,
      gambar: null,
      pernyataan: [
        { no: 1, text: "Kecepatan 72 km/jam setara dengan 20 m/detik." },
        { no: 2, text: "Debit aliran air 120 liter/menit setara dengan 2 liter/detik." },
        { no: 3, text: "Kecepatan 54 km/jam setara dengan 25 m/detik." },
      ],
      kategori_respons: ["Benar", "Salah"],
      kunci_jawaban: ["Benar", "Benar", "Salah"],
      pembahasan: `1. $72 \\times \\frac{1.000}{3.600} = 20\\text{ m/s}$ (Benar).\n2. $120 / 60 = 2\\text{ liter/detik}$ (Benar).\n3. $54 \\times \\frac{1.000}{3.600} = 15\\text{ m/s}$, bukan 25 m/s (Salah).`,
    },

    // --- SLOT 29: PGK_KATEGORI, Tunggal, Tinggi (Validasi Teorema Pythagoras) ---
    {
      jenjang,
      mapel,
      elemen: "Geometri dan Pengukuran",
      sub_elemen: "Objek Geometri",
      kompetensi: "Pemeriksaan tripel Pythagoras dan jenis segitiga",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "tinggi",
      bentuk_soal: "PGK_KATEGORI",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Tentukan apakah setiap pernyataan berikut mengenai kelompok ukuran panjang sisi segitiga bernilai Benar atau Salah:`,
      gambar: null,
      pernyataan: [
        { no: 1, text: "Segitiga dengan panjang sisi 7 cm, 24 cm, dan 25 cm adalah segitiga siku-siku." },
        { no: 2, text: "Segitiga dengan panjang sisi 8 cm, 15 cm, dan 17 cm merupakan tripel Pythagoras." },
        { no: 3, text: "Segitiga dengan panjang sisi 9 cm, 12 cm, dan 16 cm adalah segitiga siku-siku." },
      ],
      kategori_respons: ["Benar", "Salah"],
      kunci_jawaban: ["Benar", "Benar", "Salah"],
      pembahasan: `1. $7^2 + 24^2 = 49 + 576 = 625 = 25^2$ (Benar, siku-siku).\n2. $8^2 + 15^2 = 64 + 225 = 289 = 17^2$ (Benar, tripel Pythagoras).\n3. $9^2 + 12^2 = 81 + 144 = 225 \\ne 16^2 (256)$ (Salah, segitiga tumpul).`,
    },

    // --- SLOT 30: PGK_KATEGORI, Tunggal, Tinggi (Pola Bilangan Bertingkat) ---
    {
      jenjang,
      mapel,
      elemen: "Aljabar",
      sub_elemen: "Barisan dan Deret",
      kompetensi: "Menganalisis barisan aritmatika dan rumus suku ke-n",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "tinggi",
      bentuk_soal: "PGK_KATEGORI",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Diberikan barisan bilangan aritmatika: $4, 7, 10, 13, 16, \\dots$. Tentukan apakah setiap pernyataan berikut bernilai Benar atau Salah:`,
      gambar: null,
      pernyataan: [
        { no: 1, text: "Beda (selisih antarsuku) dari barisan tersebut adalah 3." },
        { no: 2, text: "Rumus suku ke-n (Un) barisan tersebut adalah Un = 3n + 1." },
        { no: 3, text: "Nilai suku ke-20 (U20) barisan tersebut adalah 65." },
      ],
      kategori_respons: ["Benar", "Salah"],
      kunci_jawaban: ["Benar", "Benar", "Salah"],
      pembahasan: `1. Beda $b = 7 - 4 = 3$ (Benar).\n2. $U_n = a + (n-1)b = 4 + 3(n-1) = 3n + 1$ (Benar).\n3. $U_{20} = 3(20) + 1 = 61$, bukan 65 (Salah).`,
    },
  ];

  // ==========================================
  // 3. BANK SOAL BAHASA INDONESIA (STANDAR PUSMENDIK)
  // ==========================================
  const bahasaQuestions: any[] = [
    // --- SLOT 1: PG, Tunggal, Rendah ---
    {
      jenjang,
      mapel,
      elemen: "Pemahaman Tekstual",
      sub_elemen: "Informasi Tersurat",
      kompetensi: "Mengidentifikasi informasi penting yang tersurat dalam teks",
      level_kognitif: "Pemahaman Tekstual",
      tingkat_kesulitan: "rendah",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: `Cermatilah kalimat berikut:\n"Komodo (*Varanus komodoensis*) merupakan spesies kadal terbesar di dunia yang hidup secara alami di Kepulauan Nusa Tenggara Timur."\n\nInformasi tersurat yang sesuai dengan kutipan kalimat di atas adalah...`,
      gambar: null,
      opsi: [
        { label: "A", text: "Komodo adalah jenis reptil terkecil yang ada di Indonesia." },
        { label: "B", text: "Habitat asli komodo berada di Kepulauan Nusa Tenggara Timur." },
        { label: "C", text: "Komodo dapat hidup bebas di seluruh pulau di kepulauan Indonesia." },
        { label: "D", text: "Komodo merupakan hewan pemangsa yang hanya hidup di kawasan air payau." },
      ],
      kunci_jawaban: ["B"],
      pembahasan: "Informasi tersurat pada teks menyatakan secara eksplisit bahwa komodo hidup secara alami di Kepulauan Nusa Tenggara Timur (Pilihan B).",
    },

    // --- SLOT 2: PG, Grup stim-01, Sedang ---
    {
      jenjang,
      mapel,
      elemen: "Pemahaman Tekstual",
      sub_elemen: "Informasi Tersurat",
      kompetensi: "Mengidentifikasi tujuan kegiatan konservasi dari teks bacaan",
      level_kognitif: "Pemahaman Tekstual",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Berdasarkan teks bacaan pada stimulus, apa fungsi utama dari akar tunjang pohon mangrove bagi satwa perairan di muara?`,
      gambar: null,
      opsi: [
        { label: "A", text: "Sebagai tempat rekreasi pemancingan komersial bagi para wisatawan pesisir." },
        { label: "B", text: "Sebagai tempat pemijahan dan perlindungan alami bagi bibit udang, kepiting, dan ikan kecil." },
        { label: "C", text: "Sebagai jalur transportasi kapal nelayan tradisional menuju laut lepas." },
        { label: "D", text: "Sebagai bahan baku pembuatan pupuk kimia pertanian warga desa." },
      ],
      kunci_jawaban: ["B"],
      pembahasan: "Paragraf pertama stimulus menyebutkan bahwa akar mangrove yang rapat dan kokoh berfungsi sebagai tempat pemijahan serta habitat alami bagi bibit udang, kepiting bakau, dan ikan kecil (Pilihan B).",
    },

    // --- SLOT 3: PG, Grup stim-01, Sedang ---
    {
      jenjang,
      mapel,
      elemen: "Pemahaman Inferensial",
      sub_elemen: "Hubungan Sebab-Akibat",
      kompetensi: "Menyimpulkan hubungan sebab-akibat tersirat dalam teks",
      level_kognitif: "Pemahaman Inferensial",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Mengapa hasil tangkapan nelayan tradisional di Desa Sukamaju meningkat setelah hutan mangrove direhabilitasi?`,
      gambar: null,
      opsi: [
        { label: "A", text: "Karena nelayan mendapat bantuan kapal bermotor dari pemerintah daerah." },
        { label: "B", text: "Karena daun mangrove yang gugur menyuburkan muara dan akar mangrove menjadi tempat berkembang biak ikan." },
        { label: "C", text: "Karena area konservasi mangrove diubah seluruhnya menjadi tambak udang intensif." },
        { label: "D", text: "Karena ombak laut pasang semakin deras menerjang daratan pantai." },
      ],
      kunci_jawaban: ["B"],
      pembahasan: "Secara inferensial, rehabilitasi mangrove menyediakan tempat pemijahan aman dan detritus daun yang menyuburkan perairan, sehingga populasi ikan meningkat dan hasil tangkapan nelayan bertambah 30% (Pilihan B).",
    },

    // --- SLOT 4: PGK_MCMA, Grup stim-01, Sedang ---
    {
      jenjang,
      mapel,
      elemen: "Pemahaman Inferensial",
      sub_elemen: "Gagasan Pokok dan Pendukung",
      kompetensi: "Menganalisis beberapa pernyataan yang sesuai dengan isi teks wacana",
      level_kognitif: "Pemahaman Inferensial",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_MCMA",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Berdasarkan teks bacaan konservasi mangrove pada stimulus, pilihlah SEMUA pernyataan yang bernilai benar:`,
      gambar: null,
      opsi: [
        { label: "A", text: "Hutan mangrove berfungsi melindungi garis pantai dari bahaya abrasi ombak laut." },
        { label: "B", text: "Warga desa menetapkan sanksi adat bagi siapa pun yang membuang sampah plastik di area konservasi." },
        { label: "C", text: "Kawasan hutan mangrove di Desa Sukamaju hanya boleh dikunjungi oleh peneliti asing." },
        { label: "D", text: "Kawasan hutan mangrove tersebut kini juga dikembangkan menjadi wahana ekowisata edukatif." },
      ],
      kunci_jawaban: ["A", "B", "D"],
      pembahasan: "Pernyataan A, B, dan D didukung langsung oleh teks. Pernyataan C keliru karena teks menyatakan kawasan terbuka bagi para pelajar dan ekowisata.",
    },

    // --- SLOT 5: PGK_KATEGORI, Grup stim-01, Sedang ---
    {
      jenjang,
      mapel,
      elemen: "Evaluasi dan Apresiasi",
      sub_elemen: "Penilaian Gagasan dan Fakta",
      kompetensi: "Menilai kesesuaian nilai moral dan fakta dalam teks bacaan",
      level_kognitif: "Evaluasi dan Apresiasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_KATEGORI",
      jenis_soal: "grup",
      stimulus_id_sementara: "stim-01",
      soal_text: `Tentukan apakah setiap pernyataan refleksi berikut bernilai Sesuai atau Tidak Sesuai dengan isi teks stimulus:`,
      gambar: null,
      pernyataan: [
        { no: 1, text: "Inisiatif pemuda Desa Sukamaju mencerminkan sikap kepedulian nyata terhadap kelestarian lingkungan pesisir." },
        { no: 2, text: "Pemberlakuan sanksi adat pembuangan sampah plastik bertujuan menjaga ekosistem muara tetap sehat." },
        { no: 3, text: "Upaya penanaman pohon mangrove terbukti merugikan mata pencaharian nelayan di sekitar pantai." },
      ],
      kategori_respons: ["Sesuai", "Tidak Sesuai"],
      kunci_jawaban: ["Sesuai", "Sesuai", "Tidak Sesuai"],
      pembahasan: "Pernyataan 1 dan 2 Sesuai dengan nilai moral dan fakta teks. Pernyataan 3 Tidak Sesuai karena hasil tangkapan nelayan justru meningkat 30%.",
    },
  ];

  // Sub-konteks mock beragam agar distribusi tema valid dan tidak monoton
  const mockSubContexts = [
    "koperasi simpan pinjam sekolah",
    "bazar kuliner tradisional",
    "tambak garam Madura",
    "pelayaran perahu Pinisi",
    "konservasi terumbu karang Wakatobi",
    "hasil panen padi sawah",
    "koleksi perpustakaan desa",
    "festival layang-layang pesisir",
  ];

  // Gunakan bank soal yang sesuai dengan mapel
  const activeBank = isMatematika ? mathQuestions : (isBahasa ? bahasaQuestions : mathQuestions);

  // Ambil butir soal sebanyak totalCount (jika totalCount > bank length, loop secara variatif)
  for (let i = 0; i < totalCount; i++) {
    const baseItem = activeBank[i % activeBank.length];
    const assignedSub = mockSubContexts[i % mockSubContexts.length];
    // Copy item agar nomor slot atau identitas bersih
    items.push({
      ...baseItem,
      tema_konteks: baseItem.tema_konteks || assignedSub,
    });
  }

  return JSON.stringify(items);
}

