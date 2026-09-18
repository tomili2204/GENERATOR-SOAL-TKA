import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");

    const updates = [
      // 1. A01-SMP-MAT-22: 2 Kunci Benar (A, C), Opsi B & D adalah Distraktor
      {
        code: "A01-SMP-MAT-22",
        payload: {
          soal_text: "Pada sebuah peta dengan skala $1 : 600.000$, jarak antara kota P dan kota Q adalah $12\\text{ cm}$. Ayah mengendarai mobil dari kota P ke kota Q dengan kecepatan rata-rata $45\\text{ km/jam}$ dan berangkat pukul $08.00$. Manakah pernyataan berikut yang benar? (Pilih semua yang benar)",
          gambar: null,
          opsi: [
            { label: "A", text: "Jarak sebenarnya kota P ke kota Q adalah $72\\text{ km}$." },
            { label: "B", text: "Waktu yang diperlukan Ayah untuk sampai di kota Q adalah $1\\text{ jam } 16\\text{ menit}$." },
            { label: "C", text: "Ayah akan tiba di kota Q pada pukul $09.36$." },
            { label: "D", text: "Jika kecepatan mobil dinaikkan menjadi $60\\text{ km/jam}$, waktu tempuhnya menjadi $45\\text{ menit}$." },
          ],
          kunci_jawaban: ["A", "C"],
          pembahasan: `A) Jarak sebenarnya: $s = 12 \\times 600.000 = 7.200.000\\text{ cm} = 72\\text{ km}$ (Benar).\nB) Waktu tempuh: $t = \\frac{72}{45} = 1,6\\text{ jam} = 1\\text{ jam } (0,6 \\times 60)\\text{ menit} = 1\\text{ jam } 36\\text{ menit}$. Opsi 1 jam 16 menit adalah miskonsepsi desimal (Salah).\nC) Waktu tiba di kota Q: $08.00 + 01.36 = 09.36$ (Benar).\nD) Waktu tempuh pada kecepatan $60\\text{ km/jam}$: $t = \\frac{72}{60} = 1,2\\text{ jam} = 1\\text{ jam } 12\\text{ menit}$, bukan 45 menit (Salah).\nSimpulan: Kunci Jawaban yang benar adalah A dan C.`,
        },
      },
      // 2. A01-SMP-MAT-27: 3 Kunci Benar (A, B, C), Opsi D adalah Distraktor
      {
        code: "A01-SMP-MAT-27",
        payload: {
          soal_text: "Sebuah taman berbentuk persegi dengan panjang sisi $20\\text{ meter}$. Di tengah taman tersebut terdapat kolam ikan berbentuk lingkaran dengan diameter $14\\text{ meter}$. Sisa lahan taman yang tidak dibuat kolam akan ditanami rumput. Manakah informasi berikut yang tepat? (Gunakan $\\pi = \\frac{22}{7}$)",
          gambar: null,
          opsi: [
            { label: "A", text: "Luas taman keseluruhan adalah $400\\text{ m}^2$." },
            { label: "B", text: "Luas kolam ikan adalah $154\\text{ m}^2$." },
            { label: "C", text: "Luas lahan yang ditanami rumput adalah $246\\text{ m}^2$." },
            { label: "D", text: "Keliling kolam ikan adalah $88\\text{ meter}$." },
          ],
          kunci_jawaban: ["A", "B", "C"],
          pembahasan: `A) Luas taman persegi: $L = s \\times s = 20 \\times 20 = 400\\text{ m}^2$ (Benar).\nB) Jari-jari kolam: $r = \\frac{14}{2} = 7\\text{ m}$. Luas kolam lingkaran: $L = \\frac{22}{7} \\times 7 \\times 7 = 154\\text{ m}^2$ (Benar).\nC) Luas lahan rumput: $400 - 154 = 246\\text{ m}^2$ (Benar).\nD) Keliling kolam lingkaran: $K = \\pi \\times d = \\frac{22}{7} \\times 14 = 44\\text{ meter}$. Nilai 88 meter adalah miskonsepsi karena mengalikan $2 \\times \\pi \\times d$ (Salah).\nSimpulan: Kunci Jawaban yang benar adalah A, B, dan C.`,
        },
      },
      // 3. A01-SMP-MAT-15: 1 Kunci Benar (A), Opsi B, C, D adalah Distraktor
      {
        code: "A01-SMP-MAT-15",
        payload: {
          soal_text: "Dalam sebuah kantong terdapat $8$ bola merah, $12$ bola kuning, dan $10$ bola biru. Jika diambil satu bola secara acak, manakah pernyataan peluang berikut yang tepat? (Pilih semua yang benar)",
          gambar: null,
          opsi: [
            { label: "A", text: "Peluang terambil bola merah adalah $\\frac{4}{15}$." },
            { label: "B", text: "Peluang terambil bola bukan kuning adalah $0,4$." },
            { label: "C", text: "Peluang terambil bola biru adalah $\\frac{1}{2}$." },
            { label: "D", text: "Peluang terambil bola merah atau biru adalah $\\frac{4}{5}$." },
          ],
          kunci_jawaban: ["A"],
          pembahasan: `Total bola dalam kantong: $8 + 12 + 10 = 30\\text{ bola}$.\nA) Peluang terambil bola merah: $P(\\text{merah}) = \\frac{8}{30} = \\frac{4}{15}$ (Benar).\nB) Peluang terambil bola bukan kuning: $P(\\text{bukan kuning}) = \\frac{8 + 10}{30} = \\frac{18}{30} = 0,6$, bukan 0,4 (Salah).\nC) Peluang terambil bola biru: $P(\\text{biru}) = \\frac{10}{30} = \\frac{1}{3}$, bukan $\\frac{1}{2}$ (Salah).\nD) Peluang terambil bola merah atau biru: $P(\\text{merah atau biru}) = \\frac{8 + 10}{30} = \\frac{18}{30} = \\frac{3}{5}$, bukan $\\frac{4}{5}$ (Salah).\nSimpulan: Kunci Jawaban yang benar hanya A.`,
        },
      },
      // 4. A01-SMP-MAT-05: 2 Kunci Benar (A, B), Opsi C & D adalah Distraktor
      {
        code: "A01-SMP-MAT-05",
        payload: {
          soal_text: "Sebuah kapal tim SAR berangkat dari pelabuhan A menuju ke arah Utara sejauh $120\\text{ km}$ ke titik B. Dari titik B, kapal berbelok ke arah Timur sejauh $90\\text{ km}$ menuju titik C untuk menolong perahu nelayan. Manakah pernyataan berikut yang tepat mengenai rute kapal tersebut? (Pilih semua yang benar)",
          gambar: null,
          opsi: [
            { label: "A", text: "Jarak terpendek (garis lurus) dari pelabuhan A ke titik C adalah $150\\text{ km}$." },
            { label: "B", text: "Lintasan dari pelabuhan A ke B, lalu ke C membentuk segitiga siku-siku di titik B." },
            { label: "C", text: "Jika kapal kembali dari C langsung ke A dengan kecepatan $50\\text{ km/jam}$, waktu tempuhnya adalah $2,5\\text{ jam}$." },
            { label: "D", text: "Jarak total yang ditempuh kapal dari A ke C melalui B adalah $250\\text{ km}$." },
          ],
          kunci_jawaban: ["A", "B"],
          pembahasan: `A) Jarak terpendek AC: $AC = \\sqrt{120^2 + 90^2} = \\sqrt{14400 + 8100} = \\sqrt{22500} = 150\\text{ km}$ (Benar).\nB) Arah Utara dan Timur saling tegak lurus membentuk sudut $90^\\circ$, sehingga lintasan membentuk segitiga siku-siku di titik B (Benar).\nC) Waktu tempuh langsung dari C ke A: $t = \\frac{150}{50} = 3\\text{ jam}$, bukan 2,5 jam (Salah).\nD) Jarak total tempuh melalui B: $120 + 90 = 210\\text{ km}$, bukan 250 km (Salah).\nSimpulan: Kunci Jawaban yang benar adalah A dan B.`,
        },
      },
      // 5. A02-SMP-MAT-02: 4 Kunci Benar (A, B, C, D)
      {
        code: "A02-SMP-MAT-02",
        payload: {
          soal_text: "Seorang guru berbelanja perlengkapan sekolah berupa 15 buku tulis seharga Rp5.000 per buah, 5 pensil 2B seharga Rp3.000 per buah, dan 5 penghapus seharga Rp2.000 per buah. Toko memberikan potongan harga khusus 10% untuk pembelian buku tulis. Manakah pernyataan berikut yang bernilai benar? (Pilih semua yang benar)",
          gambar: null,
          opsi: [
            { label: "A", text: "Guru tersebut mendapatkan potongan harga sebesar Rp7.500 untuk buku tulis." },
            { label: "B", text: "Total harga yang harus dibayar guru sebelum diskon adalah Rp100.000." },
            { label: "C", text: "Harga setelah diskon untuk 15 buku tulis adalah Rp67.500." },
            { label: "D", text: "Total biaya yang dibayar guru setelah semua diskon adalah Rp92.500." },
          ],
          kunci_jawaban: ["A", "B", "C", "D"],
          pembahasan: `Analisis Pernyataan A: Diskon buku = 10% x (15 x 5.000) = 0,1 x 75.000 = 7.500. (Benar)\nAnalisis Pernyataan B: Total sebelum diskon = (15 x 5.000) + (5 x 3.000) + (5 x 2.000) = 75.000 + 15.000 + 10.000 = 100.000. (Benar)\nAnalisis Pernyataan C: Harga buku setelah diskon = 75.000 - 7.500 = 67.500. (Benar)\nAnalisis Pernyataan D: Total bayar = 67.500 + 15.000 + 10.000 = 92.500. (Benar)\nSemua pernyataan A, B, C, dan D adalah benar berdasarkan perhitungan tersebut.`,
        },
      },
    ];

    const results: string[] = [];

    for (const u of updates) {
      await db
        .update(questions)
        .set({
          payload: u.payload,
          updatedAt: new Date(),
        })
        .where(eq(questions.code, u.code));
      results.push(u.code);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mendiversifikasi kunci jawaban PGK_MCMA pada ${results.length} butir soal (${results.join(", ")}).`,
      data: results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
