/**
 * Contoh acuan (few-shot) gaya soal TKA resmi, diadaptasi substansial dari contoh soal
 * Pusmendik Kemendikdasmen — bukan salinan. Ditulis persis dalam format JSON keluaran agar
 * sekaligus mencontohkan penulisan LaTeX, pembahasan per baris, dan objek stimulus grup.
 *
 * Teks stimulus Bahasa Indonesia di sini sudah diuji lolos validateLanguageTextComplexity
 * (SD 163 kata / rata-rata 5,1; SMP 209 kata / rata-rata 7,2). Jika diubah, uji ulang —
 * contoh yang melanggar aturannya sendiri membuat model gagal meniru aturan tersebut.
 */

type ExemplarObject = Record<string, unknown>;

const SD_MATEMATIKA: ExemplarObject[] = [
  {
    jenjang: "SD/MI",
    mapel: "Matematika",
    elemen: "Bilangan",
    sub_elemen: "Bilangan Rasional",
    kompetensi: "hubungan pecahan, desimal, dan persen",
    level_kognitif: "Aplikasi",
    tingkat_kesulitan: "sedang",
    bentuk_soal: "PG",
    jenis_soal: "tunggal",
    stimulus_id_sementara: null,
    tema_konteks: "potongan harga toko buku",
    soal_text:
      "Menjelang pekan literasi, Toko Buku Pelangi memberi potongan harga 15% untuk semua buku. Harga sebuah buku cerita Rp36.000,00. Harga sebuah buku gambar $\\frac{2}{3}$ dari harga buku cerita. Nisa membeli 1 buku cerita dan 1 buku gambar. Berapa rupiah yang harus dibayar Nisa?",
    gambar: null,
    opsi: [
      { label: "A", text: "Rp45.000,00" },
      { label: "B", text: "Rp51.000,00" },
      { label: "C", text: "Rp54.000,00" },
      { label: "D", text: "Rp60.000,00" },
    ],
    pernyataan: null,
    kategori_respons: null,
    kunci_jawaban: ["B"],
    pembahasan:
      "Harga buku gambar = $\\frac{2}{3} \\times 36.000 = 24.000$ rupiah.\nHarga total sebelum potongan = $36.000 + 24.000 = 60.000$ rupiah.\nPotongan harga = $15\\% \\times 60.000 = 9.000$ rupiah.\nYang harus dibayar = $60.000 - 9.000 = 51.000$ rupiah.\nJadi, Nisa membayar Rp51.000,00 (B).",
  },
  {
    jenjang: "SD/MI",
    mapel: "Matematika",
    elemen: "Bilangan",
    sub_elemen: "Bilangan Rasional",
    kompetensi: "operasi pecahan dengan bilangan asli",
    level_kognitif: "Penalaran",
    tingkat_kesulitan: "tinggi",
    bentuk_soal: "PGK_KATEGORI",
    jenis_soal: "tunggal",
    stimulus_id_sementara: null,
    tema_konteks: "es buah bazar sekolah",
    soal_text:
      "Bu Sarah membuat es buah untuk bazar sekolah sebanyak 5 wadah. Setiap wadah berisi $3\\frac{1}{2}$ liter es buah. Es buah dituang ke gelas besar berisi $\\frac{1}{4}$ liter dan gelas kecil berisi setengah gelas besar. Sebanyak 50 gelas besar sudah terisi.\nTentukan apakah setiap pernyataan berikut Benar atau Salah.",
    gambar: null,
    opsi: null,
    pernyataan: [
      { no: 1, text: "Seluruh es buah yang dibuat Bu Sarah sebanyak $17\\frac{1}{2}$ liter." },
      { no: 2, text: "Es buah dalam 50 gelas besar sebanyak $12\\frac{1}{2}$ liter." },
      { no: 3, text: "Sisa es buah cukup untuk mengisi tepat 20 gelas kecil." },
    ],
    kategori_respons: ["Benar", "Salah"],
    kunci_jawaban: ["Benar", "Benar", "Salah"],
    pembahasan:
      "Total es buah = $5 \\times 3\\frac{1}{2} = 17\\frac{1}{2}$ liter, jadi pernyataan 1 Benar.\nEs buah di gelas besar = $50 \\times \\frac{1}{4} = 12\\frac{1}{2}$ liter, jadi pernyataan 2 Benar.\nSisa es buah = $17\\frac{1}{2} - 12\\frac{1}{2} = 5$ liter, dan isi gelas kecil = $\\frac{1}{2} \\times \\frac{1}{4} = \\frac{1}{8}$ liter.\nBanyak gelas kecil = $5 : \\frac{1}{8} = 40$ gelas, bukan 20, jadi pernyataan 3 Salah.",
  },
  {
    jenjang: "SD/MI",
    mapel: "Matematika",
    elemen: "Data",
    sub_elemen: "Penyajian dan Penggunaan Data",
    kompetensi: "membaca informasi dari diagram batang",
    level_kognitif: "Pengetahuan dan Pemahaman",
    tingkat_kesulitan: "rendah",
    bentuk_soal: "PGK_MCMA",
    jenis_soal: "tunggal",
    stimulus_id_sementara: null,
    tema_konteks: "pengunjung perpustakaan sekolah",
    soal_text:
      "Pak Joni, penjaga perpustakaan sekolah, mencatat banyak siswa yang berkunjung selama lima hari. Datanya disajikan pada diagram batang berikut.\nPilihlah semua pernyataan yang benar berdasarkan diagram tersebut.",
    gambar: {
      tipe: "diagram",
      archetype: "diagram_batang",
      data: {
        judul: "Pengunjung Perpustakaan Sekolah",
        satuan_y: "siswa",
        kategori: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
        nilai: [24, 30, 18, 36, 27],
      },
      deskripsi_alt: "Diagram batang pengunjung perpustakaan: Senin 24, Selasa 30, Rabu 18, Kamis 36, Jumat 27 siswa.",
    },
    opsi: [
      { label: "A", text: "Pengunjung terbanyak datang pada hari Kamis." },
      { label: "B", text: "Selisih pengunjung hari Kamis dan hari Rabu adalah 18 siswa." },
      { label: "C", text: "Jumlah pengunjung selama lima hari adalah 125 siswa." },
      { label: "D", text: "Pengunjung hari Selasa dua kali lipat pengunjung hari Rabu." },
    ],
    pernyataan: null,
    kategori_respons: null,
    kunci_jawaban: ["A", "B"],
    pembahasan:
      "Dari diagram: Senin 24, Selasa 30, Rabu 18, Kamis 36, dan Jumat 27 siswa.\nA benar karena 36 adalah nilai terbesar.\nB benar karena $36 - 18 = 18$ siswa.\nC salah karena $24 + 30 + 18 + 36 + 27 = 135$ siswa.\nD salah karena dua kali pengunjung Rabu adalah $2 \\times 18 = 36$, bukan 30.\nJadi, jawaban yang benar adalah A dan B.",
  },
];

const SMP_MATEMATIKA: ExemplarObject[] = [
  {
    stimulus_id_sementara: "stim-1",
    tipe: "teks",
    konten:
      "Renovasi Aula Sekolah\nPengurus SMP Harapan merenovasi aula sekolah. Menurut rencana, pekerjaan dikerjakan oleh 12 tukang dan selesai dalam 30 hari. Setiap tukang bekerja dengan kecepatan yang sama.",
  },
  {
    jenjang: "SMP/MTs",
    mapel: "Matematika",
    elemen: "Bilangan",
    sub_elemen: "Rasio dan Proporsi",
    kompetensi: "perbandingan berbalik nilai",
    level_kognitif: "Aplikasi",
    tingkat_kesulitan: "sedang",
    bentuk_soal: "PG",
    jenis_soal: "grup",
    stimulus_id_sementara: "stim-1",
    tema_konteks: "renovasi aula sekolah",
    soal_text:
      "Berdasarkan stimulus, setelah pekerjaan berjalan 10 hari, 4 tukang dipindahkan ke pekerjaan lain. Sisa pekerjaan dilanjutkan oleh tukang yang tersisa. Berapa hari lagi sisa pekerjaan akan selesai?",
    gambar: null,
    opsi: [
      { label: "A", text: "20 hari" },
      { label: "B", text: "25 hari" },
      { label: "C", text: "30 hari" },
      { label: "D", text: "40 hari" },
    ],
    pernyataan: null,
    kategori_respons: null,
    kunci_jawaban: ["C"],
    pembahasan:
      "Total pekerjaan = $12 \\times 30 = 360$ hari-tukang.\nPekerjaan 10 hari pertama = $12 \\times 10 = 120$ hari-tukang.\nSisa pekerjaan = $360 - 120 = 240$ hari-tukang, dikerjakan oleh $12 - 4 = 8$ tukang.\nWaktu penyelesaian sisa pekerjaan:\n$$\\frac{240}{8} = 30$$\nJadi, sisa pekerjaan selesai dalam 30 hari lagi (C).",
  },
  {
    jenjang: "SMP/MTs",
    mapel: "Matematika",
    elemen: "Bilangan",
    sub_elemen: "Bilangan Real",
    kompetensi: "aritmetika sosial (harga, diskon, untung-rugi, bunga tunggal)",
    level_kognitif: "Penalaran",
    tingkat_kesulitan: "tinggi",
    bentuk_soal: "PGK_MCMA",
    jenis_soal: "tunggal",
    stimulus_id_sementara: null,
    tema_konteks: "promo koperasi sekolah",
    soal_text:
      "Koperasi sekolah mengadakan promo 'Beli 4 Hemat': setiap pembelian 4 barang, barang yang harganya paling murah tidak perlu dibayar. Harga sebuah pulpen Rp6.000,00, buku tulis Rp5.000,00, dan penghapus Rp2.000,00. Dio membeli 2 pulpen, 1 buku tulis, dan 1 penghapus.\nPilihlah semua pernyataan yang benar.",
    gambar: null,
    opsi: [
      { label: "A", text: "Harga total sebelum promo adalah Rp19.000,00." },
      { label: "B", text: "Dio cukup membayar Rp17.000,00." },
      { label: "C", text: "Jika penghapus diganti buku tulis, Dio membayar Rp22.000,00." },
      { label: "D", text: "Promo tersebut menghemat lebih dari 10% harga total sebelum promo." },
    ],
    pernyataan: null,
    kategori_respons: null,
    kunci_jawaban: ["A", "B", "D"],
    pembahasan:
      "Harga sebelum promo = $2 \\times 6.000 + 5.000 + 2.000 = 19.000$ rupiah, jadi A benar.\nBarang termurah adalah penghapus, sehingga yang dibayar $19.000 - 2.000 = 17.000$ rupiah, jadi B benar.\nJika penghapus diganti buku tulis, harga total $2 \\times 6.000 + 2 \\times 5.000 = 22.000$ rupiah dan satu buku tulis gratis, sehingga yang dibayar 17.000 rupiah, jadi C salah.\nPenghematan = $\\frac{2.000}{19.000} \\times 100\\% \\approx 10,5\\%$, lebih dari 10%, jadi D benar.\nJadi, jawaban yang benar adalah A, B, dan D.",
  },
];

const SD_BAHASA_INDONESIA: ExemplarObject[] = [
  {
    stimulus_id_sementara: "stim-1",
    tipe: "teks",
    konten:
      "### Pohon Mangga Pak Karto\nRumah Pak Karto ada di ujung gang. Di halamannya tumbuh pohon mangga besar. Buahnya lebat setiap musim kemarau. Anak-anak sering bermain di bawah pohon itu. Mereka berteduh sepulang sekolah. Suatu siang, Dodi melempar batu ke pohon. Dia ingin mengambil buah mangga. Batu itu mengenai genteng rumah. Satu genteng Pak Karto pecah. Anak-anak lain langsung berlari pulang. Dodi berdiri diam di halaman. Wajahnya pucat sekali. Pak Karto keluar dari rumah. Beliau melihat genteng yang pecah. Dodi menunduk malu. Dia meminta maaf kepada Pak Karto. Dodi mengaku telah melempar batu. Pak Karto tidak marah. Beliau justru tersenyum kepada Dodi. 'Terima kasih sudah jujur,' kata Pak Karto. Pak Karto mengambil sebuah galah. Galah adalah tongkat bambu panjang. Beliau memetik tiga buah mangga. Mangga itu diberikan kepada Dodi. Dodi merasa lega. Keesokan harinya, Dodi datang lagi. Dia membawa uang tabungannya. Uang itu untuk mengganti genteng. Pak Karto menolak uang itu. Beliau meminta Dodi membantu menyiram tanaman. Dodi menyiram tanaman setiap sore. Sejak hari itu, mereka berteman akrab.",
  },
  {
    jenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    elemen: "Membaca",
    sub_elemen: "Teks Fiksi",
    kompetensi: "Pemahaman Inferensial: menyimpulkan alasan sikap tokoh",
    level_kognitif: "Pemahaman Inferensial",
    tingkat_kesulitan: "sedang",
    bentuk_soal: "PG",
    jenis_soal: "grup",
    stimulus_id_sementara: "stim-1",
    tema_konteks: "kejujuran anak di lingkungan rumah",
    soal_text: "Mengapa Pak Karto tidak marah kepada Dodi?",
    gambar: null,
    opsi: [
      { label: "A", text: "Dodi berani mengakui kesalahannya." },
      { label: "B", text: "Genteng rumah Pak Karto harganya murah." },
      { label: "C", text: "Dodi sudah membawa uang tabungannya." },
      { label: "D", text: "Buah mangga di pohon itu sangat banyak." },
    ],
    pernyataan: null,
    kategori_respons: null,
    kunci_jawaban: ["A"],
    pembahasan:
      "Pak Karto tersenyum dan berkata 'Terima kasih sudah jujur' setelah Dodi mengaku melempar batu.\nJadi, Pak Karto tidak marah karena Dodi berani mengakui kesalahannya (A).\nOpsi C keliru karena Dodi membawa uang tabungan pada keesokan harinya.",
  },
  {
    jenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    elemen: "Membaca",
    sub_elemen: "Teks Fiksi",
    kompetensi: "Pemahaman Tekstual: memahami informasi tersurat dalam cerita",
    level_kognitif: "Pemahaman Tekstual",
    tingkat_kesulitan: "rendah",
    bentuk_soal: "PGK_KATEGORI",
    jenis_soal: "grup",
    stimulus_id_sementara: "stim-1",
    tema_konteks: "kejujuran anak di lingkungan rumah",
    soal_text: "Tentukan apakah setiap pernyataan berikut Sesuai atau Tidak Sesuai dengan isi cerita.",
    gambar: null,
    opsi: null,
    pernyataan: [
      { no: 1, text: "Anak-anak lain ikut meminta maaf kepada Pak Karto." },
      { no: 2, text: "Pak Karto memetik mangga dengan galah." },
      { no: 3, text: "Pak Karto menerima uang tabungan Dodi." },
    ],
    kategori_respons: ["Sesuai", "Tidak Sesuai"],
    kunci_jawaban: ["Tidak Sesuai", "Sesuai", "Tidak Sesuai"],
    pembahasan:
      "Pernyataan 1 Tidak Sesuai karena anak-anak lain langsung berlari pulang.\nPernyataan 2 Sesuai karena Pak Karto mengambil galah lalu memetik tiga buah mangga.\nPernyataan 3 Tidak Sesuai karena Pak Karto menolak uang itu.",
  },
];

const SMP_BAHASA_INDONESIA: ExemplarObject[] = [
  {
    stimulus_id_sementara: "stim-1",
    tipe: "teks",
    konten:
      "**Teks 1: Taman Sari yang Ramah Keluarga**\nMinggu pagi, saya mengajak adik ke Taman Sari. Taman ini berada di tengah kota. Lapangan rumputnya luas dan terawat. Anak-anak bebas berlari, dan orang tua duduk di bangku. Ada ayunan, perosotan, serta jungkat-jungkit. Semua permainan dicat warna cerah. Tempat sampah tersedia di setiap sudut taman. Petugas kebersihan berkeliling setiap dua jam. Pengunjung juga tertib membuang sampah. Pohon peneduh tumbuh di sepanjang jalur pejalan kaki. Di sisi utara ada kolam ikan kecil. Anak-anak senang memberi makan ikan di sana. Udara terasa sejuk, dan suasananya tenang. Taman dibuka pukul enam pagi setiap hari. Taman ini cocok untuk rekreasi keluarga yang murah.\n\n**Teks 2: Taman Sari pada Akhir Pekan**\nSaya berkunjung ke Taman Sari pada Sabtu sore. Tempat parkir sudah penuh sejak siang. Saya terpaksa parkir di jalan samping taman. Halte bus hanya lima menit dari gerbang. Pedagang makanan berjajar di dekat pintu masuk. Harga jajanan terjangkau, tetapi antreannya panjang. Area bermain anak sangat ramai. Banyak anak menunggu giliran naik ayunan. Toilet umum cukup bersih, tetapi jumlahnya hanya dua. Beberapa bangku taman mulai rusak dan perlu diperbaiki. Petugas keamanan mengatur keluar masuk kendaraan. Lampu taman menyala sejak pukul lima sore. Pengelola perlu menambah toilet dan tempat parkir. Taman ini tetap menyenangkan untuk dikunjungi bersama teman.",
  },
  {
    jenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    elemen: "Membaca",
    sub_elemen: "Teks Ulasan",
    kompetensi: "Menginterpretasi dan Mengintegrasi: membandingkan informasi pada dua teks",
    level_kognitif: "Menginterpretasi dan Mengintegrasi",
    tingkat_kesulitan: "sedang",
    bentuk_soal: "PGK_MCMA",
    jenis_soal: "grup",
    stimulus_id_sementara: "stim-1",
    tema_konteks: "ulasan taman kota",
    soal_text: "Pilihlah semua hal yang dibahas pada Teks 1 dan juga pada Teks 2.",
    gambar: null,
    opsi: [
      { label: "A", text: "Kondisi area bermain anak" },
      { label: "B", text: "Kebersihan fasilitas taman" },
      { label: "C", text: "Kolam ikan di sisi utara taman" },
      { label: "D", text: "Harga jajanan di dekat pintu masuk" },
    ],
    pernyataan: null,
    kategori_respons: null,
    kunci_jawaban: ["A", "B"],
    pembahasan:
      "A benar: Teks 1 menyebut ayunan, perosotan, dan jungkat-jungkit, sedangkan Teks 2 menyebut area bermain anak yang ramai.\nB benar: Teks 1 membahas tempat sampah dan petugas kebersihan, sedangkan Teks 2 membahas toilet yang cukup bersih.\nC salah karena kolam ikan hanya ada pada Teks 1.\nD salah karena harga jajanan hanya ada pada Teks 2.",
  },
  {
    jenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    elemen: "Membaca",
    sub_elemen: "Teks Ulasan",
    kompetensi: "Mengevaluasi dan Merefleksi: menanggapi pendapat berdasarkan dua teks",
    level_kognitif: "Mengevaluasi dan Merefleksi",
    tingkat_kesulitan: "tinggi",
    bentuk_soal: "PGK_KATEGORI",
    jenis_soal: "grup",
    stimulus_id_sementara: "stim-1",
    tema_konteks: "ulasan taman kota",
    soal_text: "Tentukan apakah kamu Setuju atau Tidak Setuju dengan setiap pendapat berikut berdasarkan kedua teks.",
    gambar: null,
    opsi: null,
    pernyataan: [
      { no: 1, text: "Taman Sari lebih nyaman dikunjungi pada Minggu pagi daripada Sabtu sore." },
      { no: 2, text: "Kedua penulis sama-sama mengeluhkan tempat parkir." },
      { no: 3, text: "Saran penulis Teks 2 berkaitan dengan fasilitas yang jumlahnya terbatas." },
    ],
    kategori_respons: ["Setuju", "Tidak Setuju"],
    kunci_jawaban: ["Setuju", "Tidak Setuju", "Setuju"],
    pembahasan:
      "Pendapat 1 Setuju: Teks 1 menggambarkan Minggu pagi yang tenang, sedangkan Teks 2 menggambarkan Sabtu sore yang ramai dan parkir penuh.\nPendapat 2 Tidak Setuju: hanya penulis Teks 2 yang membahas tempat parkir.\nPendapat 3 Setuju: penulis Teks 2 menyarankan penambahan toilet dan tempat parkir yang jumlahnya kurang.",
  },
];

function exemplarsFor(jenjang: string, mapel: string): ExemplarObject[] {
  const m = mapel.toLowerCase();
  const isSd = jenjang.includes("SD");
  if (m.includes("matematika")) return isSd ? SD_MATEMATIKA : SMP_MATEMATIKA;
  if (m.includes("indonesia")) return isSd ? SD_BAHASA_INDONESIA : SMP_BAHASA_INDONESIA;
  return [];
}

export function formatExemplarBlock(jenjang: string, mapel: string): string {
  const exemplars = exemplarsFor(jenjang, mapel);
  if (exemplars.length === 0) return "";

  const isUpperLevel = jenjang.includes("SMA") || jenjang.includes("SMK");
  const levelNote = isUpperLevel
    ? " Contoh ini berjenjang SMP; naikkan tingkat materi dan kedalaman penalarannya sesuai jenjang " + jenjang + "."
    : "";

  return `CONTOH ACUAN GAYA SOAL TKA RESMI (diadaptasi dari contoh soal Pusmendik):
Tiru kualitasnya: situasi keseharian yang wajar, bahasa yang jelas, penalaran sesuai tingkat kesulitan, format JSON, penulisan rumus, dan pembahasan per langkah. JANGAN menyalin situasi, nama tokoh, maupun angka dari contoh — buat situasi baru dengan kualitas setara.${levelNote}
${JSON.stringify(exemplars, null, 1)}`;
}
