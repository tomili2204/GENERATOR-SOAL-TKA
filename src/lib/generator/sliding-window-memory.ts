import { db, ensureTablesCreated } from "@/db";
import { questions } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export interface QuestionMicroSummary {
  id: string;
  code: string;
  elemen: string;
  temaKonteks: string;
  stemSnippet: string;
}

const DEFAULT_KLISE_LIST: string[] = [
  "[Geometri] Taman persegi 14m dengan kolam lingkaran di tengah mencari luas arsir (pi = 22/7)",
  "[Geometri] Kapal berlayar ke utara 12 km lalu belok ke timur 9 km mencari jarak terdekat",
  "[Geometri] Balok kawat berukuran 12 cm x 8 cm x 6 cm menghitung sisa kawat",
  "[Bilangan] Daging beku dikeluarkan dari kulkas dengan suhu -4C naik 2C tiap 3 menit",
  "[Bilangan] Aturan penskoran lomba matematika benar +4, salah -1, kosong 0",
  "[Bilangan] Tiga anak (Ali, Budi, Cici) berenang bersama setiap 3, 4, dan 6 hari",
  "[Aljabar] Membeli 3 buku tulis dan 2 pensil di koperasi sekolah seharga sekian rupiah",
  "[Aljabar] Tarif taksi buka pintu Rp8.000 dan tarif per km Rp4.000",
  "[Data & Peluang] Rata-rata nilai 29 siswa adalah 78, disusul 1 siswa susulan",
  "[Data & Peluang] Melempar dua koin uang logam atau dua buah dadu bermata 6",
];

/**
 * Membersihkan teks soal menjadi intisari satu baris (micro-summary)
 * Menghapus delimiter berlebih agar hemat token namun sarat makna kontekstual
 */
function cleanSnippet(text: string, maxWords: number = 20): string {
  if (!text) return "";
  const singleLine = text
    .replace(/\r?\n|\r/g, " ")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2")
    .replace(/\s+/g, " ")
    .trim();

  const words = singleLine.split(" ");
  if (words.length <= maxWords) return singleLine;
  return words.slice(0, maxWords).join(" ") + "...";
}

/**
 * Mengambil ringkasan 90 butir soal terakhir dari database (Sliding Window Memory)
 * Universal lintas mata pelajaran (Matematika, Bahasa Indonesia, dll.)
 */
export async function fetchRecentQuestionsMemory(
  jenjang: string,
  mapel: string,
  limit: number = 90
): Promise<{
  promptBlock: string;
  recentSummaries: QuestionMicroSummary[];
  rawStems: string[];
}> {
  await ensureTablesCreated();

  const recentSummaries: QuestionMicroSummary[] = [];
  const rawStems: string[] = [];

  try {
    const records = await db
      .select({
        id: questions.id,
        code: questions.code,
        elemen: questions.elemen,
        temaKonteks: questions.temaKonteks,
        payload: questions.payload,
      })
      .from(questions)
      .where(and(eq(questions.jenjang, jenjang as any), eq(questions.mapel, mapel)))
      .orderBy(desc(questions.createdAt))
      .limit(limit);

    for (const r of records) {
      const payload = (r.payload as any) || {};
      const soalText = payload.soal_text || "";
      if (soalText) {
        rawStems.push(soalText);
      }
      const snippet = cleanSnippet(soalText, 18);
      recentSummaries.push({
        id: r.id,
        code: r.code,
        elemen: r.elemen || "Materi",
        temaKonteks: r.temaKonteks || "Umum",
        stemSnippet: snippet,
      });
    }
  } catch (err) {
    console.error("[SlidingWindowMemory] Gagal membaca riwayat soal dari database:", err);
  }

  // Susun daftar hitam (Active Negative Memory)
  const blacklistItems: string[] = [];

  // Jika database sudah memiliki riwayat, ambil intisarinya
  if (recentSummaries.length > 0) {
    // Ambil maksimal 40 butir paling representatif agar hemat token (~400 token)
    const sampled = recentSummaries.slice(0, 40);
    sampled.forEach((item, idx) => {
      blacklistItems.push(
        `${idx + 1}. [${item.elemen}] ${item.temaKonteks}: "${item.stemSnippet}"`
      );
    });
  }

  // Selalu sertakan 5 klise teratas jika mapel matematika
  if (mapel.toLowerCase().includes("matematika")) {
    DEFAULT_KLISE_LIST.slice(0, 5).forEach((klise) => {
      if (!blacklistItems.some((b) => b.includes(klise.substring(0, 20)))) {
        blacklistItems.push(`- (KLISE ABADI) ${klise}`);
      }
    });
  }

  const promptBlock = `\n\n=== DAFTAR HITAM SKENARIO TERAKHIR (ACTIVE NEGATIVE MEMORY - WAJIB DIHINDARI) ===
Sistem membaca bank soal paket sebelumnya di database. DILARANG KERAS mengulang skenario, nama toko/orang, kombinasi angka, atau model masalah yang mirip dengan daftar berikut:
${blacklistItems.join("\n")}

INSTRUKSI ANTI-REPETISI:
- Ciptakan skenario baru yang segar dan berbeda dari daftar hitam di atas.
- Dilarang mengganti nama orang saja tetapi alur cerita dan rumusnya tetap sama!`;

  return {
    promptBlock,
    recentSummaries,
    rawStems,
  };
}
