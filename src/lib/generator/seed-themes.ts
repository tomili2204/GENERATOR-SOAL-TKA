import { db } from "@/db";
import { temaKonteksPool } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface InitialTheme {
  namaTema: string;
  subKonteks: string[];
  jenjangCocok: string[];
  aktif: boolean;
}

export const INITIAL_THEMES: InitialTheme[] = [
  // --- 16 TEMA AWAL ---
  {
    namaTema: "Maritim & Pesisir Nusantara",
    subKonteks: ["pelayaran perahu Pinisi", "kedalaman palung laut", "konservasi terumbu karang", "tambak garam", "pasang surut dermaga"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Arsitektur Adat & Geometri Tradisional",
    subKonteks: ["atap Tongkonan/Rumah Gadang", "simetri candi", "proporsi motif batik"],
    jenjangCocok: ["SMP/MTs", "SMA/MA", "SMK/MAK"], // Khusus SMP ke atas
    aktif: true,
  },
  {
    namaTema: "Ekonomi Kerakyatan & UMKM Daerah",
    subKonteks: ["pasar terapung", "sentra tenun", "koperasi tani", "kerajinan ukir"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Biodiversitas & Konservasi Alam",
    subKonteks: ["taman nasional", "konservasi satwa", "restorasi mangrove", "persebaran fauna"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Teknologi Terapan & Infrastruktur Hijau",
    subKonteks: ["PLTS", "energi panas bumi", "irigasi tradisional", "logistik antar-pulau"],
    jenjangCocok: ["SMP/MTs", "SMA/MA", "SMK/MAK"], // Khusus SMP ke atas
    aktif: true,
  },
  {
    namaTema: "Pangan Tradisional & Kimia/Biologi Lokal",
    subKonteks: ["fermentasi tempe/tape", "produksi sagu", "minyak kelapa", "gula aren"],
    jenjangCocok: ["SMP/MTs", "SMA/MA", "SMK/MAK"], // Khusus SMP ke atas
    aktif: true,
  },
  {
    namaTema: "Festival Budaya & Olahraga Nusantara",
    subKonteks: ["karapan sapi", "tradisi lompat batu", "festival layang-layang"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Perdagangan & Ekonomi Rumah Tangga",
    subKonteks: ["warung", "koperasi sekolah", "pasar tradisional"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Pertanian & Perikanan",
    subKonteks: ["hasil panen", "luas lahan", "hasil tangkapan nelayan"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Transportasi & Perjalanan",
    subKonteks: ["jadwal kendaraan umum", "jarak antarkota", "bahan bakar"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Olahraga & Kesehatan",
    subKonteks: ["statistik pertandingan", "waktu latihan", "gizi"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Lingkungan & Cuaca",
    subKonteks: ["curah hujan", "suhu", "sampah", "daur ulang", "debit air"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Kegiatan Sekolah & Organisasi",
    subKonteks: ["OSIS", "ekstrakurikuler", "perpustakaan", "study tour"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Kependudukan & Data Sosial",
    subKonteks: ["jumlah penduduk desa/kecamatan", "survei sederhana"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Teknologi & Literasi Digital",
    subKonteks: ["penggunaan gawai", "kuota data", "aplikasi belajar"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Keuangan Pribadi & Tabungan",
    subKonteks: ["uang saku", "tabungan", "sedekah", "koperasi simpan pinjam"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },

  // --- 8 TEMA BARU ---
  {
    namaTema: "Pertanian & Perkebunan Nusantara",
    subKonteks: ["hasil panen padi/jagung", "luas lahan sawah", "hasil kebun kopi/teh", "pola tanam"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Peternakan & Perikanan Darat",
    subKonteks: ["jumlah ternak", "produksi telur/susu", "kolam ikan", "kebutuhan pakan ternak"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Bangunan & Tata Ruang",
    subKonteks: ["denah rumah/sekolah", "renovasi", "luas tanah", "jumlah ubin lantai"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Kerajinan & Industri Lokal",
    subKonteks: ["kerajinan bambu/rotan", "produksi UMKM", "kemasan produk"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Seni & Musik Tradisional",
    subKonteks: ["alat musik daerah", "jadwal latihan sanggar", "penjualan tiket pertunjukan"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Kuliner & Pangan Sehari-hari",
    subKonteks: ["takaran resep", "porsi katering", "harga bahan pokok"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Wisata & Geografi Daerah",
    subKonteks: ["jarak antar destinasi wisata", "jumlah pengunjung", "luas taman wisata"],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Ekonomi Kerakyatan & UMKM Lanjut",
    subKonteks: ["rantai pasok", "margin keuntungan usaha", "ekspor produk lokal"],
    jenjangCocok: ["SMP/MTs", "SMA/MA", "SMK/MAK"], // Khusus SMP ke atas
    aktif: true,
  },

  // --- 5 TEMA TAMBAHAN BARU ---
  {
    namaTema: "Dunia Kerja & Profesi",
    subKonteks: [
      "upah harian buruh/tukang",
      "jadwal shift kerja pabrik/toko",
      "estimasi biaya proyek renovasi sederhana",
      "penggajian karyawan toko kecil",
    ],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Pelayanan Publik & Administrasi Desa/Kota",
    subKonteks: [
      "jadwal dan antrean posyandu/puskesmas",
      "data pemilih desa",
      "anggaran RT/RW",
      "distribusi bantuan sosial",
      "sistem antrean layanan publik",
    ],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Kesehatan Masyarakat",
    subKonteks: [
      "data cakupan imunisasi",
      "angka harapan hidup",
      "penyebaran penyakit musiman",
      "gizi dan pertumbuhan anak",
    ],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Literasi Keuangan Lanjut",
    subKonteks: [
      "bunga tabungan/deposito berjangka",
      "cicilan atau kredit barang",
      "tagihan listrik/air/pulsa bulanan",
      "penyusutan (depresiasi) nilai barang",
    ],
    jenjangCocok: ["SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
  {
    namaTema: "Pemerataan & Keadilan Sosial",
    subKonteks: [
      "distribusi buku/alat sekolah antar sekolah",
      "kesenjangan akses fasilitas desa-kota",
      "pembagian sumber daya yang adil (mis. air bersih, listrik)",
      "perbandingan capaian antarwilayah",
    ],
    jenjangCocok: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
    aktif: true,
  },
];

export async function ensureThemesSeeded() {
  try {
    const existing = await db.select().from(temaKonteksPool);
    const existingMap = new Map<string, typeof existing[0]>();
    for (const item of existing) {
      existingMap.set(item.namaTema.toLowerCase().trim(), item);
    }

    for (const theme of INITIAL_THEMES) {
      const match = existingMap.get(theme.namaTema.toLowerCase().trim());
      if (!match) {
        const id = `tema-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await db.insert(temaKonteksPool).values({
          id,
          namaTema: theme.namaTema,
          subKonteks: theme.subKonteks,
          jenjangCocok: theme.jenjangCocok,
          aktif: theme.aktif,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Jika sudah ada, pastikan jenjangCocok diperbarui sesuai instruksi jika berbeda
        const currentJenjang = match.jenjangCocok || [];
        const isDifferent =
          currentJenjang.length !== theme.jenjangCocok.length ||
          theme.jenjangCocok.some((j) => !currentJenjang.includes(j));

        if (isDifferent) {
          await db
            .update(temaKonteksPool)
            .set({
              jenjangCocok: theme.jenjangCocok,
              updatedAt: new Date(),
            })
            .where(eq(temaKonteksPool.id, match.id));
        }
      }
    }
  } catch (err) {
    console.error("Gagal melakukan inisialisasi tema pool:", err);
  }
}
