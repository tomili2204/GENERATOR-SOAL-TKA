import { db, ensureTablesCreated } from "@/db";
import { temaKonteksPool, questions, generationLogs, TemaKonteksPoolItem } from "@/db/schema";
import { eq, and, gte, isNotNull } from "drizzle-orm";
import { ensureThemesSeeded } from "./seed-themes";

export interface SelectedThemeResult {
  namaTema: string;
  subKonteks: string[];
  catatanPengecualian: string | null;
}

/**
 * Logika pemilihan tema dinamis:
 * 1. Filter awal: ambil entri pool dengan aktif=true DAN jenjang_cocok menyertakan jenjang target.
 * 2. Query tema_konteks yang sudah dipakai oleh jenjang+mapel yang sama dalam 4 hari terakhir.
 * 3. Pilih acak 1 tema dari entri yang lolos filter (1) KECUALI tema yang sudah dipakai di (2).
 * 4. Jika seluruh tema kandidat jenjang sudah terpakai dalam 4 hari terakhir, pilih acak dari kandidat jenjang dan catat di log.
 */
export async function selectThemeForGeneration(
  jenjang: string,
  mapel: string
): Promise<SelectedThemeResult> {
  await ensureTablesCreated();
  await ensureThemesSeeded();

  // 1. Ambil seluruh tema aktif
  const allActive: TemaKonteksPoolItem[] = await db
    .select()
    .from(temaKonteksPool)
    .where(eq(temaKonteksPool.aktif, true));

  // 2. Normalisasi jenjang untuk menangani baik format singkatan (SD, SMP) maupun format resmi (SD/MI, SMP/MTs)
  const normJenjang = jenjang.includes("SD")
    ? "SD/MI"
    : jenjang.includes("SMP")
    ? "SMP/MTs"
    : jenjang.includes("SMA")
    ? "SMA/MA"
    : jenjang.includes("SMK")
    ? "SMK/MAK"
    : jenjang;

  // Filter awal: jenjang kombinasi wajib ada dalam jenjang_cocok
  const suitableByJenjang = allActive.filter((item: TemaKonteksPoolItem) => {
    const cocokList = item.jenjangCocok || ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"];
    return cocokList.includes(jenjang) || cocokList.includes(normJenjang);
  });

  // Fallback jika tidak ada yang cocok (seharusnya tidak pernah terjadi karena 20+ tema mencakup semua jenjang)
  const candidatePool = suitableByJenjang.length > 0 ? suitableByJenjang : allActive;

  // 3. Query riwayat penggunaan dalam 4 hari terakhir untuk jenjang + mapel ini
  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

  // Ambil dari tabel questions (kolom tema_konteks)
  const recentQuestions = await db
    .select({ temaKonteks: questions.temaKonteks, jenjang: questions.jenjang })
    .from(questions)
    .where(
      and(
        eq(questions.mapel, mapel),
        gte(questions.createdAt, fourDaysAgo),
        isNotNull(questions.temaKonteks)
      )
    );

  // Filter pertanyaan yang sesuai jenjang (baik SD maupun SD/MI, SMP maupun SMP/MTs)
  const filteredRecentQuestions = recentQuestions.filter(
    (q: any) => q.jenjang === jenjang || q.jenjang === normJenjang
  );

  // Ambil juga dari generation_logs
  const recentLogs = await db
    .select({ temaKonteks: generationLogs.temaKonteks, jenjang: generationLogs.jenjang })
    .from(generationLogs)
    .where(
      and(
        eq(generationLogs.mapel, mapel),
        gte(generationLogs.startedAt, fourDaysAgo),
        isNotNull(generationLogs.temaKonteks)
      )
    );

  const filteredRecentLogs = recentLogs.filter(
    (l: any) => l.jenjang === jenjang || l.jenjang === normJenjang
  );

  const usedThemes = new Set<string>();
  for (const q of filteredRecentQuestions) {
    if (q.temaKonteks) usedThemes.add(q.temaKonteks.toLowerCase().trim());
  }
  for (const l of filteredRecentLogs) {
    if (l.temaKonteks) usedThemes.add(l.temaKonteks.toLowerCase().trim());
  }

  // 4. Terapkan pengecualian 4 hari terakhir pada kandidat jenjang
  const availableCandidates = candidatePool.filter((item: TemaKonteksPoolItem) => {
    const nameLower = item.namaTema.toLowerCase().trim();
    // Cek kecocokan langsung atau bagian dari string
    if (usedThemes.has(nameLower)) return false;
    for (const u of usedThemes) {
      if (u.includes(nameLower) || nameLower.includes(u)) return false;
    }
    return true;
  });

  let chosen: typeof candidatePool[0];
  let catatanPengecualian: string | null = null;

  if (availableCandidates.length > 0) {
    // Berhasil menemukan tema yang belum dipakai dalam 4 hari terakhir
    const randomIndex = Math.floor(Math.random() * availableCandidates.length);
    chosen = availableCandidates[randomIndex];
  } else {
    // Semua tema yang cocok dengan jenjang ini telah terpakai dalam 4 hari terakhir
    catatanPengecualian = `Pengecualian riwayat 4 hari tidak dapat diterapkan karena seluruh ${candidatePool.length} tema aktif untuk jenjang ${jenjang} telah terpakai dalam 4 hari terakhir. Memilih secara acak dari pool jenjang.`;
    const randomIndex = Math.floor(Math.random() * candidatePool.length);
    chosen = candidatePool[randomIndex];
  }

  return {
    namaTema: chosen.namaTema,
    subKonteks: chosen.subKonteks || [],
    catatanPengecualian,
  };
}
