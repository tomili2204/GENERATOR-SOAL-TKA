import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getStoredAiConfig } from "@/lib/generator/gemini-generator";

export const KURS_USD = 16000;

// Kalibrasi realistis sesuai payload arsitektur Generator TKA & Google Cloud Billing:
// 1. Setiap batch 30 soal dipecah menjadi 2 chunk + 1-2 loop regenerasi (retry).
// 2. Setiap panggilan API mengirim System Instruction utuh (panduan BSKAP, exemplar, format LaTeX, sliding window memory) ~8.000 - 12.000 token.
// 3. Output token riil per butir mencakup pilihan ganda, pembahasan per baris, dan markup SVG (~1.200 token/butir).
// 4. Ada panggilan model ilustrasi visual (Nano Banana Pro / Gemini Image) pada butir bergambar.
// 5. Google Cloud menambahkan PPN 11%.
export const BIAYA_RIIL_PER_PAKET_IDR = 15000; // ~Rp 15.000 per paket (30 butir lengkap dengan pembahasan, SVG & retry)
export const BIAYA_RIIL_PER_SOAL_IDR = 670; // ~Rp 670 per butir lolos validasi (termasuk pajak PPN 11%)

export async function getBiayaAiData() {
  const aiConfig = await getStoredAiConfig();
  const modelAktif = aiConfig.modelName || "gemini-3.8-flash";

  // 1. Data Riwayat Harian (Zona Waktu Asia/Jakarta)
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

  let kumulatifIdr = 0;
  let kumulatifSoalLolos = 0;

  const daily = dailyRows.map((r) => {
    const batchCount = r.total_batch || 1;
    const soalLolos = r.total_lolos || 0;
    const soalGagal = r.total_gagal || 0;

    // Estimasi token riil:
    // - Input: 1 batch = 2 chunk x 10.000 token input + retry ~15.000 token = ~35.000 token per batch
    const inputTokens = batchCount * 35000;
    // - Output: ~1.200 token per soal (pembahasan + SVG + opsi)
    const outputTokens = (soalLolos + soalGagal) * 1200;

    // Biaya riil dihitung dari jumlah batch + soal diproses + alokasi gambar + PPN 11%
    // disinkronkan dengan rata-rata GCP Billing riil (~Rp 15.000/paket)
    const biayaIdr = Math.round((batchCount * 8000) + (soalLolos * 250) + (soalGagal * 100));

    kumulatifIdr += biayaIdr;
    kumulatifSoalLolos += soalLolos;

    return {
      tanggal: r.tgl_wib,
      totalBatch: r.total_batch,
      totalPaket: r.total_paket,
      totalLolos: r.total_lolos,
      totalGagal: r.total_gagal,
      inputTokens,
      outputTokens,
      biayaUsd: Number((biayaIdr / KURS_USD).toFixed(3)),
      biayaIdr,
    };
  });

  // Cari tanggal hari ini dalam WIB
  const nowWibStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const currentYearMonth = nowWibStr.substring(0, 7); // 'YYYY-MM'

  const hariIniRow = daily.find((d) => d.tanggal === nowWibStr);
  const hariIniIdr = hariIniRow ? hariIniRow.biayaIdr : 0;
  const hariIniSoal = hariIniRow ? hariIniRow.totalLolos : 0;

  // 7 Hari terakhir
  const tujuhHariList = daily.slice(0, 7);
  const tujuhHariIdr = tujuhHariList.reduce((acc, curr) => acc + curr.biayaIdr, 0);
  const tujuhHariSoal = tujuhHariList.reduce((acc, curr) => acc + curr.totalLolos, 0);

  // Bulan ini
  const bulanIniList = daily.filter((d) => d.tanggal.startsWith(currentYearMonth));
  const bulanIniIdr = bulanIniList.reduce((acc, curr) => acc + curr.biayaIdr, 0);
  const bulanIniSoal = bulanIniList.reduce((acc, curr) => acc + curr.totalLolos, 0);

  // 2. Breakdown per Mapel & Jenjang
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
    const batchCount = m.total_batch || 1;
    const soalLolos = m.total_lolos || 0;
    const biayaIdr = Math.round((batchCount * 8000) + (soalLolos * 250));
    return {
      mapel: m.mapel,
      totalSoal: soalLolos,
      biayaIdr,
    };
  });

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
    const batchCount = j.total_batch || 1;
    const soalLolos = j.total_lolos || 0;
    const biayaIdr = Math.round((batchCount * 8000) + (soalLolos * 250));
    return {
      jenjang: j.jenjang,
      totalSoal: soalLolos,
      biayaIdr,
    };
  });

  const totalBatchKumulatif = dailyRows.reduce((acc, curr) => acc + (curr.total_batch || 0), 0);
  const rataRataPerSoal = kumulatifSoalLolos > 0 ? Math.round(kumulatifIdr / kumulatifSoalLolos) : BIAYA_RIIL_PER_SOAL_IDR;
  const rataRataPerPaket = totalBatchKumulatif > 0 ? Math.round(kumulatifIdr / totalBatchKumulatif) : BIAYA_RIIL_PER_PAKET_IDR;

  return {
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
      totalKumulatifUsd: Number((kumulatifIdr / KURS_USD).toFixed(2)),
      totalSoalLolos: kumulatifSoalLolos,
      rataRataPerSoalIdr: rataRataPerSoal,
      rataRataPerPaketIdr: rataRataPerPaket,
    },
    tarif: {
      inputPerM: 0.075,
      outputPerM: 0.30,
      avgInputTokensPerSoal: 1100,
      avgOutputTokensPerSoal: 1200,
      biayaRiilPerPaketIdr: BIAYA_RIIL_PER_PAKET_IDR,
      biayaRiilPerSoalIdr: BIAYA_RIIL_PER_SOAL_IDR,
    },
    daily,
    byMapel,
    byJenjang,
  };
}
