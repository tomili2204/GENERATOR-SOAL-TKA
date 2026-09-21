import { db, ensureTablesCreated } from "@/db";
import { stimulus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStoredAiConfig, callGeminiResilient, parseGeminiJson } from "@/lib/generator/gemini-generator";

const APPLY = process.argv.includes("--apply");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split("=")[1], 10) : Infinity;
const SKIP_ARG = process.argv.find((a) => a.startsWith("--skip="));
const SKIP = SKIP_ARG ? parseInt(SKIP_ARG.split("=")[1], 10) : 0;

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  let lastErr: any;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      console.log(`\n  [retry ${i}/${attempts}] ${label} gagal: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
  throw lastErr;
}

const WORD_BAND: Record<string, [number, number]> = {
  "SD/MI": [150, 200],
  "SMP/MTs": [200, 250],
  "SMA/MA": [250, 300],
  "SMK/MAK": [250, 300],
};

function buildPrompt(text: string, jenjang: string): string {
  const band = WORD_BAND[jenjang] || [150, 300];
  return `Tulis ulang teks bacaan Bahasa Indonesia berikut agar gaya kalimatnya terasa alami seperti tulisan penulis konten profesional, TANPA mengubah satu pun fakta, angka, nama, atau istilah teknis di dalamnya.

ATURAN PENGGABUNGAN KALIMAT (WAJIB DIPATUHI DENGAN HATI-HATI):
1. Gabungkan HANYA sebagian (kira-kira sepertiga hingga separuh) pasangan kalimat pendek yang BENAR-BENAR berkaitan makna secara langsung (mis. sebab-akibat yang sejajar, dua hal yang terjadi bersamaan, atau kontras langsung). JANGAN menggabungkan dua kalimat yang topiknya tidak berhubungan langsung.
2. Pilih konjungsi sesuai makna sebenarnya: "dan"/"serta" untuk penambahan/kesejajaran, "tetapi" untuk kontras. DILARANG KERAS memakai "atau" kecuali dua klausa itu benar-benar pilihan/alternatif (bukan dua instruksi atau fakta yang sama-sama berlaku).
3. JANGAN gabungkan kalimat definisi istilah teknis (pola "X adalah Y") dengan kalimat sebelum/sesudahnya — biarkan tetap berdiri sendiri sebagai kalimat pendek terpisah agar tetap jelas sebagai penjelasan istilah.
4. Sisakan sejumlah kalimat tunggal pendek apa adanya (jangan menggabungkan semuanya) agar rimanya tetap bervariasi, bukan seluruhnya jadi kalimat panjang.
5. DILARANG menambahkan kalimat majemuk bertingkat/kompleks (dilarang klausa yang diawali "yang", "karena", "meskipun", "sehingga" di tengah kalimat panjang).
6. Pertahankan jumlah kata TOTAL tetap dalam rentang ${band[0]}-${band[1]} kata, dan pertahankan urutan informasi asli.

TEKS ASLI:
"""
${text}
"""

Kembalikan array JSON berisi TEPAT SATU string: hasil teks yang sudah diperbaiki gaya kalimatnya. Contoh format keluaran: ["Teks hasil revisi di sini..."]`;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function main() {
  await ensureTablesCreated();
  const config = await getStoredAiConfig();
  if (!config.apiKey?.trim()) {
    console.error("Kunci API Gemini belum dikonfigurasi. Batalkan.");
    process.exit(1);
  }

  const allStim = await db.select().from(stimulus).orderBy(stimulus.id);
  const filtered = (allStim as any[]).filter(
    (s) => s.mapel?.toLowerCase().includes("bahasa indonesia") && s.tipe === "teks"
  );
  const targets = filtered.slice(SKIP, SKIP + LIMIT);

  console.log(`\n=== PERBAIKAN GAYA KALIMAT STIMULUS BAHASA INDONESIA — ${APPLY ? "MODE TERAPKAN" : "MODE DRY-RUN"} ===`);
  console.log(`Total kandidat: ${filtered.length} | Dilewati (sudah diproses sebelumnya): ${SKIP} | Akan diproses sekarang: ${targets.length}\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const s = targets[i] as any;
    const original = s.konten as string;
    const band = WORD_BAND[s.jenjang] || [150, 300];
    process.stdout.write(`[${i + 1}/${targets.length}] ${s.id} (${s.jenjang})... `);

    try {
      const res = await withRetry(
        () =>
          callGeminiResilient({
            apiKey: config.apiKey,
            preferredModel: config.modelName,
            userPrompt: buildPrompt(original, s.jenjang),
            temperature: 0.5,
          }),
        `panggil Gemini untuk ${s.id}`,
        2
      );
      const parsed = parseGeminiJson(res.rawText);
      const revised = typeof parsed[0] === "string" ? parsed[0].trim() : null;

      if (!revised) {
        console.log("GAGAL (format tidak valid)");
        failed++;
        continue;
      }

      const wc = countWords(revised);
      if (wc < band[0] - 15 || wc > band[1] + 15) {
        console.log(`DILEWATI (jumlah kata hasil ${wc}, di luar toleransi ${band[0]}-${band[1]})`);
        skipped++;
        continue;
      }
      if (revised.length < original.length * 0.7) {
        console.log("DILEWATI (hasil terlalu pendek, indikasi kehilangan konten)");
        skipped++;
        continue;
      }

      console.log(`OK (${countWords(original)} -> ${wc} kata)`);
      success++;

      if (APPLY) {
        await withRetry(
          () =>
            db
              .update(stimulus)
              .set({ konten: revised, jumlahKata: wc, updatedAt: new Date() })
              .where(eq(stimulus.id, s.id)),
          `simpan ${s.id}`
        );
      }
    } catch (err: any) {
      console.log(`ERROR: ${err.message}`);
      failed++;
    }

    // Jeda singkat antar-panggilan agar ramah terhadap rate limit
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log("\n=== RINGKASAN ===");
  console.log(`Berhasil diperbaiki: ${success}`);
  console.log(`Dilewati (di luar toleransi): ${skipped}`);
  console.log(`Gagal: ${failed}`);
  if (!APPLY && success > 0) {
    console.log(`\nJalankan ulang dengan --apply untuk menyimpan ${success} perbaikan ke database.`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
