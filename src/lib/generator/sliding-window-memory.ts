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

  // Ringkasan situasi (tema_konteks) yang sering dipakai, bukan potongan soal verbatim:
  // menampilkan kalimat soal lama — walau berlabel "hindari" — terbukti membuat model
  // menyalin nuansa dan kosakatanya lagi (efek anchoring).
  const situasiCount = new Map<string, number>();
  for (const item of recentSummaries) {
    const key = item.temaKonteks.trim().toLowerCase();
    if (!key || key === "umum") continue;
    situasiCount.set(key, (situasiCount.get(key) || 0) + 1);
  }
  const frequentSituasi = [...situasiCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([situasi, n]) => (n > 1 ? `${situasi} (${n}x)` : situasi));

  // Pekerjaan tokoh yang benar-benar jenuh di riwayat terakhir tetap diperingatkan secara
  // eksplisit — hanya kata yang memang sudah muncul berulang, tanpa contoh tambahan.
  const sampledStems = recentSummaries.slice(0, 40).map((s) => s.stemSnippet.toLowerCase());
  const profesiWatchlist = [
    "arkeolog", "teknisi", "pilot drone", "operator drone", "jagawana",
    "bbksda", "peneliti", "surveyor", "insinyur", "kurator",
  ];
  const saturatedProfesi = profesiWatchlist.filter(
    (p) => sampledStems.filter((s) => s.includes(p)).length >= 3
  );

  const parts: string[] = [];
  if (frequentSituasi.length > 0) {
    parts.push(`Situasi yang sudah sering dipakai pada paket-paket terakhir jenjang ini — pilih situasi lain agar bank soal tetap beragam:\n${frequentSituasi.join("; ")}.`);
  }
  if (saturatedProfesi.length > 0) {
    parts.push(`Pekerjaan tokoh berikut sudah terlalu sering muncul, jangan dipakai di paket ini: ${saturatedProfesi.join(", ")}.`);
  }

  const promptBlock = parts.length > 0 ? `\n\nRIWAYAT PAKET TERAKHIR:\n${parts.join("\n")}` : "";

  return {
    promptBlock,
    recentSummaries,
    rawStems,
  };
}
