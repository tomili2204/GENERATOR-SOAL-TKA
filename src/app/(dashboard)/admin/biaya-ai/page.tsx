import { requireRole } from "@/lib/auth/guards";
import { ensureTablesCreated, db } from "@/db";
import { sql } from "drizzle-orm";
import { getStoredAiConfig } from "@/lib/generator/gemini-generator";
import BiayaAiView from "./BiayaAiView";

export const dynamic = "force-dynamic";

const KURS_USD = 16000;
const HARGA_INPUT_PER_M = 0.075;
const HARGA_OUTPUT_PER_M = 0.30;
const AVG_INPUT_TOKENS_PER_SOAL = 250;
const AVG_OUTPUT_TOKENS_PER_SOAL = 500;

export default async function AdminBiayaAiPage() {
  await requireRole("admin");
  await ensureTablesCreated();

  const aiConfig = await getStoredAiConfig();
  const modelAktif = aiConfig.modelName || "gemini-3.8-flash";

  // Data Riwayat Harian (Asia/Jakarta)
  const dailyResult = await db.execute(sql`
    SELECT 
      TO_CHAR(started_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS tgl_wib,
      COUNT(*)::int AS total_batch,
      COUNT(DISTINCT package_code)::int AS total_paket,
      COALESCE(SUM(total_lolos), 0)::int AS total_lolos,
      COALESCE(SUM(total_gagal), 0)::int AS total_gagal,
      COALESCE(SUM(total_diminta), 0)::int AS total_diminta,
      COALESCE(SUM(total_diterima), 0)::int AS total_diterima
    FROM soal.generation_logs
    GROUP BY tgl_wib
    ORDER BY tgl_wib DESC;
  `);

  const dailyRows = (dailyResult.rows || []) as any[];

  let kumulatifUsd = 0;
  let kumulatifIdr = 0;
  let kumulatifSoalLolos = 0;

  const daily = dailyRows.map((r) => {
    const totalSoalDiproses = (r.total_lolos || 0) + (r.total_gagal || 0) || r.total_diminta || 0;
    const inputTokens = totalSoalDiproses * AVG_INPUT_TOKENS_PER_SOAL;
    const outputTokens = (r.total_lolos || 0) * AVG_OUTPUT_TOKENS_PER_SOAL;
    const biayaUsd = (inputTokens / 1_000_000 * HARGA_INPUT_PER_M) + (outputTokens / 1_000_000 * HARGA_OUTPUT_PER_M);
    const biayaIdr = Math.round(biayaUsd * KURS_USD);

    kumulatifUsd += biayaUsd;
    kumulatifIdr += biayaIdr;
    kumulatifSoalLolos += (r.total_lolos || 0);

    return {
      tanggal: r.tgl_wib,
      totalBatch: r.total_batch,
      totalPaket: r.total_paket,
      totalLolos: r.total_lolos,
      totalGagal: r.total_gagal,
      inputTokens,
      outputTokens,
      biayaUsd: Number(biayaUsd.toFixed(5)),
      biayaIdr,
    };
  });

  const nowWibStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const currentYearMonth = nowWibStr.substring(0, 7);

  const hariIniRow = daily.find((d) => d.tanggal === nowWibStr);
  const hariIniIdr = hariIniRow ? hariIniRow.biayaIdr : 0;
  const hariIniSoal = hariIniRow ? hariIniRow.totalLolos : 0;

  const tujuhHariList = daily.slice(0, 7);
  const tujuhHariIdr = tujuhHariList.reduce((acc, curr) => acc + curr.biayaIdr, 0);
  const tujuhHariSoal = tujuhHariList.reduce((acc, curr) => acc + curr.totalLolos, 0);

  const bulanIniList = daily.filter((d) => d.tanggal.startsWith(currentYearMonth));
  const bulanIniIdr = bulanIniList.reduce((acc, curr) => acc + curr.biayaIdr, 0);
  const bulanIniSoal = bulanIniList.reduce((acc, curr) => acc + curr.totalLolos, 0);

  // Breakdown Mapel
  const mapelResult = await db.execute(sql`
    SELECT 
      mapel,
      COUNT(*)::int AS total_batch,
      COALESCE(SUM(total_lolos), 0)::int AS total_lolos,
      COALESCE(SUM(total_gagal), 0)::int AS total_gagal
    FROM soal.generation_logs
    GROUP BY mapel
    ORDER BY total_lolos DESC;
  `);

  const byMapel = (mapelResult.rows || []).map((m: any) => {
    const inputTokens = ((m.total_lolos || 0) + (m.total_gagal || 0)) * AVG_INPUT_TOKENS_PER_SOAL;
    const outputTokens = (m.total_lolos || 0) * AVG_OUTPUT_TOKENS_PER_SOAL;
    const biayaUsd = (inputTokens / 1_000_000 * HARGA_INPUT_PER_M) + (outputTokens / 1_000_000 * HARGA_OUTPUT_PER_M);
    return {
      mapel: m.mapel,
      totalSoal: m.total_lolos,
      biayaIdr: Math.round(biayaUsd * KURS_USD),
    };
  });

  // Breakdown Jenjang
  const jenjangResult = await db.execute(sql`
    SELECT 
      jenjang,
      COUNT(*)::int AS total_batch,
      COALESCE(SUM(total_lolos), 0)::int AS total_lolos,
      COALESCE(SUM(total_gagal), 0)::int AS total_gagal
    FROM soal.generation_logs
    GROUP BY jenjang
    ORDER BY total_lolos DESC;
  `);

  const byJenjang = (jenjangResult.rows || []).map((j: any) => {
    const inputTokens = ((j.total_lolos || 0) + (j.total_gagal || 0)) * AVG_INPUT_TOKENS_PER_SOAL;
    const outputTokens = (j.total_lolos || 0) * AVG_OUTPUT_TOKENS_PER_SOAL;
    const biayaUsd = (inputTokens / 1_000_000 * HARGA_INPUT_PER_M) + (outputTokens / 1_000_000 * HARGA_OUTPUT_PER_M);
    return {
      jenjang: j.jenjang,
      totalSoal: j.total_lolos,
      biayaIdr: Math.round(biayaUsd * KURS_USD),
    };
  });

  const initialData = {
    summary: {
      modelAktif,
      kursUsd: KURS_USD,
      hariIniIdr,
      hariIniSoal,
      tujuhHariIdr,
      tujuhHariSoal,
      bulanIniIdr,
      bulanIniSoal,
      totalKumulatifIdr: kumulatifIdr,
      totalKumulatifUsd: Number(kumulatifUsd.toFixed(4)),
      totalSoalLolos: kumulatifSoalLolos,
      rataRataPerSoalIdr: 2.7,
      rataRataPerPaketIdr: 81,
    },
    tarif: {
      inputPerM: HARGA_INPUT_PER_M,
      outputPerM: HARGA_OUTPUT_PER_M,
      avgInputTokensPerSoal: AVG_INPUT_TOKENS_PER_SOAL,
      avgOutputTokensPerSoal: AVG_OUTPUT_TOKENS_PER_SOAL,
    },
    daily,
    byMapel,
    byJenjang,
  };

  return <BiayaAiView initialData={initialData} />;
}
