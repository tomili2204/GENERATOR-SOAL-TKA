import { getStoredAiConfig, callGeminiResilient } from "./gemini-generator";

export interface FormatPembahasanInput {
  pembahasan: string;
  soalText?: string;
  bentukSoal?: string;
  kunciJawaban?: string[] | string;
  opsi?: Array<{ label: string; text: string }>;
  pernyataan?: Array<{ no: number; text: string }>;
}

/**
 * Merapikan format teks pembahasan bebas buatan manusia (guru/author)
 * menjadi format resmi terstruktur standar AyoTKA menggunakan AI.
 */
export async function formatPembahasanWithAi(input: FormatPembahasanInput): Promise<string> {
  if (!input.pembahasan || input.pembahasan.trim().length === 0) {
    return input.pembahasan || "";
  }

  try {
    const config = await getStoredAiConfig();
    if (!config.apiKey) {
      return fallbackFormatPembahasan(input.pembahasan);
    }

    const systemInstruction = `Anda adalah pakar penata bahasa dan editor pembahasan soal ujian resmi standar nasional (AyoTKA).
Tugas Anda adalah MERAPIKAN dan MENSTANDARKAN format teks pembahasan yang ditulis bebas oleh manusia agar memiliki tata letak yang bersih, sistematis, elegan, dan siap tampil di aplikasi web.

ATURAN STRUKTUR PEMBAHASAN AYOTKA:
1. PERTAHANKAN SUBSTANSI: Jangan ubah makna, angka, hasil perhitungan, rumus, atau konsep aslinya. Hanya rapikan struktur bahasa, penomoran, dan tata letaknya.
2. LANGKAH SISTEMATIS:
   - Susun penjelasan secara teratur dengan nomor butir berurutan (1. ..., 2. ..., 3. ...).
   - Teks penjelasan harus berada langsung di baris yang sama di samping nomor butir (contoh: "1. Hitung luas bidang: ...").
3. RUMUS & SIMBOL MATEMATIKA:
   - Pastikan setiap rumus, pecahan, variabel, satuan bertingkat diapit tanda dollar LaTeX inline: $x = 10$, $\\frac{a}{b}$, $\\text{cm}^3$, $\\sqrt{25}$, dll.
4. SOAL PILIHAN GANDA (PG):
   - Jelaskan konsep perhitungan secara bertahap.
   - Tunjukkan mengapa opsi kunci benar dan opsi lain keliru jika relevan.
   - Baris paling akhir wajib kalimat kesimpulan: "Jadi jawaban yang benar adalah [KUNCI] ([TEKS_OPSI])."
5. SOAL PILIHAN GANDA KOMPLEKS (PGK / Kategori Benar-Salah):
   - Uraikan perhitungan pendukung di langkah awal jika ada.
   - Evaluasi setiap pernyataan dengan format baku:
     "Pernyataan 1: [penjelasan singkat]. BENAR." atau "SALAH."
     (Wajib gunakan kata BENAR atau SALAH huruf kapital di akhir evaluasi pernyataan).
   - Baris paling akhir wajib kalimat kesimpulan:
     "Jadi: Pernyataan 1 [Benar/Salah], Pernyataan 2 [Benar/Salah], Pernyataan 3 [Benar/Salah]."
6. FORMAT KELUARAN:
   Kembalikan HANYA objek JSON dengan properti "pembahasan_terformat" yang berisi teks pembahasan lengkap hasil penataan Anda.`;

    const userPrompt = JSON.stringify({
      tugas: "Rapikan teks pembahasan berikut sesuai standar resmi AyoTKA",
      teks_pembahasan_asli: input.pembahasan,
      teks_soal: input.soalText || "",
      bentuk_soal: input.bentukSoal || "PG",
      kunci_jawaban: input.kunciJawaban || "",
      opsi_pilihan: input.opsi || [],
      daftar_pernyataan: input.pernyataan || [],
    });

    const response = await callGeminiResilient({
      apiKey: config.apiKey,
      preferredModel: config.modelName || "gemini-2.5-flash",
      systemInstruction,
      userPrompt,
      temperature: 0.1, // Rendah agar tidak halusinasi / mengubah fakta soal
    });

    try {
      const parsed = JSON.parse(response.rawText);
      if (parsed.pembahasan_terformat && typeof parsed.pembahasan_terformat === "string") {
        return parsed.pembahasan_terformat.trim();
      }
    } catch {
      // Fallback jika respons bukan JSON murni
      const match = response.rawText.match(/"pembahasan_terformat"\s*:\s*"([\s\S]*?)"\s*\}/);
      if (match && match[1]) {
        return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
      }
      if (response.rawText && response.rawText.length > 10) {
        return response.rawText.replace(/```json|```/g, "").trim();
      }
    }
  } catch (err: any) {
    console.warn("[PembahasanFormatter] AI call failed, fallback to algorithmic formatting:", err.message);
  }

  return fallbackFormatPembahasan(input.pembahasan);
}

/**
 * Normalizer berbasis aturan / regex jika AI tidak dapat diakses
 */
export function fallbackFormatPembahasan(raw: string): string {
  if (!raw) return "";
  let text = raw.trim();

  // 1. Normalisasi baris baru ganda
  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");

  // 2. Normalisasi format penomoran butir langkah (1), 1., 1- dll -> 1.
  text = text.replace(/(?:^|\n)\s*\(?(\d{1,2})\)[\.\-\s]+/g, "\n$1. ");

  // 3. Normalisasi kata Benar/Salah di akhir evaluasi menjadi BENAR / SALAH
  text = text.replace(/[\(\[](?:benar|tepat)[\)\]]\.?/gi, "BENAR.");
  text = text.replace(/[\(\[](?:salah|keliru)[\)\]]\.?/gi, "SALAH.");
  text = text.replace(/(?<![-a-zA-Z])\b(Benar|benar)\b\.?$/gm, "BENAR.");
  text = text.replace(/(?<![-a-zA-Z])\b(Salah|salah)\b\.?$/gm, "SALAH.");

  return text.trim();
}
