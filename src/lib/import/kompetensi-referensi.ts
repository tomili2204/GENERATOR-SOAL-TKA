/**
 * Sumber data referensi kompetensi untuk template impor Excel Pembuat Soal (soal Human).
 * Satu entri = satu baris pada sheet "Referensi Kompetensi" template, dan satu nilai valid
 * untuk kolom "Kode Kompetensi" pada sheet "Soal" (dicocokkan persis oleh
 * src/lib/validations/excel-import.ts).
 *
 * HANYA isi kombinasi jenjang+mapel yang datanya sudah disediakan dan dibersihkan -- JANGAN
 * mengarang kode/deskripsi untuk kombinasi lain. Kombinasi yang belum ada di REFERENSI di
 * bawah otomatis dianggap "belum tersedia" oleh isTemplateAvailable().
 */
import { normalizeJenjang } from "@/lib/jenjang-utils";

export interface KompetensiRefItem {
  kode: string;
  deskripsi: string;
  levelKognitif: "L1" | "L2" | "L3";
  tingkat: number;
  materi: string;
  subMateri: string;
}

function key(jenjang: string, mapel: string): string {
  return `${normalizeJenjang(jenjang)}__${mapel}`;
}

const REFERENSI: Record<string, KompetensiRefItem[]> = {
  [key("SMP/MTs", "Matematika")]: [
    { kode: "MTK.ALJ.BA.L1", deskripsi: "Menghitung operasi bentuk aljabar (penjumlahan, pengurangan, perkalian) serta mengidentifikasi sifat komutatif, asosiatif, dan distributif pada operasi tersebut", levelKognitif: "L1", tingkat: 9, materi: "Aljabar", subMateri: "Bentuk Aljabar" },
    { kode: "MTK.ALJ.BA.L2", deskripsi: "Mengaplikasikan sifat-sifat operasi aljabar untuk menyederhanakan atau menyelesaikan bentuk aljabar dalam permasalahan yang familiar.", levelKognitif: "L2", tingkat: 9, materi: "Aljabar", subMateri: "Bentuk Aljabar" },
    { kode: "MTK.ALJ.BA.L3", deskripsi: "Menganalisis dan melakukan generalisasi hubungan antar sifat operasi aljabar untuk menyelesaikan bentuk aljabar pada konteks yang tidak rutin.", levelKognitif: "L3", tingkat: 9, materi: "Aljabar", subMateri: "Bentuk Aljabar" },
    { kode: "MTK.ALJ.BD.L1", deskripsi: "Menghitung suku ke-n barisan atau jumlah deret berhingga, serta mengidentifikasi pola barisan aritmetika/geometri sederhana.", levelKognitif: "L1", tingkat: 9, materi: "Aljabar", subMateri: "Barisan dan Deret" },
    { kode: "MTK.ALJ.BD.L2", deskripsi: "Memodelkan pola bilangan pada situasi kontekstual sebagai barisan atau deret berhingga, lalu mengaplikasikan rumus suku/jumlah untuk menyelesaikannya", levelKognitif: "L2", tingkat: 9, materi: "Aljabar", subMateri: "Barisan dan Deret" },
    { kode: "MTK.ALJ.BD.L3", deskripsi: "Memecahkan masalah tidak rutin terkait barisan dan deret, serta melakukan generalisasi pola bilangan untuk menarik kesimpulan yang valid.", levelKognitif: "L3", tingkat: 9, materi: "Aljabar", subMateri: "Barisan dan Deret" },
    { kode: "MTK.ALJ.FUNG.L1", deskripsi: "Memahami informasi relasi dan fungsi dari berbagai bentuk penyajian (diagram panah, pasangan berurutan, grafik, tabel) serta mengidentifikasi domain, kodomain, dan range-nya.", levelKognitif: "L1", tingkat: 9, materi: "Aljabar", subMateri: "Fungsi" },
    { kode: "MTK.ALJ.FUNG.L2", deskripsi: "Menginterpretasikan dan mengaplikasikan konsep relasi/fungsi untuk menyelesaikan permasalahan kontekstual yang melibatkan domain, kodomain, dan range.", levelKognitif: "L2", tingkat: 9, materi: "Aljabar", subMateri: "Fungsi" },
    { kode: "MTK.ALJ.FUNG.L3", deskripsi: "Menganalisis hubungan antar unsur relasi dan fungsi pada situasi baru, serta menyimpulkan sifat fungsi berdasarkan penyajian yang diberikan", levelKognitif: "L3", tingkat: 9, materi: "Aljabar", subMateri: "Fungsi" },
    { kode: "MTK.ALJ.PPL.L1", deskripsi: "Menghitung penyelesaian persamaan dan pertidaksamaan linear satu variabel, serta mengidentifikasi bentuk sistem persamaan linear dua variabel", levelKognitif: "L1", tingkat: 9, materi: "Aljabar", subMateri: "Persamaan dan Pertidaksamaan Linear" },
    { kode: "MTK.ALJ.PPL.L2", deskripsi: "Memodelkan permasalahan kontekstual ke dalam persamaan/pertidaksamaan linear satu variabel atau sistem persamaan linear dua variabel, lalu mengaplikasikan prosedur penyelesaiannya.", levelKognitif: "L2", tingkat: 9, materi: "Aljabar", subMateri: "Persamaan dan Pertidaksamaan Linear" },
    { kode: "MTK.ALJ.PPL.L3", deskripsi: "Memecahkan masalah tidak rutin yang melibatkan sistem persamaan/pertidaksamaan linear, mengevaluasi kewajaran solusi, dan menyimpulkan penyelesaian yang valid.", levelKognitif: "L3", tingkat: 9, materi: "Aljabar", subMateri: "Persamaan dan Pertidaksamaan Linear" },
    { kode: "MTK.BIL.REAL.L1", deskripsi: "Menghitung hasil operasi aritmetika pada bilangan real (bulat, rasional, irasional, berpangkat, bentuk akar, notasi ilmiah), mengidentifikasi sifat-sifat bilangan serta faktorisasi prima, dan mengelompokkan bilangan berdasarkan sifat dan jenisnya.", levelKognitif: "L1", tingkat: 9, materi: "Bilangan", subMateri: "Bilangan Real" },
    { kode: "MTK.BIL.REAL.L2", deskripsi: "Mengaplikasikan konsep rasio, skala, proporsi, perbandingan senilai/berbalik nilai, serta estimasi hasil perhitungan untuk menyelesaikan masalah kontekstual sehari-hari yang familiar dan rutin.", levelKognitif: "L2", tingkat: 9, materi: "Bilangan", subMateri: "Bilangan Real" },
    { kode: "MTK.BIL.REAL.L3", deskripsi: "Menganalisis hubungan antar sifat bilangan dan rasio/laju perubahan pada situasi tidak rutin, mengevaluasi strategi perhitungan, serta menyimpulkan hasil penalaran kuantitatif terkait bilangan real.", levelKognitif: "L3", tingkat: 9, materi: "Bilangan", subMateri: "Bilangan Real" },
    { kode: "MTK.DAP.DATA.L1", deskripsi: "Memahami informasi dari penyajian data (diagram batang, garis, lingkaran, tabel) serta menghitung mean, median, modus, dan jangkauan suatu data.", levelKognitif: "L1", tingkat: 9, materi: "Data dan Peluang", subMateri: "Data" },
    { kode: "MTK.DAP.DATA.L2", deskripsi: "Menginterpretasikan dan mengaplikasikan ukuran pemusatan/penyebaran data untuk menjawab pertanyaan pada permasalahan kontekstual yang melibatkan penyajian data.", levelKognitif: "L2", tingkat: 9, materi: "Data dan Peluang", subMateri: "Data" },
    { kode: "MTK.DAP.DATA.L3", deskripsi: "Membandingkan dan mengevaluasi ukuran pemusatan serta penyebaran beberapa kelompok data, lalu menyimpulkan hasil interpretasinya secara tidak rutin.", levelKognitif: "L3", tingkat: 9, materi: "Data dan Peluang", subMateri: "Data" },
    { kode: "MTK.DAP.PELUANG.L1", deskripsi: "Menghitung peluang dan frekuensi relatif suatu kejadian tunggal berdasarkan ruang sampel yang diketahui.", levelKognitif: "L1", tingkat: 9, materi: "Data dan Peluang", subMateri: "Peluang" },
    { kode: "MTK.DAP.PELUANG.L2", deskripsi: "Mengaplikasikan konsep peluang dan frekuensi relatif untuk menyelesaikan permasalahan kontekstual kejadian tunggal", levelKognitif: "L2", tingkat: 9, materi: "Data dan Peluang", subMateri: "Peluang" },
    { kode: "MTK.DAP.PELUANG.L3", deskripsi: "Menganalisis dan menyimpulkan peluang suatu kejadian tunggal pada situasi baru yang tidak rutin, termasuk mengevaluasi kewajaran taksiran frekuensi relatifnya.", levelKognitif: "L3", tingkat: 9, materi: "Data dan Peluang", subMateri: "Peluang" },
    { kode: "MTK.GEO.OBJ.L1", deskripsi: "Mengidentifikasi hubungan antar sudut pada garis berpotongan/sejajar, mengenali unsur Teorema Pythagoras, serta mengelompokkan bangun datar kongruen/sebangun dan jaring-jaring bangun ruang.", levelKognitif: "L1", tingkat: 9, materi: "Geometri dan Pengukuran", subMateri: "Objek Geometri" },
    { kode: "MTK.GEO.OBJ.L2", deskripsi: "Mengaplikasikan hubungan antar sudut, Teorema Pythagoras, serta konsep kekongruenan/kesebangunan untuk menyelesaikan permasalahan bangun datar dan bangun ruang yang familiar.", levelKognitif: "L2", tingkat: 9, materi: "Geometri dan Pengukuran", subMateri: "Objek Geometri" },
    { kode: "MTK.GEO.OBJ.L3", deskripsi: "Menganalisis dan memecahkan masalah tidak rutin yang melibatkan hubungan antar sudut, Teorema Pythagoras, kekongruenan/kesebangunan, atau jaring-jaring bangun ruang secara terpadu.", levelKognitif: "L3", tingkat: 9, materi: "Geometri dan Pengukuran", subMateri: "Objek Geometri" },
    { kode: "MTK.GEO.TRANS.L1", deskripsi: "Mengidentifikasi hasil transformasi tunggal (refleksi, translasi, rotasi, dilatasi) pada titik, garis, atau bangun datar.", levelKognitif: "L1", tingkat: 9, materi: "Geometri dan Pengukuran", subMateri: "Transformasi Geometri" },
    { kode: "MTK.GEO.TRANS.L2", deskripsi: "Mengaplikasikan aturan transformasi tunggal untuk menentukan bayangan titik, garis, atau bangun datar pada permasalahan kontekstual.", levelKognitif: "L2", tingkat: 9, materi: "Geometri dan Pengukuran", subMateri: "Transformasi Geometri" },
    { kode: "MTK.GEO.TRANS.L3", deskripsi: "Menganalisis dan mengevaluasi hasil gabungan/perbandingan beberapa transformasi tunggal pada bangun datar dalam konteks yang tidak rutin.", levelKognitif: "L3", tingkat: 9, materi: "Geometri dan Pengukuran", subMateri: "Transformasi Geometri" },
    { kode: "MTK.GEO.UKUR.L1", deskripsi: "Menghitung keliling dan luas bangun datar (segi banyak, lingkaran, dan gabungannya) serta volume bangun ruang (prisma, limas, bola) berdasarkan rumus.", levelKognitif: "L1", tingkat: 9, materi: "Geometri dan Pengukuran", subMateri: "Pengukuran" },
    { kode: "MTK.GEO.UKUR.L2", deskripsi: "Mengaplikasikan rumus keliling, luas, dan volume untuk menyelesaikan permasalahan kontekstual terkait bangun datar dan bangun ruang.", levelKognitif: "L2", tingkat: 9, materi: "Geometri dan Pengukuran", subMateri: "Pengukuran" },
    { kode: "MTK.GEO.UKUR.L3", deskripsi: "Memecahkan masalah tidak rutin yang melibatkan kombinasi keliling, luas, dan volume beberapa bangun, serta mengevaluasi strategi penyelesaiannya.", levelKognitif: "L3", tingkat: 9, materi: "Geometri dan Pengukuran", subMateri: "Pengukuran" },
  ],
};

/** Mengembalikan daftar referensi kompetensi untuk kombinasi jenjang+mapel, atau null bila
 * belum tersedia (BUKAN error -- pemanggil menampilkan pesan "belum tersedia"). */
export function getReferensiKompetensi(jenjang: string, mapel: string): KompetensiRefItem[] | null {
  return REFERENSI[key(jenjang, mapel)] ?? null;
}

export function isTemplateAvailable(jenjang: string, mapel: string): boolean {
  return getReferensiKompetensi(jenjang, mapel) !== null;
}

/** Semua kombinasi jenjang+mapel yang datanya sudah tersedia (untuk UI pemilihan). */
export function listAvailableCombos(): Array<{ jenjang: string; mapel: string }> {
  return Object.keys(REFERENSI).map((k) => {
    const [jenjang, mapel] = k.split("__");
    return { jenjang, mapel };
  });
}
