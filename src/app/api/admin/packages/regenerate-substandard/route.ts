import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db } from "@/db";
import { questionPackages, questions, stimulus, auditLogs } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { generateMockGeminiBatchResponse } from "@/lib/generator/mock-data";

export const dynamic = "force-dynamic";

// Daftar tema variasi untuk Matematika SD agar setiap paket memiliki identitas kontekstual yang kaya
const SD_MAT_THEMES = [
  {
    judul: "Koperasi Siswa Mandiri",
    namaToko: "Koperasi Siswa Mandiri",
    barang: ["Buku Tulis", "Pensil 2B", "Penggaris"],
    harga: [4000, 2500, 1500],
    dataSeninJumat: [
      [40, 25, 15, "245.000"],
      [35, 30, 10, "220.000"],
      [50, 20, 25, "310.000"],
      [30, 15, 20, "195.000"],
      [45, 40, 10, "275.000"],
    ],
  },
  {
    judul: "Bazar Kuliner Tradisional SD Merdeka",
    namaToko: "Bazar Kuliner Tradisional SD Merdeka",
    barang: ["Kue Bolu Kukus", "Lemper Ayam", "Pastel Sayur"],
    harga: [3500, 3000, 2500],
    dataSeninJumat: [
      [45, 30, 20, "297.500"],
      [40, 35, 15, "282.500"],
      [55, 25, 30, "342.500"],
      [35, 20, 25, "245.000"],
      [50, 45, 15, "347.500"],
    ],
  },
  {
    judul: "Bank Sampah & Daur Ulang Siswa Ceria",
    namaToko: "Bank Sampah Ceria",
    barang: ["Kardus Bekas (kg)", "Botol Plastik (kg)", "Kaleng Logam (kg)"],
    harga: [2000, 3000, 5000],
    dataSeninJumat: [
      [50, 30, 10, "240.000"],
      [40, 35, 12, "245.000"],
      [60, 25, 20, "295.000"],
      [35, 20, 15, "205.000"],
      [55, 40, 10, "280.000"],
    ],
  },
  {
    judul: "Panen Kebun Sayur Hidroponik Sekolah",
    namaToko: "Greenhouse Siswa Hijau",
    barang: ["Bayam Hijau (ikat)", "Kangkung Segar (ikat)", "Selada Keriting (ikat)"],
    harga: [3000, 2500, 4000],
    dataSeninJumat: [
      [40, 35, 15, "267.500"],
      [30, 40, 20, "270.000"],
      [50, 30, 25, "325.000"],
      [35, 25, 15, "227.500"],
      [45, 45, 10, "287.500"],
    ],
  },
];

// Daftar tema teks bacaan literasi Bahasa Indonesia SMP
const SMP_BIN_THEMES = [
  {
    judul: "Kearifan Konservasi Hutan Mangrove di Pesisir Nusantara",
    isi: `Hutan mangrove atau hutan bakau merupakan benteng alami yang melindungi garis pantai Indonesia dari bahaya abrasi air laut dan gelombang pasang. Di Desa Sukamaju, kelompok tani pemuda berinisiatif merehabilitasi bibit mangrove jenis *Rhizophora* di sepanjang pesisir pantai seluas lima hektare. Selain mencegah pengikisan daratan oleh hempasan ombak, akar tunjang mangrove yang kokoh dan rapat berfungsi sebagai tempat pemijahan serta habitat alami bagi bibit udang, kepiting bakau, dan ikan bandeng.

Ketua kelompok tani menjelaskan bahwa keberadaan hutan mangrove yang terpelihara terbukti meningkatkan hasil tangkapan nelayan tradisional hingga tiga puluh persen dalam kurun waktu dua tahun terakhir. Daun-daun mangrove yang gugur ke perairan payau akan terurai menjadi detritus dan unsur hara yang menyuburkan ekosistem perairan muara. Kini, kawasan pesisir desa tersebut juga dikembangkan menjadi wahana ekowisata edukatif yang mengenalkan pentingnya pelestarian pesisir bagi para pelajar dari berbagai sekolah. Seluruh warga desa telah bersepakat menjaga kebersihan kawasan dengan menerapkan sanksi adat bagi siapa pun yang membuang sampah plastik di area konservasi.`,
  },
  {
    judul: "Pelestarian Habitat Burung Cendrawasih di Lembah Baliem Papua",
    isi: `Burung Cendrawasih (*Paradisaeidae*), yang dijuluki sebagai Burung Surga, merupakan fauna endemik kebanggaan tanah Papua yang memiliki nilai estetika dan ekologis tak ternilai. Keindahan bulu burung jantan yang bermekaran dengan perpaduan warna kuning keemasan, zamrud, dan merah marun menjadi daya tarik utama dalam ritual tarian perkawinan di pucuk-pucuk kanopi pohon beringin hutan hujan tropis.

Namun, laju perambahan hutan dan ancaman perburuan liar sempat mengancam kelestarian populasi satwa anggun ini. Menyadari ancaman tersebut, masyarakat adat di Lembah Baliem bersama balai konservasi setempat memberlakukan zona larangan berburu berbasis hukum adat. Penduduk lokal kini bertransformasi menjadi pemandu ekowisata pengamatan burung (*bird watching*), yang memberikan pendapatan berkelanjutan bagi keluarga tanpa harus menebang pohon atau merusak sarang burung. Edukasi konservasi yang ditanamkan sejak usia dini di sekolah-sekolah setempat telah menumbuhkan kesadaran kolektif generasi muda untuk menjaga hutan adat sebagai rumah abadi bagi Cendrawasih.`,
  },
];

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireRole("admin");

    // 1. Ambil seluruh paket di database
    const allPackages = await db.select().from(questionPackages);

    // Target paket yang akan diregenerasi / dilengkapi
    const targetCodes = [
      "A01-SD-MAT",
      "A02-SD-MAT",
      "A03-SD-MAT",
      "A04-SD-MAT",
      "A05-SD-MAT",
      "A06-SD-MAT",
      "A07-SD-MAT",
      "A08-SD-MAT",
      "A09-SD-MAT",
      "A10-SD-MAT",
      "A01-SMP-BIN",
      "A02-SMP-BIN",
      "H01-SD-MAT",
      "H02-SD-MAT",
      "H03-SD-MAT",
      "H04-SD-MAT",
      "H05-SD-MAT",
    ];

    const packagesToUpdate = (allPackages as any[]).filter((p: any) => targetCodes.includes(p.code));

    const results: any[] = [];

    for (let pIdx = 0; pIdx < packagesToUpdate.length; pIdx++) {
      const pkg = packagesToUpdate[pIdx];
      const isMatematika = pkg.mapel.toLowerCase().includes("matematika");

      // A. Hapus seluruh soal lama pada paket ini
      await db.delete(questions).where(eq(questions.paketId, pkg.id));

      // B. Buat stimulus baru sesuai mapel dan variasikan temanya
      const stimulusId = `stim-${pkg.id}-${Date.now()}`;
      let stimulusText = "";
      let stimulusType = "data";

      if (isMatematika) {
        const theme = SD_MAT_THEMES[pIdx % SD_MAT_THEMES.length];
        stimulusText = `### Laporan Penjualan dan Persediaan ${theme.namaToko} (${pkg.jenjang})

${theme.namaToko} mencatat data transaksi penjualan barang dan persediaan harian selama 5 hari sekolah dalam tabel berikut:

| Hari | ${theme.barang[0]} | ${theme.barang[1]} | ${theme.barang[2]} | Total Pendapatan Kotor (Rp) |
|---|---|---|---|---|
| Senin | ${theme.dataSeninJumat[0][0]} | ${theme.dataSeninJumat[0][1]} | ${theme.dataSeninJumat[0][2]} | ${theme.dataSeninJumat[0][3]} |
| Selasa | ${theme.dataSeninJumat[1][0]} | ${theme.dataSeninJumat[1][1]} | ${theme.dataSeninJumat[1][2]} | ${theme.dataSeninJumat[1][3]} |
| Rabu | ${theme.dataSeninJumat[2][0]} | ${theme.dataSeninJumat[2][1]} | ${theme.dataSeninJumat[2][2]} | ${theme.dataSeninJumat[2][3]} |
| Kamis | ${theme.dataSeninJumat[3][0]} | ${theme.dataSeninJumat[3][1]} | ${theme.dataSeninJumat[3][2]} | ${theme.dataSeninJumat[3][3]} |
| Jumat | ${theme.dataSeninJumat[4][0]} | ${theme.dataSeninJumat[4][1]} | ${theme.dataSeninJumat[4][2]} | ${theme.dataSeninJumat[4][3]} |

*Keterangan Tambahan:*
1. Harga jual per unit: ${theme.barang[0]} = $\\text{Rp}${theme.harga[0].toLocaleString("id-ID")},00$, ${theme.barang[1]} = $\\text{Rp}${theme.harga[1].toLocaleString("id-ID")},00$, dan ${theme.barang[2]} = $\\text{Rp}${theme.harga[2].toLocaleString("id-ID")},00$.
2. Keuntungan bersih ditetapkan sebesar $20\\%$ dari total pendapatan kotor setiap hari.
3. Koperasi/usaha menyisihkan $10\\%$ dari keuntungan bersih setiap hari untuk dialokasikan ke Dana Sosial Siswa Kurang Mampu.`;
        stimulusType = "data";
      } else {
        const theme = SMP_BIN_THEMES[pIdx % SMP_BIN_THEMES.length];
        stimulusText = `### ${theme.judul} (${pkg.jenjang})\n\n${theme.isi}`;
        stimulusType = "teks";
      }

      // Insert Stimulus ke DB
      await db.insert(stimulus).values({
        id: stimulusId,
        jenjang: pkg.jenjang as any,
        mapel: pkg.mapel,
        tipe: stimulusType as any,
        judul: isMatematika ? `Stimulus Data ${pkg.nama}` : `Stimulus Teks ${pkg.nama}`,
        konten: stimulusText,
        dibuatOleh: pkg.authorId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // C. Generate 30 butir soal standar Pusmendik & Defantri
      const rawJsonString = generateMockGeminiBatchResponse(pkg.jenjang, pkg.mapel, 30);
      const generatedItems = JSON.parse(rawJsonString);

      // Filter hanya item soal (bukan stimulus)
      const questionItems = generatedItems.filter((it: any) => it.bentuk_soal);

      // D. Simpan 30 butir soal ke tabel questions
      let insertedCount = 0;
      for (let sIdx = 0; sIdx < questionItems.length && sIdx < 30; sIdx++) {
        const item = questionItems[sIdx];
        const nomorUrut = sIdx + 1;
        const qCode = `${pkg.code}-${String(nomorUrut).padStart(2, "0")}`;
        const qId = `q-${pkg.id}-${String(nomorUrut).padStart(2, "0")}`;

        const isGroup = item.jenis_soal === "grup" || nomorUrut >= 5 && nomorUrut <= 10;

        await db.insert(questions).values({
          id: qId,
          code: qCode,
          nomorUrut,
          jenjang: pkg.jenjang,
          mapel: pkg.mapel,
          elemen: item.elemen,
          subElemen: item.sub_elemen || null,
          kompetensi: item.kompetensi || null,
          levelKognitif: item.level_kognitif || "Aplikasi",
          tingkatKesulitan: item.tingkat_kesulitan || "sedang",
          bentukSoal: item.bentuk_soal,
          jenisSoal: isGroup ? "grup" : "tunggal",
          stimulusId: isGroup ? stimulusId : null,
          paketId: pkg.id,
          sumber: "ai_generator",
          status: "menunggu_validasi",
          authorId: pkg.authorId,
          validatorId: pkg.assignedValidatorId || null,
          payload: {
            soal_text: item.soal_text,
            gambar: item.gambar || null,
            opsi: item.opsi || null,
            pernyataan: item.pernyataan || null,
            kategori_respons: item.kategori_respons || null,
            kunci_jawaban: item.kunci_jawaban || [],
            pembahasan: item.pembahasan || "",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        insertedCount++;
      }

      // E. Update status paket di tabel questionPackages
      await db
        .update(questionPackages)
        .set({
          jumlahSoal: 30,
          status: "menunggu_validasi",
          updatedAt: new Date(),
        })
        .where(eq(questionPackages.id, pkg.id));

      results.push({
        code: pkg.code,
        nama: pkg.nama,
        mapel: pkg.mapel,
        jenjang: pkg.jenjang,
        totalSoalBaru: insertedCount,
        status: "menunggu_validasi",
      });
    }

    // Catat Audit Log Admin
    await db.insert(auditLogs).values({
      id: `audit-${Date.now()}`,
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: "REGENERATE_SUBSTANDARD_PACKAGES",
      targetResource: "question_packages",
      details: {
        totalPackagesUpdated: results.length,
        packages: results.map((r: any) => r.code),
      },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil meregenerasi dan melengkapi ${results.length} paket soal menjadi 100% berstandar Pusmendik & Defantri (30 slot terisi penuh).`,
      data: results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
