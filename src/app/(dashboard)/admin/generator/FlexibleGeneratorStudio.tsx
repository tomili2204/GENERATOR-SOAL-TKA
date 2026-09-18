"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  Layers,
  BarChart2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Package,
  BookOpen,
  Search,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Bookmark,
  CheckSquare,
  Square,
} from "lucide-react";
import Link from "next/link";
import { TemaKonteksPoolItem } from "@/db/schema";

// ── MATRIKS RESMI ELEMEN & SUB-ELEMEN KURIKULUM PUSMENDIK / BSKAP ────────────
export interface ElementDefinition {
  name: string;
  subElements: string[];
  description?: string;
}

const CURRICULUM_ELEMENTS: Record<string, ElementDefinition[]> = {
  "SD/MI__Matematika": [
    {
      name: "Bilangan",
      subElements: ["Bilangan Rasional & Pecahan", "Bilangan Cacah Besar", "KPK & FPB"],
      description: "Pecahan biasa/desimal/persen, perbandingan pecahan, operasi bertingkat bilangan cacah, dan FPB/KPK.",
    },
    {
      name: "Geometri & Pengukuran",
      subElements: ["Objek Geometri (Bangun Datar/Ruang)", "Luas Gabungan Berarsir", "Volume Balok & Kubus", "Konversi Satuan Baku"],
      description: "Sifat bangun datar, keliling & luas berarsir, volume wadah berongga, dan satuan baku.",
    },
    {
      name: "Aljabar",
      subElements: ["Pola Konfigurasi Objek", "Barisan Bilangan", "Kalimat Terbuka Sederhana"],
      description: "Pola barisan membesar/mengecil, hubungan kesetaraan, dan kalimat matematika terbuka.",
    },
    {
      name: "Data & Peluang",
      subElements: ["Penyajian Data (Tabel/Diagram Batang)", "Mean & Modus Data Tunggal", "Piktogram"],
      description: "Tabel frekuensi, diagram batang, diagram garis, rata-rata gabungan, dan modus.",
    },
  ],
  "SMP/MTs__Matematika": [
    {
      name: "Bilangan",
      subElements: ["Bilangan Real & Operasi Bertanda", "Eksponen & Bentuk Akar", "Rasio & Skala Bertingkat", "Perbandingan Berbalik Nilai"],
      description: "Operasi bilangan bertanda (aturan skor/suhu), bilangan berpangkat, notasi ilmiah, dan perbandingan.",
    },
    {
      name: "Aljabar",
      subElements: ["SPLDV & PLSV Kontekstual", "Bentuk Aljabar & Pemfaktoran", "Relasi & Rumus Fungsi f(x)", "Barisan & Deret Aritmetika/Geometri"],
      description: "Sistem persamaan dua variabel (tarif/belanja), relasi fungsi linear/kuadrat, dan pola deret.",
    },
    {
      name: "Geometri & Pengukuran",
      subElements: ["Teorema Pythagoras", "Sudut Garis Transversal", "Luas Bangun Datar Berarsir", "Volume & Luas Prisma, Limas, Bola"],
      description: "Pythagoras kontekstual (jarak kapal/tiang), sudut garis sejajar, serta geometri ruang.",
    },
    {
      name: "Data & Peluang",
      subElements: ["Statistika Mean Gabungan", "Diagram Lingkaran & Kuartil", "Peluang Kejadian Tunggal"],
      description: "Analisis data mean gabungan data baru, ukuran pemusatan kuartil, dan peluang kejadian.",
    },
  ],
  "SD/MI__Bahasa Indonesia": [
    {
      name: "Teks Informasi",
      subElements: ["Teks Berita & Fakta Lokal", "Laporan Hasil Observasi", "Teks Prosedur & Langkah"],
      description: "Wacana faktual 150–200 kata terkait peristiwa lokal, sains sederhana, dan petunjuk teknis.",
    },
    {
      name: "Teks Fiksi & Sastra",
      subElements: ["Cerita Pendek & Fabel", "Tokoh & Penokohan Konkret", "Alur Maju & Nilai Moral"],
      description: "Wacana narasi fiksi anak dengan latar konkret, karakter tokoh jelas, dan pesan budi pekerti.",
    },
    {
      name: "Pemahaman Tekstual",
      subElements: ["Informasi Tersurat (5W+1H)", "Detail Fakta Eksplisit", "Makna Kata Kontekstual"],
      description: "Akurasi penarikan informasi dan fakta yang tertulis langsung di dalam teks wacana.",
    },
    {
      name: "Pemahaman Inferensial",
      subElements: ["Ide Pokok & Gagasan Utama", "Hubungan Sebab-Akibat", "Simpulan Paragraf"],
      description: "Menyimpulkan makna tersirat, hubungan kelogisan antarperistiwa, dan pesan utama.",
    },
    {
      name: "Evaluasi & Refleksi",
      subElements: ["Kesesuaian Judul & Isi", "Menilai Kelogisan Pesan", "Apresiasi Watak Tokoh"],
      description: "Menilai kelogisan isi teks wacana dan merefleksikan nilai positif dalam kehidupan sehari-hari.",
    },
  ],
  "SMP/MTs__Bahasa Indonesia": [
    {
      name: "Teks Informasi",
      subElements: ["Laporan Ilmiah & Observasi", "Teks Berita Analitis", "Teks Pidato & Argumentasi Persuasif"],
      description: "Wacana kritis 200–250 kata mengenai isu teknologi, sains, ekologi, dan dinamika sosial.",
    },
    {
      name: "Teks Fiksi & Sastra",
      subElements: ["Cerpen Realisme & Fiksi Ilmiah", "Puisi & Majas", "Biografi Tokoh Sejarah"],
      description: "Karya fiksi dan biografi dengan pendalaman unsur intrinsik, alur berliku, dan majas sastra.",
    },
    {
      name: "Pemahaman Tekstual",
      subElements: ["Informasi Tersurat Kompleks", "Pernyataan Sesuai Wacana", "Struktur Teks"],
      description: "Menemukan informasi eksplisit bertingkat dari teks wacana faktual dan sastra.",
    },
    {
      name: "Pemahaman Inferensial",
      subElements: ["Gagasan Pokok Multiparagraf", "Analisis Kausalitas Kompleks", "Prediksi Kelanjutan Peristiwa"],
      description: "Menghubungkan premis antarparagraf dan menyimpulkan implikasi logis dari wacana.",
    },
    {
      name: "Evaluasi & Refleksi",
      subElements: ["Fakta vs Opini", "Keabsahan Argumen Penulis", "Evaluasi Data & Deteksi Bias"],
      description: "Menguji validitas penalaran penulis, mendeteksi opini tersembunyi, dan keabsahan fakta wacana.",
    },
  ],
  "SMA/MA__Matematika": [
    {
      name: "Aljabar",
      subElements: ["SPLTV Kontekstual", "Program Linear & Optimasi", "Polinomial & Fungsi Lanjutan"],
      description: "Sistem persamaan 3 variabel, optimasi fungsi objektif, dan aljabar tingkat lanjut.",
    },
    {
      name: "Geometri & Pengukuran",
      subElements: ["Dimensi Tiga (Jarak Titik/Garis/Bidang)", "Trigonometri Sudut Elevasi/Depresi"],
      description: "Geometri ruang dimensi tiga dan aplikasi trigonometri kontekstual.",
    },
    {
      name: "Data & Peluang",
      subElements: ["Statistika Data Kelompok", "Peluang Kejadian Majemuk Saling Lepas/Bebas"],
      description: "Analisis distribusi frekuensi kelompok dan peluang gabungan bersyarat.",
    },
  ],
  "SMA/MA__Bahasa Indonesia": [
    {
      name: "Teks Informasi",
      subElements: ["Tajuk Rencana / Editorial", "Esai & Artikel Opini Kritis", "Laporan Riset Populer"],
      description: "Wacana analitis komprehensif isu nasional dan global dengan argumen multi-perspektif.",
    },
    {
      name: "Teks Fiksi & Sastra",
      subElements: ["Novel Sosial-Historis", "Kritik Sastra & Esai Budaya", "Drama Multibabak"],
      description: "Karya sastra kanonik dan kontemporer dengan nilai estetika dan sosiokultural tinggi.",
    },
    {
      name: "Kompetensi Membaca Kritis",
      subElements: ["Analisis Retorika & Bias", "Sintesis Antarteks", "Evaluasi Logika Argumen"],
      description: "Kemampuan mengevaluasi kredibilitas sumber, sintesis data silang, dan penalaran kritis.",
    },
  ],
};

// ── 29 TEMA STANDAR NUSANTARA (OFFLINE FALLBACK & SEED REFERENCE) ────────────
const DEFAULT_POOL_THEMES: TemaKonteksPoolItem[] = [
  { id: "tm-1", namaTema: "Maritim & Pesisir Nusantara", subKonteks: ["pelayaran perahu Pinisi", "kedalaman palung laut", "konservasi terumbu karang", "tambak garam", "pasang surut dermaga"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-2", namaTema: "Arsitektur Adat & Geometri Tradisional", subKonteks: ["atap Tongkonan/Rumah Gadang", "simetri candi", "proporsi motif batik"], jenjangCocok: ["SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-3", namaTema: "Ekonomi Kerakyatan & UMKM Daerah", subKonteks: ["pasar terapung", "sentra tenun", "koperasi tani", "kerajinan ukir"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-4", namaTema: "Biodiversitas & Konservasi Alam", subKonteks: ["taman nasional", "konservasi satwa", "restorasi mangrove", "persebaran fauna"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-5", namaTema: "Teknologi Terapan & Infrastruktur Hijau", subKonteks: ["PLTS", "energi panas bumi", "irigasi tradisional", "logistik antar-pulau"], jenjangCocok: ["SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-6", namaTema: "Pangan Tradisional & Kimia/Biologi Lokal", subKonteks: ["fermentasi tempe/tape", "produksi sagu", "minyak kelapa", "gula aren"], jenjangCocok: ["SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-7", namaTema: "Festival Budaya & Olahraga Nusantara", subKonteks: ["karapan sapi", "tradisi lompat batu", "festival layang-layang"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-8", namaTema: "Perdagangan & Ekonomi Rumah Tangga", subKonteks: ["warung", "koperasi sekolah", "pasar tradisional"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-9", namaTema: "Pertanian & Perikanan", subKonteks: ["hasil panen", "luas lahan", "hasil tangkapan nelayan"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-10", namaTema: "Transportasi & Perjalanan", subKonteks: ["jadwal kendaraan umum", "jarak antarkota", "bahan bakar"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-11", namaTema: "Olahraga & Kesehatan", subKonteks: ["statistik pertandingan", "waktu latihan", "gizi"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-12", namaTema: "Lingkungan & Cuaca", subKonteks: ["curah hujan", "suhu", "sampah", "daur ulang", "debit air"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-13", namaTema: "Kegiatan Sekolah & Organisasi", subKonteks: ["OSIS", "ekstrakurikuler", "perpustakaan", "study tour"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-14", namaTema: "Kependudukan & Data Sosial", subKonteks: ["jumlah penduduk desa/kecamatan", "survei sederhana"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-15", namaTema: "Teknologi & Literasi Digital", subKonteks: ["penggunaan gawai", "kuota data", "aplikasi belajar"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-16", namaTema: "Keuangan Pribadi & Tabungan", subKonteks: ["uang saku", "tabungan", "sedekah", "koperasi simpan pinjam"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-17", namaTema: "Pertanian & Perkebunan Nusantara", subKonteks: ["hasil panen padi/jagung", "luas lahan sawah", "hasil kebun kopi/teh", "pola tanam"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-18", namaTema: "Peternakan & Perikanan Darat", subKonteks: ["jumlah ternak", "produksi telur/susu", "kolam ikan", "kebutuhan pakan ternak"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-19", namaTema: "Bangunan & Tata Ruang", subKonteks: ["denah rumah/sekolah", "renovasi", "luas tanah", "jumlah ubin lantai"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-20", namaTema: "Kerajinan & Industri Lokal", subKonteks: ["kerajinan bambu/rotan", "produksi UMKM", "kemasan produk"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-21", namaTema: "Seni & Musik Tradisional", subKonteks: ["alat musik daerah", "jadwal latihan sanggar", "penjualan tiket pertunjukan"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-22", namaTema: "Kuliner & Pangan Sehari-hari", subKonteks: ["takaran resep", "porsi katering", "harga bahan pokok"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-23", namaTema: "Wisata & Geografi Daerah", subKonteks: ["jarak antar destinasi wisata", "jumlah pengunjung", "luas taman wisata"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-24", namaTema: "Ekonomi Kerakyatan & UMKM Lanjut", subKonteks: ["rantai pasok", "margin keuntungan usaha", "ekspor produk lokal"], jenjangCocok: ["SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-25", namaTema: "Dunia Kerja & Profesi", subKonteks: ["upah harian buruh/tukang", "jadwal shift kerja pabrik/toko", "estimasi biaya proyek renovasi sederhana", "penggajian karyawan toko kecil"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-26", namaTema: "Pelayanan Publik & Administrasi Desa/Kota", subKonteks: ["jadwal dan antrean posyandu/puskesmas", "data pemilih desa", "anggaran RT/RW", "distribusi bantuan sosial", "sistem antrean layanan publik"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-27", namaTema: "Kesehatan Masyarakat", subKonteks: ["data cakupan imunisasi", "angka harapan hidup", "penyebaran penyakit musiman", "gizi dan pertumbuhan anak"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-28", namaTema: "Literasi Keuangan Lanjut", subKonteks: ["bunga tabungan/deposito berjangka", "cicilan atau kredit barang", "tagihan listrik/air/pulsa bulanan", "penyusutan (depresiasi) nilai barang"], jenjangCocok: ["SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
  { id: "tm-29", namaTema: "Pemerataan & Keadilan Sosial", subKonteks: ["distribusi buku/alat sekolah antar sekolah", "kesenjangan akses fasilitas desa-kota", "pembagian sumber daya yang adil", "perbandingan capaian antarwilayah"], jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"], aktif: true, createdAt: new Date(), updatedAt: new Date() },
];

interface FlexibleGeneratorStudioProps {
  onGenerateComplete?: () => void;
  initialThemes?: TemaKonteksPoolItem[];
}

export function FlexibleGeneratorStudio({
  onGenerateComplete,
  initialThemes = [],
}: FlexibleGeneratorStudioProps) {
  const [jenjang, setJenjang] = useState("SD/MI");
  const [mapel, setMapel] = useState("Matematika");
  const [availableMapels, setAvailableMapels] = useState<string[]>(["Matematika", "Bahasa Indonesia"]);
  const [totalSoal, setTotalSoal] = useState(30);

  // Ambil daftar mapel dinamis dari taksonomi
  useEffect(() => {
    fetch("/api/taxonomy")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.mapels?.length > 0) {
          setAvailableMapels(json.data.mapels);
        }
      })
      .catch((err) => console.error("Error loading taxonomies in studio:", err));
  }, []);

  // ── Elemen / Materi Kurikulum State ─────────────────────────────────────────
  const curriculumKey = `${jenjang}__${mapel}`;
  const defaultElementsForSubject: ElementDefinition[] = useMemo(() => {
    return (
      CURRICULUM_ELEMENTS[curriculumKey] ||
      CURRICULUM_ELEMENTS[`SD/MI__${mapel}`] || [
        { name: "Materi Inti 1", subElements: ["Konsep Dasar", "Aplikasi"], description: "Materi kurikulum resmi." },
        { name: "Materi Inti 2", subElements: ["Penalaran HOTS"], description: "Penalaran bertingkat." },
      ]
    );
  }, [curriculumKey, mapel]);

  // Mode Elemen: "all" (semua materi) atau "selective" (pilih sebagian)
  const [elementMode, setElementMode] = useState<"all" | "selective">("all");
  const [selectedElementNames, setSelectedElementNames] = useState<string[]>(
    defaultElementsForSubject.map((e) => e.name)
  );

  // Reset pilihan elemen saat jenjang atau mapel berganti
  useEffect(() => {
    setSelectedElementNames(defaultElementsForSubject.map((e) => e.name));
    setElementMode("all");
  }, [defaultElementsForSubject]);

  const toggleElementSelect = (elemName: string) => {
    setSelectedElementNames((prev) => {
      if (prev.includes(elemName)) {
        if (prev.length === 1) return prev; // Minimal 1 elemen
        return prev.filter((n) => n !== elemName);
      } else {
        return [...prev, elemName];
      }
    });
  };

  const handleSelectAllElements = () => {
    setSelectedElementNames(defaultElementsForSubject.map((e) => e.name));
  };

  // ── Pool Tema Konteks (29 Tema) ────────────────────────────────────────────
  const [themes, setThemes] = useState<TemaKonteksPoolItem[]>(
    initialThemes.length > 0 ? initialThemes : DEFAULT_POOL_THEMES
  );

  useEffect(() => {
    if (initialThemes.length === 0) {
      fetch("/api/admin/tema-pool")
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            setThemes(json.data);
          }
        })
        .catch((err) => console.error("Error fetching tema pool in studio:", err));
    }
  }, [initialThemes]);

  const [themeMode, setThemeMode] = useState<"auto_multi" | "manual_pool">("auto_multi");
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [themeSearchQuery, setThemeSearchQuery] = useState("");
  const [themeFilterJenjang, setThemeFilterJenjang] = useState<"sesuai" | "semua">("sesuai");

  // Distribusi Bentuk
  const [distPG, setDistPG] = useState(16);
  const [distMCMA, setDistMCMA] = useState(8);
  const [distKategori, setDistKategori] = useState(6);

  // Distribusi Kesulitan
  const [distRendah, setDistRendah] = useState(8);
  const [distSedang, setDistSedang] = useState(14);
  const [distTinggi, setDistTinggi] = useState(8);

  // Instruksi Tambahan & Mode
  const [customInstruction, setCustomInstruction] = useState("");
  const [useMock, setUseMock] = useState(false);

  // Status Eksekusi
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    packageCode?: string;
    packageId?: string;
    totalLolos: number;
    totalGagal: number;
    detailPemeriksaan?: Array<{ index: number; reason: string; itemTitle?: string }>;
    errorMessage?: string;
  } | null>(null);

  const normJenjang = jenjang.includes("SD")
    ? "SD/MI"
    : jenjang.includes("SMP")
    ? "SMP/MTs"
    : jenjang.includes("SMA")
    ? "SMA/MA"
    : jenjang.includes("SMK")
    ? "SMK/MAK"
    : jenjang;

  // Filter daftar tema
  const filteredThemes = useMemo(() => {
    return themes.filter((item) => {
      if (!item.aktif) return false;

      if (themeFilterJenjang === "sesuai") {
        const cocok = item.jenjangCocok || ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"];
        const match = cocok.includes(jenjang) || cocok.includes(normJenjang);
        if (!match) return false;
      }

      if (themeSearchQuery.trim()) {
        const query = themeSearchQuery.toLowerCase().trim();
        const matchNama = item.namaTema.toLowerCase().includes(query);
        const matchSub = Array.isArray(item.subKonteks) && item.subKonteks.some((s) => s.toLowerCase().includes(query));
        if (!matchNama && !matchSub) return false;
      }

      return true;
    });
  }, [themes, themeFilterJenjang, themeSearchQuery, jenjang, normJenjang]);

  const toggleThemeSelect = (themeId: string) => {
    setSelectedThemeIds((prev) =>
      prev.includes(themeId) ? prev.filter((id) => id !== themeId) : [...prev, themeId]
    );
  };

  const handleSelectAllVisibleThemes = () => {
    const visibleIds = filteredThemes.map((t) => t.id);
    setSelectedThemeIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleClearSelectedThemes = () => {
    setSelectedThemeIds([]);
  };

  function handleTotalChange(newTotal: number) {
    if (newTotal <= 0) return;
    setTotalSoal(newTotal);
    const pg = Math.round(newTotal * 0.53);
    const mcma = Math.round(newTotal * 0.27);
    const kat = newTotal - pg - mcma;
    setDistPG(pg);
    setDistMCMA(mcma);
    setDistKategori(kat);

    const r = Math.round(newTotal * 0.27);
    const s = Math.round(newTotal * 0.46);
    const t = newTotal - r - s;
    setDistRendah(r);
    setDistSedang(s);
    setDistTinggi(t);
  }

  const sumBentuk = distPG + distMCMA + distKategori;
  const isBentukBalanced = sumBentuk === totalSoal;

  const sumKesulitan = distRendah + distSedang + distTinggi;
  const isKesulitanBalanced = sumKesulitan === totalSoal;

  const selectedThemeObjects = useMemo(() => {
    return themes
      .filter((t) => selectedThemeIds.includes(t.id))
      .map((t) => ({
        namaTema: t.namaTema,
        subKonteks: t.subKonteks,
      }));
  }, [themes, selectedThemeIds]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setIsGenerating(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/generator/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenjang,
          mapel,
          totalSoal,
          distribusiBentuk: {
            PG: distPG,
            PGK_MCMA: distMCMA,
            PGK_KATEGORI: distKategori,
          },
          distribusiKesulitan: {
            rendah: distRendah,
            sedang: distSedang,
            tinggi: distTinggi,
          },
          // Parameter Elemen / Materi
          selectedElements: elementMode === "selective" ? selectedElementNames : undefined,
          elementMode,
          // Parameter Tema Konteks
          selectedThemes: themeMode === "manual_pool" && selectedThemeObjects.length > 0 ? selectedThemeObjects : undefined,
          themeMode,
          customInstruction: customInstruction.trim() || undefined,
          forceMock: useMock,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setResult({
          success: false,
          totalLolos: data.data?.totalLolos || 0,
          totalGagal: data.data?.totalGagal || 0,
          errorMessage: data.data?.errorMessage || data.error || "Proses generate gagal.",
          detailPemeriksaan: data.data?.detailPemeriksaan || [],
        });
      } else {
        setResult({
          success: true,
          packageCode: data.data?.packageCode,
          packageId: data.data?.packageId,
          totalLolos: data.data?.totalLolos || 0,
          totalGagal: data.data?.totalGagal || 0,
          detailPemeriksaan: data.data?.detailPemeriksaan || [],
        });

        if (onGenerateComplete) onGenerateComplete();
      }
    } catch (err: any) {
      setResult({
        success: false,
        totalLolos: 0,
        totalGagal: 0,
        errorMessage: `Kendala jaringan: ${err.message}`,
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Kartu Feedback Hasil Generate */}
      {result && (
        <div
          className={`p-5 rounded-xl border transition-all ${
            result.success
              ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
              : "bg-rose-50/90 border-rose-300 text-rose-950"
          }`}
        >
          <div className="flex items-start gap-3.5">
            {result.success ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-2">
              <h4 className="font-bold text-sm flex items-center gap-2">
                {result.success
                  ? `Paket Soal AI #${result.packageCode} Berhasil Dibuat!`
                  : "Proses Pembuatan Soal Menemui Kendala"}
              </h4>
              <p className="text-xs leading-relaxed font-sans">
                {result.success
                  ? `Berhasil meloloskan ${result.totalLolos} butir soal melalui gerbang sanitasi otomatis (${result.totalGagal} ditolak). Seluruh soal telah diberi status "menunggu_validasi" dan dapat langsung ditelaah oleh tim Validator Soal.`
                  : result.errorMessage}
              </p>

              {result.packageId && (
                <div className="pt-2 flex items-center gap-3">
                  <Link
                    href={`/pembuat/paket/${result.packageId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white font-sans text-xs font-bold rounded-lg hover:bg-emerald-800 shadow-xs transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    Buka & Tinjau Paket #{result.packageCode} &rarr;
                  </Link>
                  <Link
                    href="/validator/antrean"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-emerald-800 border border-emerald-300 font-sans text-xs font-semibold rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    Lihat di Antrean Validasi
                  </Link>
                </div>
              )}

              {result.detailPemeriksaan && result.detailPemeriksaan.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-200/60 text-xs">
                  <span className="font-bold font-mono text-amber-900 block mb-1">
                    Catatan Butir Ditolak Gerbang Sanitasi ({result.detailPemeriksaan.length} butir):
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {result.detailPemeriksaan.map((f, idx) => (
                      <div key={idx} className="p-2 bg-white/80 rounded border border-amber-200 text-[11px] font-mono">
                        <span className="font-bold">Butir #{f.index}:</span> {f.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Panel 1: Sasaran Kurikulum */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold font-mono text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Jenjang Sasaran
            </label>
            <select
              value={jenjang}
              onChange={(e) => setJenjang(e.target.value)}
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 font-semibold"
            >
              <option value="SD/MI">SD / MI</option>
              <option value="SMP/MTs">SMP / MTs</option>
              <option value="SMA/MA">SMA / MA</option>
              <option value="SMK/MAK">SMK / MAK</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold font-mono text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              Mata Pelajaran
            </label>
            <select
              value={mapel}
              onChange={(e) => setMapel(e.target.value)}
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800 font-semibold"
            >
              {availableMapels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold font-mono text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Target Jumlah Soal</span>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                Standar Paket: 30
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={50}
                value={totalSoal}
                onChange={(e) => handleTotalChange(parseInt(e.target.value) || 30)}
                className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 font-bold"
              />
              <span className="text-xs font-mono text-slate-500 shrink-0">butir</span>
            </div>
          </div>
        </div>

        {/* Panel 2: Cakupan Elemen / Materi Kurikulum (Fleksibel: Semua vs Sebagian) */}
        <div className="rounded-2xl border border-sky-200 bg-white overflow-hidden shadow-xs space-y-0">
          <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-50/90 via-white to-blue-50/60 border-b border-sky-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Bookmark className="w-4 h-4 text-sky-600 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900">
                  CAKUPAN ELEMEN / MATERI KURIKULUM ({defaultElementsForSubject.length} ELEMEN)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-sky-100 text-sky-800">
                  {jenjang} • {mapel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tentukan apakah pembuatan soal mengeksekusi seluruh materi kurikulum atau difokuskan pada elemen/materi tertentu saja (misal untuk kisi-kisi khusus atau uji coba remedial).
              </p>
            </div>

            {/* Switch Mode: Semua Elemen vs Pilih Sebagian Elemen */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setElementMode("all");
                  setSelectedElementNames(defaultElementsForSubject.map((e) => e.name));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  elementMode === "all"
                    ? "bg-white text-sky-700 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ⚡ Semua Elemen (100%)
              </button>
              <button
                type="button"
                onClick={() => setElementMode("selective")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  elementMode === "selective"
                    ? "bg-white text-sky-700 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🎯 Pilih Sebagian ({selectedElementNames.length})
              </button>
            </div>
          </div>

          {/* Isi Mode 1: Semua Elemen */}
          {elementMode === "all" && (
            <div className="p-4 sm:p-5 bg-sky-50/30 border-b border-sky-100/60 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Check className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-sky-950 font-mono">
                  Mode Komprehensif: Mengeksekusi Seluruh {defaultElementsForSubject.length} Elemen Materi
                </h4>
                <p className="text-slate-600 leading-relaxed font-sans">
                  Sistem AI akan menyebarkan {totalSoal} butir soal secara proporsional ke seluruh elemen resmi:{" "}
                  <strong>{defaultElementsForSubject.map((e) => e.name).join(", ")}</strong>. Cocok untuk simulasi paket Tryout Nasional standar.
                </p>
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {defaultElementsForSubject.map((e) => (
                    <span
                      key={e.name}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-white border border-sky-200 text-sky-800"
                    >
                      ✓ {e.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Isi Mode 2: Pilih Sebagian Elemen */}
          {elementMode === "selective" && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-100">
                <div className="text-xs font-mono">
                  <span className="text-slate-500">Elemen yang akan digenerate:</span>{" "}
                  <span className="font-bold text-sky-700">
                    {selectedElementNames.length} dari {defaultElementsForSubject.length} elemen dipilih
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllElements}
                    className="text-xs font-mono text-sky-600 hover:underline font-semibold cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                </div>
              </div>

              {/* Grid Kartu Elemen dengan Sub-Elemen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {defaultElementsForSubject.map((elem) => {
                  const isChecked = selectedElementNames.includes(elem.name);
                  return (
                    <div
                      key={elem.name}
                      onClick={() => toggleElementSelect(elem.name)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-sky-50/70 border-sky-300 shadow-xs"
                          : "bg-slate-50/60 border-slate-200 hover:bg-slate-100/60 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 text-sky-600">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 fill-sky-100 text-sky-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold font-mono text-slate-900">
                              {elem.name}
                            </h4>
                            {isChecked && (
                              <span className="text-[10px] font-mono text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded font-semibold">
                                Aktif
                              </span>
                            )}
                          </div>
                          {elem.description && (
                            <p className="text-[11px] text-slate-500 leading-snug font-sans">
                              {elem.description}
                            </p>
                          )}
                          <div className="pt-1.5 flex flex-wrap gap-1">
                            {elem.subElements.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white text-slate-600 border border-slate-200"
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedElementNames.length === 0 && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-mono">
                  ⚠️ Mohon pilih minimal 1 elemen materi kurikulum untuk proses generate.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel 3: Distribusi Psikometrik Bentuk & Kesulitan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          {/* Bentuk Soal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                Komposisi Bentuk Soal
              </h4>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  isBentukBalanced
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {sumBentuk} / {totalSoal} butir
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="block text-[10px] font-mono text-slate-500 uppercase">PG Biasa</span>
                <input
                  type="number"
                  min={0}
                  max={totalSoal}
                  value={distPG}
                  onChange={(e) => setDistPG(parseInt(e.target.value) || 0)}
                  className="w-full text-center text-xs font-bold font-mono text-slate-900 mt-1 border-b border-slate-300 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="block text-[10px] font-mono text-slate-500 uppercase">PGK MCMA</span>
                <input
                  type="number"
                  min={0}
                  max={totalSoal}
                  value={distMCMA}
                  onChange={(e) => setDistMCMA(parseInt(e.target.value) || 0)}
                  className="w-full text-center text-xs font-bold font-mono text-slate-900 mt-1 border-b border-slate-300 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="block text-[10px] font-mono text-slate-500 uppercase">PGK Kategori</span>
                <input
                  type="number"
                  min={0}
                  max={totalSoal}
                  value={distKategori}
                  onChange={(e) => setDistKategori(parseInt(e.target.value) || 0)}
                  className="w-full text-center text-xs font-bold font-mono text-slate-900 mt-1 border-b border-slate-300 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tingkat Kesulitan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                Sebaran Tingkat Kesulitan
              </h4>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  isKesulitanBalanced
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {sumKesulitan} / {totalSoal} butir
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="block text-[10px] font-mono text-emerald-600 uppercase">Rendah</span>
                <input
                  type="number"
                  min={0}
                  max={totalSoal}
                  value={distRendah}
                  onChange={(e) => setDistRendah(parseInt(e.target.value) || 0)}
                  className="w-full text-center text-xs font-bold font-mono text-slate-900 mt-1 border-b border-slate-300 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="block text-[10px] font-mono text-amber-600 uppercase">Sedang</span>
                <input
                  type="number"
                  min={0}
                  max={totalSoal}
                  value={distSedang}
                  onChange={(e) => setDistSedang(parseInt(e.target.value) || 0)}
                  className="w-full text-center text-xs font-bold font-mono text-slate-900 mt-1 border-b border-slate-300 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="block text-[10px] font-mono text-rose-600 uppercase">Tinggi</span>
                <input
                  type="number"
                  min={0}
                  max={totalSoal}
                  value={distTinggi}
                  onChange={(e) => setDistTinggi(parseInt(e.target.value) || 0)}
                  className="w-full text-center text-xs font-bold font-mono text-slate-900 mt-1 border-b border-slate-300 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Panel 4: Pool Tema Konteks Generator AI (29 Tema Standar Nusantara) */}
        <div className="rounded-2xl border border-indigo-200/90 bg-white overflow-hidden shadow-xs space-y-0">
          <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/90 via-white to-violet-50/70 border-b border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900">
                  POOL TEMA KONTEKS GENERATOR AI ({themes.length} TEMA)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-100 text-indigo-800">
                  Standar Tryout Nasional ayotka.id
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Daftar domain/tema dan sub-konteks nusantara yang dipilih untuk membungkus soal. Satu paket Tryout Nasional (30 butir) memadukan ragam tema agar kontekstual dan bervariasi.
              </p>
            </div>

            {/* Switch Mode: Multi-Tema Otomatis vs Pilih Tema Tertentu */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setThemeMode("auto_multi")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  themeMode === "auto_multi"
                    ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ⚡ Multi-Tema Otomatis (Tryout)
              </button>
              <button
                type="button"
                onClick={() => setThemeMode("manual_pool")}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  themeMode === "manual_pool"
                    ? "bg-white text-indigo-700 shadow-xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🎯 Pilih Tema Tertentu {selectedThemeIds.length > 0 && `(${selectedThemeIds.length})`}
              </button>
            </div>
          </div>

          {/* Isi Mode 1: Multi-Tema Otomatis */}
          {themeMode === "auto_multi" && (
            <div className="p-4 sm:p-5 bg-indigo-50/30 border-b border-indigo-100/60 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Check className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-indigo-950 font-mono flex items-center gap-2">
                  <span>Mode Multi-Tema Otomatis Aktif (Format Resmi Tryout Nasional)</span>
                </h4>
                <p className="text-slate-600 leading-relaxed font-sans">
                  Sistem AI akan mengombinasikan 4–5 tema dan sub-konteks nusantara yang paling relevan untuk jenjang <strong>{jenjang}</strong>, lalu mendistribusikannya secara berimbang ke seluruh 30 butir soal. Paket soal yang dihasilkan menjadi kaya konteks, variatif, dan tidak monoton.
                </p>
                <div className="pt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500">Tersedia:</span>
                  <span className="px-2 py-0.5 bg-white rounded border border-slate-200 font-mono text-[10.5px] text-slate-700 font-semibold">
                    {filteredThemes.length} tema aktif cocok untuk {jenjang}
                  </span>
                  <button
                    type="button"
                    onClick={() => setThemeMode("manual_pool")}
                    className="text-[11px] font-mono text-indigo-600 hover:underline font-semibold ml-1 cursor-pointer"
                  >
                    Ingin menentukan tema spesifik sendiri? Klik di sini &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Isi Mode 2: Pilih Tema Tertentu dari Pool */}
          {themeMode === "manual_pool" && (
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={themeSearchQuery}
                    onChange={(e) => setThemeSearchQuery(e.target.value)}
                    placeholder="Cari tema atau sub-konteks..."
                    className="w-full pl-9 pr-3.5 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white placeholder:text-slate-400"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <select
                      value={themeFilterJenjang}
                      onChange={(e) => setThemeFilterJenjang(e.target.value as any)}
                      className="bg-transparent text-slate-700 font-semibold focus:outline-none text-xs"
                    >
                      <option value="sesuai">Sesuai {jenjang}</option>
                      <option value="semua">Semua Jenjang</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllVisibleThemes}
                    className="px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200 cursor-pointer"
                  >
                    Pilih Semua ({filteredThemes.length})
                  </button>

                  {selectedThemeIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelectedThemes}
                      className="px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Pilihan
                    </button>
                  )}
                </div>
              </div>

              {selectedThemeObjects.length > 0 && (
                <div className="p-3 bg-violet-50/70 border border-violet-200 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono font-bold text-violet-950">
                    <span>
                      ✓ {selectedThemeObjects.length} Tema Terpilih untuk Paket Ini:
                    </span>
                    <span className="text-[11px] text-violet-700 font-semibold">
                      {selectedThemeObjects.length === 1 ? "Fokus 1 Tema Beragam Sub-Konteks" : "Multi-Tema Terpadu"}
                    </span>
                  </div>
                  <p className="text-violet-800 text-[11.5px] leading-relaxed">
                    {selectedThemeObjects.map((t) => t.namaTema).join(" • ")}
                  </p>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10.5px] font-mono sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 w-10 text-center">Pilih</th>
                        <th className="px-4 py-2.5 font-bold">Nama Domain / Tema</th>
                        <th className="px-4 py-2.5 font-bold">Contoh Sub-Konteks</th>
                        <th className="px-4 py-2.5 font-bold text-right">Jenjang Cocok</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredThemes.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-mono">
                            Tidak ada tema yang cocok dengan filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredThemes.map((item) => {
                          const isSelected = selectedThemeIds.includes(item.id);
                          return (
                            <tr
                              key={item.id}
                              onClick={() => toggleThemeSelect(item.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? "bg-indigo-50/60" : "hover:bg-slate-50/60"
                              }`}
                            >
                              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleThemeSelect(item.id)}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                                  <span className="font-bold text-slate-900">{item.namaTema}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {Array.isArray(item.subKonteks) &&
                                    item.subKonteks.map((sub, sIdx) => (
                                      <span
                                        key={sIdx}
                                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200/80"
                                      >
                                        {sub}
                                      </span>
                                    ))}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {Array.isArray(item.jenjangCocok) &&
                                    item.jenjangCocok.map((j, jIdx) => (
                                      <span
                                        key={jIdx}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                          j === jenjang || j === normJenjang
                                            ? "bg-indigo-100 text-indigo-800 font-bold"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {j}
                                      </span>
                                    ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel 5: Instruksi Konteks Tambahan */}
        <div>
          <label className="block text-xs font-bold font-mono text-slate-800 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Instruksi Tambahan / Fokus Khusus (Opsional)
            </span>
            <span className="text-[10px] text-slate-400 font-sans font-normal">
              Disisipkan ke prompt pengguna tanpa mengubah System Prompt BSKAP
            </span>
          </label>
          <textarea
            rows={2}
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            placeholder="Contoh: Fokuskan materi geometri pada luas permukaan limas; gunakan konteks perdagangan pasar tradisional Jawa Barat."
            className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white placeholder:text-slate-400"
          />
        </div>

        {/* Panel 6: Pilihan Mode Eksekusi & Tombol Trigger */}
        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useMock}
                onChange={(e) => setUseMock(e.target.checked)}
                className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="text-xs font-bold font-mono text-indigo-950">
                Gunakan Mode Uji Coba Cepat (Mock Generator Offline)
              </span>
            </label>
            <p className="text-[11px] text-indigo-800/80 font-sans">
              {useMock
                ? "Simulasi instan menghasilkan paket dan stimulus valid lengkap tanpa memanggil API Google AI (hemat kuota)."
                : "Akan memanggil Google Gemini API secara langsung menggunakan API Key yang tersimpan."}
            </p>
          </div>

          <button
            type="submit"
            disabled={
              isGenerating ||
              !isBentukBalanced ||
              !isKesulitanBalanced ||
              (elementMode === "selective" && selectedElementNames.length === 0)
            }
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-md transition-all disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
            )}
            <span>{isGenerating ? "Memproses Pembuatan Soal..." : "🚀 Jalankan Generator Sekarang"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
