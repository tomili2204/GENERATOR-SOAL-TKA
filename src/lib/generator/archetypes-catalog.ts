/**
 * Katalog Arketipe Pemodelan Matematika & Matriks Kombinatorika Dinamis (Lapis 2 & Lapis 3)
 * Standar Rujukan: BSKAP No. 45/2025 & No. 47/2025, Pusmendik & Defantri
 */

export interface ArchetypeItem {
  id: string;
  nomor: number;
  nama: string;
  deskripsi: string;
  contohKonsep: string;
  laranganKlise: string;
}

// 1. ELEMEN GEOMETRI & PENGUKURAN (12 Arketipe)
export const GEOMETRI_ARCHETYPES: ArchetypeItem[] = [
  {
    id: "GEO_01",
    nomor: 1,
    nama: "Rangka Struktur & Kestabilan Sudut (Trigonometri / Pythagoras)",
    deskripsi: "Kemiringan atap rumah adat, kestabilan tiang pancang, atau penyangga jembatan gantung.",
    contohKonsep: "Menghitung panjang kawat penahan tiang pemancar BTS atau sudut kemiringan atap genteng anti bocor.",
    laranganKlise: "DILARANG kapal berlayar ke utara lalu ke timur.",
  },
  {
    id: "GEO_02",
    nomor: 2,
    nama: "Tangga Sandar & Sumbu Kemiringan",
    deskripsi: "Tangga teknisi bersandar pada dinding tembok/pohon kelapa dengan batas sudut aman terpeleset.",
    contohKonsep: "Jarak kaki tangga ke dinding agar sudut elevasi aman (safety margin).",
    laranganKlise: "DILARANG sekadar menghitung sisi miring tanpa konteks keselamatan.",
  },
  {
    id: "GEO_03",
    nomor: 3,
    nama: "Bayangan & Kesebangunan Vertikal",
    deskripsi: "Pengukuran tinggi pohon sagu, mercusuar, atau tugu menggunakan bayangan tongkat meteran.",
    contohKonsep: "Perbandingan proporsional bayangan objek tinggi dengan tongkat pengukur pada jam tertentu.",
    laranganKlise: "DILARANG menggunakan contoh tiang bendera upacara yang klise.",
  },
  {
    id: "GEO_04",
    nomor: 4,
    nama: "Kapasitas Silinder & Debit Pengisian",
    deskripsi: "Toren penampung air hujan desa atau tangki solar nelayan berbentuk tabung/silinder horizontal.",
    contohKonsep: "Volume tabung dikaitkan dengan laju debit pengisian keran atau penurunan tinggi air.",
    laranganKlise: "DILARANG hanya rumus volume tabung mati tanpa debit/waktu.",
  },
  {
    id: "GEO_05",
    nomor: 5,
    nama: "Pemasangan Ubin / Keramik Modular (Bukan Luas Sisa)",
    deskripsi: "Menghitung jumlah ubin/paving block modular yang muat pada pelataran tanpa pemotongan sisa.",
    contohKonsep: "Penutupan permukaan persegi panjang dengan modul keramik ukuran tertentu.",
    laranganKlise: "DILARANG menghitung luas lingkaran kolam di dalam persegi.",
  },
  {
    id: "GEO_06",
    nomor: 6,
    nama: "Rasio Keliling terhadap Luas (Efisiensi Penampang)",
    deskripsi: "Peternak/petani membandingkan efisiensi pemagaran kawat kandang/lahan dengan bentuk berbeda.",
    contohKonsep: "Memilih bentuk geometri yang memberikan luas maksimum dengan panjang pagar kawat tetap.",
    laranganKlise: "DILARANG menghitung keliling lapangan bola standar.",
  },
  {
    id: "GEO_07",
    nomor: 7,
    nama: "Irisan Jalur Pipa & Garis Sejajar Transversal",
    deskripsi: "Jalur pemasangan pipa transmisi gas/air melintasi rel kereta atau jalan raya berpola sudut berseberangan.",
    contohKonsep: "Menganalisis sudut sehadap dan berseberangan pada persimpangan jalur pipa.",
    laranganKlise: "DILARANG gambar garis murni tanpa narasi rekayasa/tata kota.",
  },
  {
    id: "GEO_08",
    nomor: 8,
    nama: "Konstruksi Ruang Bertingkat & Ketebalan Dinding",
    deskripsi: "Peti kayu penyimpan ikan berinsulasi styrofoam dengan dinding berketebalan beberapa sentimeter.",
    contohKonsep: "Menghitung volume muat netto bagian dalam setelah memperhitungkan ketebalan dinding wadah.",
    laranganKlise: "DILARANG balok kawat polos tanpa tebal dinding.",
  },
  {
    id: "GEO_09",
    nomor: 9,
    nama: "Jaring-jaring Lipat & Desain Kemasan Ramah Lingkungan",
    deskripsi: "Pola jaring-jaring karton box kemasan kue lapis/oleh-oleh daerah dengan lidah perekat pengunci.",
    contohKonsep: "Menentukan luas karton minimum yang diperlukan untuk membuat 50 boks kemasan termasuk sambungan.",
    laranganKlise: "DILARANG tebak sisi yang berhadapan pada dadu.",
  },
  {
    id: "GEO_10",
    nomor: 10,
    nama: "Luas Penampang Atap Limas / Prisma Trapesium",
    deskripsi: "Perhitungan luas permukaan atap pendopo adat berbentuk limas atau atap pelana prisma segitiga.",
    contohKonsep: "Menghitung kebutuhan lembar genteng metal berdasarkan luas permukaan miring atap.",
    laranganKlise: "DILARANG kolam renang dengan lantai bertingkat yang tidak realistis.",
  },
  {
    id: "GEO_11",
    nomor: 11,
    nama: "Transformasi Geometri Refleksi & Rotasi Motif Batik",
    deskripsi: "Penyusunan motif ragam hias kain tenun/batik melalui pergeseran translasi dan pencerminan koordinat.",
    contohKonsep: "Menentukan koordinat titik akhir ornamen setelah dicerminkan terhadap garis $y = x$ lalu ditranslasikan.",
    laranganKlise: "DILARANG titik P(x, y) abstrak tanpa bidang/ornamen visual.",
  },
  {
    id: "GEO_12",
    nomor: 12,
    nama: "Volume Gabungan Kerucut & Tabung (Silo Pangan)",
    deskripsi: "Silo penyimpanan gabah/jagung berbentuk tabung dengan bagian bawah berupa corong kerucut penumpah.",
    contohKonsep: "Menghitung total kapasitas tampung silo dan laju pengosongan isi biji-bijian.",
    laranganKlise: "DILARANG es krim kerucut atau topi ulang tahun.",
  },
];

// 2. ELEMEN BILANGAN (10 Arketipe)
export const BILANGAN_ARCHETYPES: ArchetypeItem[] = [
  {
    id: "BIL_01",
    nomor: 1,
    nama: "Sinkronisasi Siklus Bersama (KPK Non-Klise)",
    deskripsi: "Rotasi transmisi roda gigi mesin penggiling padi, sinkronisasi sinyal lampu suar mercusuar laut, atau giliran pembagian air irigasi subak.",
    contohKonsep: "Menentukan detik/hari ke berapa roda gigi atau sinyal suar akan berkedip bersamaan kembali.",
    laranganKlise: "DILARANG Ali, Budi, dan Cici berenang bersama tiap 3, 4, 6 hari.",
  },
  {
    id: "BIL_02",
    nomor: 2,
    nama: "Distribusi Bantuan Logistik Bencana (FPB Kontekstual)",
    deskripsi: "Pengemasan paket sembako posko tanggap bencana ke dalam kardus darurat dengan komposisi identik tanpa sisa.",
    contohKonsep: "Mencari jumlah paket kardus terbanyak dan menghitung isi tiap kardus secara proporsional.",
    laranganKlise: "DILARANG pembagian kue bolu dan permen di pesta ulang tahun.",
  },
  {
    id: "BIL_03",
    nomor: 3,
    nama: "Pekatan Rasio Larutan & Formulasi Pupuk (Pecahan Campuran)",
    deskripsi: "Persentase kepekatan larutan pewarna alami kain tenun atau formula takaran nutrisi AB mix hidroponik.",
    contohKonsep: "Operasi hitung campuran pecahan untuk menentukan takaran air murni yang harus ditambahkan.",
    laranganKlise: "DILARANG membagi pizza atau cokelat batangan biasa.",
  },
  {
    id: "BIL_04",
    nomor: 4,
    nama: "Pembagian Hak Hasil Adat Maritim (Pecahan Bertingkat)",
    deskripsi: "Sistem bagi hasil panen perikanan tangkap antara pemilik perahu, juragan kapal, dan anak buah kapal (ABK).",
    contohKonsep: "Menghitung bagian pecahan setelah dikurangi biaya operasional bahan bakar solar.",
    laranganKlise: "DILARANG membagi uang saku ayah kepada adik dan kakak.",
  },
  {
    id: "BIL_05",
    nomor: 5,
    nama: "Elevasi Relatif Gabungan (Bilangan Bulat Bertanda)",
    deskripsi: "Pemetaan kedalaman palung karang penyelaman terhadap ketinggian pos pemantau tebing pantai.",
    contohKonsep: "Perhitungan selisih jarak vertikal mutlak ($|a - b|$) dan perubahan posisi bertahap.",
    laranganKlise: "DILARANG daging beku dikeluarkan dari kulkas naik 2 derajat per menit.",
  },
  {
    id: "BIL_06",
    nomor: 6,
    nama: "Neraca Laba-Rugi Fluktuatif Koperasi",
    deskripsi: "Akumulasi defisit dan surplus kas mingguan koperasi nelayan pada musim angin barat / paceklik.",
    contohKonsep: "Operasi bilangan bulat bertingkat menghitung saldo akhir kas setelah rangkaian pemasukan dan pengeluaran.",
    laranganKlise: "DILARANG aturan skor kompetisi benar +4, salah -1, kosong 0.",
  },
  {
    id: "BIL_07",
    nomor: 7,
    nama: "Skala Pangkat & Eksponen Mikro/Makro",
    deskripsi: "Konsentrasi partikel polusi mikroplastik per liter air sungai atau pembelahan ragi fermentasi tempe.",
    contohKonsep: "Sifat operasi perpangkatan eksponen $a^m \\times a^n$ dan notasi ilmiah.",
    laranganKlise: "DILARANG bakteri membelah diri menjadi 2 setiap 20 menit yang monoton.",
  },
  {
    id: "BIL_08",
    nomor: 8,
    nama: "Aritmetika Sosial Berjenjang (Bukan Diskon Tunggal)",
    deskripsi: "Sistem komisi insentif berjenjang kurir logistik desa berdasarkan jarak tempuh atau perhitungan bunga simpanan berkala.",
    contohKonsep: "Menghitung penerimaan bersih setelah pajak dan potongan administrasi berjenjang.",
    laranganKlise: "DILARANG membeli baju diskon 20% di toko pakaian.",
  },
  {
    id: "BIL_09",
    nomor: 9,
    nama: "Konversi Satuan Tradisional ke Baku SI",
    deskripsi: "Mengonversi takaran lokal nusantara (gantang, depa, blek, tumbak) ke satuan standar SI baku.",
    contohKonsep: "Rasio perbandingan senilai untuk kalibrasi timbangan digital hasil panen kopi.",
    laranganKlise: "DILARANG konversi meter ke kilometer tanpa cerita kontekstual.",
  },
  {
    id: "BIL_10",
    nomor: 10,
    nama: "Aproksimasi Nilai Bentuk Akar Irasional",
    deskripsi: "Mengestimasi panjang balok miring kayu jati $\\sqrt{n}$ untuk menentukan potongan sisa pengrajin mebel.",
    contohKonsep: "Menentukan posisi desimal bentuk akar di antara dua bilangan bulat terdekat.",
    laranganKlise: "DILARANG menyederhanakan akar 72 atau akar 48 abstrak tanpa aplikasi.",
  },
];

// 3. ELEMEN ALJABAR (10 Arketipe)
export const ALJABAR_ARCHETYPES: ArchetypeItem[] = [
  {
    id: "ALJ_01",
    nomor: 1,
    nama: "Optimasi Ritase Angkutan Logistik (SPLDV)",
    deskripsi: "Menentukan kombinasi ritase truk boks kecil vs mobil pick-up dengan batasan total muatan dan kuota bahan bakar.",
    contohKonsep: "Menyusun dan menyelesaikan sistem persamaan linear dua variabel untuk menentukan biaya transport termurah.",
    laranganKlise: "DILARANG membeli 3 buku tulis dan 2 pensil seharga sekian rupiah.",
  },
  {
    id: "ALJ_02",
    nomor: 2,
    nama: "Racikan Proporsi Biji Komoditas (SPLDV)",
    deskripsi: "Menentukan perbandingan takaran biji kopi arabika dan robusta pada roastery lokal untuk mencapai harga pokok tertentu.",
    contohKonsep: "SPLDV berbasis persentase atau harga campuran per kilogram.",
    laranganKlise: "DILARANG tiket bioskop dewasa dan anak-anak.",
  },
  {
    id: "ALJ_03",
    nomor: 3,
    nama: "Ambang Batas Nutrisi Harian (Pertidaksamaan Linear)",
    deskripsi: "Menghitung kombinasi porsi protein tempe dan ikan asin agar memenuhi batas minimum asupan kalori warga lansia.",
    contohKonsep: "Pertidaksamaan linear satu atau dua variabel dengan batasan anggaran maksimal.",
    laranganKlise: "DILARANG nilai x lebih dari 5 abstrak.",
  },
  {
    id: "ALJ_04",
    nomor: 4,
    nama: "Model Tarif Langganan Linear Berbatas (Fungsi Linear)",
    deskripsi: "Pemodelan tarif kuota internet bumdes atau air PAM desa dengan biaya abodemen tetap plus tarif per meter kubik bertingkat.",
    contohKonsep: "Menentukan rumus fungsi biaya $f(x) = ax + b$ dan menghitung nilai batas pemakaian.",
    laranganKlise: "DILARANG tarif taksi argometer klise kota besar.",
  },
  {
    id: "ALJ_05",
    nomor: 5,
    nama: "Degradasi Efisiensi Panel Surya (Fungsi Linear Negatif)",
    deskripsi: "Penurunan daya output panel surya sekolah sebesar sekian watt per tahun akibat usia pakai dan debu.",
    contohKonsep: "Fungsi linear dengan gradien negatif untuk memprediksi tahun penggantian inverter.",
    laranganKlise: "DILARANG menghitung gradien garis lurus melalui dua titik abstrak tanpa cerita.",
  },
  {
    id: "ALJ_06",
    nomor: 6,
    nama: "Penataan Modul Pemecah Gelombang (Barisan Aritmetika)",
    deskripsi: "Susunan blok beton tetrapod penahan ombak pantai yang disusun bertingkat dari baris bawah ke atas.",
    contohKonsep: "Menghitung jumlah balok beton pada baris ke-n ($U_n$) dan total kebutuhan seluruh blok ($S_n$).",
    laranganKlise: "DILARANG susunan kursi gedung bioskop atau tumpukan batu bata biasa.",
  },
  {
    id: "ALJ_07",
    nomor: 7,
    nama: "Perkembangbiakan Bibit Kolam Bioflok (Barisan Geometri)",
    deskripsi: "Pertumbuhan biomassa mikroorganisme pengurai limbah tambak ikan yang bertambah dengan rasio tetap.",
    contohKonsep: "Menghitung rasio $r$ dan populasi pada periode pemantauan berikutnya.",
    laranganKlise: "DILARANG amuba membelah diri menjadi 2 setiap sekian menit.",
  },
  {
    id: "ALJ_08",
    nomor: 8,
    nama: "Tahapan Pemrosesan Penggilingan Gabah (Fungsi Komposisi)",
    deskripsi: "Mesin pengering gabah menghasilkan kadar air tertentu, dilanjutkan mesin pemutih beras dengan efisiensi rendemen.",
    contohKonsep: "Fungsi komposisi $(g \\circ f)(x)$ menghitung bobot akhir beras super dari bobot awal gabah kering panen.",
    laranganKlise: "DILARANG rumus f(x) dan g(x) aljabar murni tanpa makna fisis.",
  },
  {
    id: "ALJ_09",
    nomor: 9,
    nama: "Laju Konsumsi Solar Genset Desa (Persamaan Garis Lurus)",
    deskripsi: "Hubungan volume sisa solar genset komunal terhadap jam operasional listrik malam.",
    contohKonsep: "Menentukan persamaan garis dan titik potong sumbu untuk mengetahui kapan genset mati.",
    laranganKlise: "DILARANG mobil berjalan kecepatan tetap melintasi kota A dan B.",
  },
  {
    id: "ALJ_10",
    nomor: 10,
    nama: "Pemfaktoran Aljabar Denah Lahan Terbagi",
    deskripsi: "Memfaktorkan ekspresi aljabar kuadratik $(x^2 + ax + b)$ sebagai ukuran panjang dan lebar petak tambak garam.",
    contohKonsep: "Geometri aljabar: mencari representasi faktor linear dan nilai x yang memenuhi batas keliling.",
    laranganKlise: "DILARANG faktorkan $x^2 + 5x + 6$ tanpa konteks spasial.",
  },
];

// 4. ELEMEN DATA & PELUANG (10 Arketipe)
export const DATA_ARCHETYPES: ArchetypeItem[] = [
  {
    id: "DAT_01",
    nomor: 1,
    nama: "Curah Hujan & Agroklimat BMKG (Diagram Batang SVG)",
    deskripsi: "Perbandingan data curah hujan bulanan stasiun klimatologi lokal untuk menentukan awal musim tanam padi.",
    contohKonsep: "Membaca selisih, lonjakan tertinggi, dan simpulan tren cuaca ekstrem.",
    laranganKlise: "DILARANG diagram batang nilai ulangan matematika siswa kelas VIIA.",
  },
  {
    id: "DAT_02",
    nomor: 2,
    nama: "Tren Fluktuasi Harga Komoditas Pangan (Diagram Garis SVG)",
    deskripsi: "Pemantauan harga cabai rawit atau bawang merah di pasar induk sebelum, saat panen raya, dan pasca panen.",
    contohKonsep: "Menganalisis persentase kenaikan harga dan memprediksi titik balik harga.",
    laranganKlise: "DILARANG diagram garis suhu badan pasien rumah sakit.",
  },
  {
    id: "DAT_03",
    nomor: 3,
    nama: "Proporsi Bauran Energi Mandiri Desa (Diagram Lingkaran SVG)",
    deskripsi: "Persentase pasokan listrik desa dari tenaga surya (PLTS), mikrohidro, dan generator diesel.",
    contohKonsep: "Menghitung sudut juring lingkaran, persentase kontribusi, dan daya watt aktual tiap sumber.",
    laranganKlise: "DILARANG diagram lingkaran hobi siswa (futsal, menari, musik).",
  },
  {
    id: "DAT_04",
    nomor: 4,
    nama: "Keseragaman Mutu Bobot Panen (Median & Jangkauan)",
    deskripsi: "Pengujian konsistensi berat buah melon hidroponik antar-greenhouse untuk syarat lolos ekspor.",
    contohKonsep: "Menghitung nilai tengah (median) dan jangkauan interkuartil sebagai ukuran kestabilan mutu produk.",
    laranganKlise: "DILARANG susulan 1 siswa yang mengubah nilai rata-rata 29 siswa.",
  },
  {
    id: "DAT_05",
    nomor: 5,
    nama: "Skor Penjurian Festival Olahan Pangan (Trimmed Mean)",
    deskripsi: "Penentuan juara lomba inovasi pangan lokal setelah skor juri paling ekstrem tertinggi dan terendah dieliminasi.",
    contohKonsep: "Menghitung rata-rata terpangkas (trimmed mean) untuk menghindari bias penilai.",
    laranganKlise: "DILARANG rata-rata nilai matematika kelas yang biasa.",
  },
  {
    id: "DAT_06",
    nomor: 6,
    nama: "Probabilitas Gelombang Pasang Nelayan Tradisional",
    deskripsi: "Peluang terjadinya tinggi ombak di atas ambang batas keselamatan melaut berdasarkan catatan 40 hari terakhir.",
    contohKonsep: "Peluang empiris frekuensi relatif untuk pengambilan keputusan melaut.",
    laranganKlise: "DILARANG melempar dua buah dadu bermata 6.",
  },
  {
    id: "DAT_07",
    nomor: 7,
    nama: "Uji Daya Berkecambah Benih Hibrida (Peluang Empiris)",
    deskripsi: "Kelompok tani menyemai 200 butir biji jagung varietas baru untuk mengukur persentase daya tumbuh bibit.",
    contohKonsep: "Frekuensi harapan bibit hidup jika petani menanam 1.500 bibit di ladang.",
    laranganKlise: "DILARANG mengambil bola merah dan putih dari dalam kantong.",
  },
  {
    id: "DAT_08",
    nomor: 8,
    nama: "Tabel Kontingensi Preferensi Pangan Berkelanjutan",
    deskripsi: "Data survei konsumsi pangan lokal (sagu, jagung, ubi, beras) berdasarkan kelompok usia warga desa.",
    contohKonsep: "Membaca frekuensi marginal dan menghitung persentase proporsi kelompok tertentu.",
    laranganKlise: "DILARANG tabel pemilihan ketua OSIS.",
  },
  {
    id: "DAT_09",
    nomor: 9,
    nama: "Sebaran Upah & Garis Kelayakan Pekerja (Kuartil Bawah Q1)",
    deskripsi: "Menganalisis sebaran honor harian pengrajin gerabah/tenun untuk mengidentifikasi 25% kelompok terendah.",
    contohKonsep: "Menentukan nilai kuartil pertama ($Q_1$) dan kuartil ketiga ($Q_3$) dari data terurut.",
    laranganKlise: "DILARANG mencari kuartil dari 10 angka acak tanpa label satuan.",
  },
  {
    id: "DAT_10",
    nomor: 10,
    nama: "Peluang Kejadian Bebas Peralatan Pengairan (Pompa Sawah)",
    deskripsi: "Dua pompa air diesel mandiri beroperasi terpisah; peluang pompa 1 macet dan peluang pompa 2 macet.",
    contohKonsep: "Peluang kejadian saling bebas $P(A \\cap B) = P(A) \\times P(B)$ dan komplemennya.",
    laranganKlise: "DILARANG peluang muncul angka pada koin uang logam.",
  },
];

// ==========================================
// LAPIS 3: MATRIKS KOMBINATORIKA DINAMIS 3D
// ==========================================

export const PROFESI_SEKTOR_DIMENSION = [
  "Arkeolog situs cagar budaya nusantara",
  "Teknisi menara pemancar BTS perbukitan",
  "Pengelola budidaya tambak udang vaname",
  "Desainer kemasan UMKM ramah lingkungan",
  "Pengusaha konveksi sablon kain tradisional",
  "Penakar dosis formula pupuk organik cair",
  "Pilot drone pemetaan hutan mangrove",
  "Masinis kereta komuter antar-kota",
  "Kurir logistik kapal penyeberangan perintis",
  "Barista sangrai roastery kopi lokal nusantara",
  "Petugas instalasi panel surya atap pedesaan",
  "Pengrajin mebel ukir kayu berkelanjutan",
];

export const TANTANGAN_MASALAH_DIMENSION = [
  "Optimasi biaya pengeluaran minimum (efisiensi anggaran)",
  "Daya tampung maksimal tanpa melebihi batas aman beban (kapasitas)",
  "Batas toleransi ketebalan dan margin error bahan baku",
  "Laju pengeringan komoditas terhadap penurunan kadar air",
  "Selisih waktu tempuh perjalanan akibat hambatan cuaca atau ritase",
  "Efisiensi pemanfaatan energi terbarukan mandiri",
  "Ketepatan rasio perbandingan campuran bahan komposit",
  "Perhitungan sisa material pemotongan agar minim limbah buang",
];

export const STRUKTUR_PERTANYAAN_DIMENSION = [
  "Bukan luas sisa: hitung berapa banyak modul ubin/lembaran yang muat tanpa pemotongan.",
  "Rasio keliling terhadap luas: bandingkan efisiensi bentuk penampang untuk menghemat material.",
  "Koordinat titik temu: tentukan titik koordinat perpotongan dua lintasan jalur distribusi.",
  "Faktor keselamatan (Safety margin): uji apakah sudut kemiringan struktur aman atau rawan roboh.",
  "Debit & waktu: tentukan lama waktu sampai kapasitas tangki/wadah terisi tepat pada batas aman.",
];

/**
 * Mengambil katalog arketipe berdasarkan nama elemen
 */
export function getArchetypesForElement(elemen: string): ArchetypeItem[] {
  const elLower = elemen.toLowerCase();
  if (elLower.includes("geometri") || elLower.includes("ukur") || elLower.includes("bangun")) {
    return GEOMETRI_ARCHETYPES;
  }
  if (elLower.includes("bilangan") || elLower.includes("rasional") || elLower.includes("real")) {
    return BILANGAN_ARCHETYPES;
  }
  if (elLower.includes("aljabar") || elLower.includes("fungsi") || elLower.includes("persamaan")) {
    return ALJABAR_ARCHETYPES;
  }
  if (elLower.includes("data") || elLower.includes("peluang") || elLower.includes("statistika")) {
    return DATA_ARCHETYPES;
  }
  return GEOMETRI_ARCHETYPES; // Fallback
}

/**
 * Menghasilkan penugasan arketipe deterministik per slot
 * Memastikan tidak ada 2 slot yang mendapatkan arketipe yang sama di elemen yang sama dalam satu batch!
 */
export function generateDeterministicSlotPlan(
  totalSoal: number,
  jenjang: string,
  mapel: string,
  selectedElements?: string[]
): Array<{
  slotIndex: number;
  elemen: string;
  archetype: ArchetypeItem;
  profesi: string;
  tantangan: string;
  struktur: string;
}> {
  const defaultElements = ["Bilangan", "Aljabar", "Geometri dan Pengukuran", "Data dan Peluang"];
  const elements = selectedElements && selectedElements.length > 0 ? selectedElements : defaultElements;

  // Siapkan pool arketipe per elemen yang diacak urutannya
  const elementPools: Record<string, ArchetypeItem[]> = {};
  for (const el of elements) {
    const list = [...getArchetypesForElement(el)];
    // Acak ringan agar setiap batch mendapat urutan awal yang segar
    elementPools[el] = list.sort(() => 0.5 - Math.random());
  }

  const slotPlans: Array<{
    slotIndex: number;
    elemen: string;
    archetype: ArchetypeItem;
    profesi: string;
    tantangan: string;
    struktur: string;
  }> = [];

  const elCounters: Record<string, number> = {};
  elements.forEach((el) => (elCounters[el] = 0));

  for (let i = 0; i < totalSoal; i++) {
    const el = elements[i % elements.length];
    const pool = elementPools[el] || getArchetypesForElement(el);
    const counter = elCounters[el] || 0;
    const archetype = pool[counter % pool.length];
    elCounters[el] = counter + 1;

    const profesi = PROFESI_SEKTOR_DIMENSION[i % PROFESI_SEKTOR_DIMENSION.length];
    const tantangan = TANTANGAN_MASALAH_DIMENSION[i % TANTANGAN_MASALAH_DIMENSION.length];
    const struktur = STRUKTUR_PERTANYAAN_DIMENSION[i % STRUKTUR_PERTANYAAN_DIMENSION.length];

    slotPlans.push({
      slotIndex: i + 1,
      elemen: el,
      archetype,
      profesi,
      tantangan,
      struktur,
    });
  }

  return slotPlans;
}

/**
 * Menyusun blok instruksi prompt untuk panduan arketipe deterministik
 */
export function formatArchetypeGuidancePrompt(
  slotPlans: Array<{
    slotIndex: number;
    elemen: string;
    archetype: ArchetypeItem;
    profesi: string;
    tantangan: string;
    struktur: string;
  }>,
  jenjang: string,
  mapel: string
): string {
  const isMat = mapel.toLowerCase().includes("matematika");
  if (!isMat) return "";

  // Tampilkan ringkasan blueprint slot untuk memandu AI secara tegas
  const sampleSlots = slotPlans.slice(0, 16); // Ambil 16 sampel pertama untuk memandu batch
  const slotInstructions = sampleSlots
    .map(
      (s) =>
        `- Slot #${s.slotIndex} [Elemen: ${s.elemen}]: WAJIB pakai Arketipe "${s.archetype.nama}". Profesi: ${s.profesi}. Tantangan: ${s.tantangan}. ${s.archetype.laranganKlise}`
    )
    .join("\n");

  return `\n\n=== PANDUAN DETERMINISTIK ARKETIPE & ANTI-KLISE (LAPIS 2 & LAPIS 3) ===
Sistem mewajibkan pembuatan soal mengikuti penugasan arketipe pemodelan konkret berikut (DILARANG KERAS membuat soal di luar arketipe atau mengulang model yang sama):

${slotInstructions}

ATURAN ANTI-BIAS ANGKA & VARIASI NILAI PI (WAJIB DIPATUHI SECARA KETAT):
1. PENGGUNAAN NILAI PI:
   - DILARANG SELALU menggunakan pi = 22/7 dengan angka diameter kelipatan 14 atau radius 7! Ini pola klise yang sangat monoton.
   - Minimal 50% soal lingkaran/tabung WAJIB menggunakan pi = 3,14 dengan ukuran desimal atau meter realistis (misal diameter 20 m, 10 m, 2,5 m, atau radius 15 cm).
   - Jika menggunakan pi = 22/7, gunakan ukuran non-klise seperti diameter 21 cm, 35 m, atau 42 cm.
2. LARANGAN ANGKA "TERLALU BULAT":
   - Hindari angka-angka monoton yang terlalu sering muncul di buku lama (seperti 14, 28, atau harga buku 3.000 & pensil 2.000).
   - Gunakan angka-angka harga dan ukuran dunia nyata yang realistis (misal harga per kg Rp18.500, Rp23.000, volume 45 liter, panjang 16,5 meter).
3. MATRIKS STRUKTUR PERTANYAAN:
   - DILARANG seluruh soal geometri selalu berupa "mencari luas daerah yang diarsir (luas sisa)".
   - Variasikan dengan: menghitung jumlah modul keramik/paving yang muat tanpa memotong, menguji margin keamanan kemiringan (safety angle), menghitung laju debit waktu pengisian, atau rasio keliling terhadap luas!`;
}
