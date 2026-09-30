import { db, ensureTablesCreated } from "@/db";
import {
  generationLogs,
  questionPackages,
  questions,
  stimulus,
  generatorConfigs,
  auditLogs,
  systemSettings,
  temaKonteksPool,
} from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { validateLatexDelimiters } from "@/lib/validations/latex";
import { generatePackageCode, calculatePackageStatus } from "@/lib/validations/package-blueprint";
import { deepRepairLatex, preprocessJsonForLatex } from "@/lib/latex/latex-repair";
import { validateAndRepairSvg } from "@/lib/validations/svg";
import { renderDiagramTemplate } from "./diagram-templates";
import { generateMockGeminiBatchResponse as mockDataBatchResponse } from "./mock-data";
import { selectThemeForGeneration } from "./theme-selector";
import { normalizeJenjang } from "@/lib/jenjang-utils";
import { validateLanguageTextComplexity, isLanguageSubject, countWords, formatWacanaCriteriaText } from "./text-complexity";
import { jsonrepair } from "jsonrepair";
import { fetchRecentQuestionsMemory } from "./sliding-window-memory";
import { generateCompetencySlotPlan, formatCompetencyPlanPrompt, normalizeElemenName } from "./competency-plan";
import { buildSystemPrompt } from "./prompt-builder";
import {
  evaluateBatchSimilarity,
  checkQuestionSimilarity,
} from "./similarity-checker";


export interface StoredAiConfig {
  apiKey: string;
  modelName: string;
  temperature: number;
  customPromptPrefix?: string;
  strictSvgMode?: boolean;
  nanoBananaEnabled?: boolean;
}

/**
 * Mengambil konfigurasi AI yang tersimpan di database system_settings,
 * dengan fallback ke environment variables.
 */
export async function getStoredAiConfig(): Promise<StoredAiConfig> {
  await ensureTablesCreated();
  try {
    const records = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "ai_gemini_config"))
      .limit(1);

    if (records.length > 0 && records[0].value) {
      const val = records[0].value as any;
      return {
        apiKey: val.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
        modelName: val.modelName || process.env.GEMINI_MODEL || "gemini-3-flash-preview",
        temperature: typeof val.temperature === "number" ? val.temperature : 0.7,
        customPromptPrefix: val.customPromptPrefix || "",
        strictSvgMode: !!val.strictSvgMode,
        nanoBananaEnabled: !!val.nanoBananaEnabled,
      };
    }
  } catch (err) {
    console.error("Gagal mengambil konfigurasi AI dari DB:", err);
  }

  return {
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "",
    modelName: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    temperature: 0.7,
    strictSvgMode: false,
    nanoBananaEnabled: false,
  };
}

/**
 * Helper untuk pemanggilan Gemini API yang tahan banting (resilient):
 * - Otomatis retry jika mengalami transient error (503 Service Unavailable / 429 Rate Limit)
 * - Otomatis fallback ke model alternatif yang teruji aktif jika model utama sedang overload di server Google
 */
export async function callGeminiResilient(options: {
  apiKey: string;
  preferredModel: string;
  systemInstruction?: string;
  userPrompt: string;
  temperature: number;
}): Promise<{ rawText: string; usedModel: string }> {
  const { apiKey, preferredModel, systemInstruction, userPrompt, temperature } = options;

  // Daftar kandidat model fallback yang teruji aktif di Google AI Studio
  const candidateModels = Array.from(
    new Set([
      preferredModel,
      "gemini-2.5-flash",
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite-preview",
    ])
  );

  const errors: string[] = [];

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload: any = {
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature,
            maxOutputTokens: 16384,
          },
        };

        if (systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: systemInstruction }],
          };
        }

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(90000),
        });

        if (!res.ok) {
          const errText = await res.text();
          let parsedMsg = errText;
          try {
            const j = JSON.parse(errText);
            if (j.error?.message) parsedMsg = j.error.message;
          } catch {}

          const isOverload = res.status === 503 || res.status === 429;
          if (isOverload && attempt < 2) {
            console.warn(`[Gemini] Model ${model} sibuk (HTTP ${res.status}), mencoba ulang dalam 2 detik...`);
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }

          throw new Error(`HTTP ${res.status}: ${parsedMsg}`);
        }

        const jsonRes = await res.json();
        const candidateText = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          throw new Error("Gemini API mengembalikan respons kosong atau kandidat tidak valid.");
        }

        return { rawText: candidateText, usedModel: model };
      } catch (err: any) {
        errors.push(`${model} (percobaan ${attempt}): ${err.message}`);
        if (attempt < 2 && (err.message.includes("503") || err.message.includes("429"))) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }
  }

  throw new Error(`Semua varian model Gemini sedang mengalami kendala: ${errors.slice(-3).join("; ")}`);
}

/**
 * Perbaikan bertarget untuk stimulus yang gagal validasi wacana BSKAP (panjang kata/rata-rata
 * kata per kalimat di luar rentang jenjang) — dipanggil SEBELUM stimulus dibuang & seluruh soal
 * yang menempel padanya ikut ditolak. Sengaja TIDAK memakai BSKAP_SYSTEM_PROMPT penuh (yang berisi
 * aturan format soal/SVG/kurikulum yang tidak relevan untuk tugas edit teks murni ini) supaya biaya
 * per-panggilan jauh lebih murah daripada 1 ronde regenerasi batch penuh.
 */
async function repairStimulusWacana(
  apiKey: string,
  preferredModel: string,
  originalText: string,
  jenjang: string,
  reasons: string[]
): Promise<{ success: true; repairedText: string } | { success: false }> {
  const targetBand = formatWacanaCriteriaText(jenjang);
  const systemInstruction = `Anda adalah editor Bahasa Indonesia. Tugas Anda HANYA memperbaiki panjang total dan struktur/panjang kalimat sebuah teks bacaan agar sesuai batas resmi jenjang pendidikan, TANPA mengubah fakta, angka, nama, tema, atau alur cerita di dalamnya. Jangan menambah informasi baru dan jangan menghilangkan informasi penting.`;
  const userPrompt = `Teks bacaan berikut GAGAL validasi panjang wacana:
"""
${originalText}
"""

Alasan gagal:
${reasons.map((r) => `- ${r}`).join("\n")}

Target WAJIB dipenuhi: ${targetBand} (jenjang ${jenjang}). Kalimat dihitung berdasarkan tanda titik/tanya/seru.

Tulis ulang teks ini agar tepat memenuhi target di atas, TANPA mengubah fakta/angka/nama/tema aslinya. Sebelum menjawab, hitung sendiri secara internal jumlah kata total dan rata-rata kata per kalimat hasil tulisan ulangmu; jika masih di luar target, revisi lagi sampai benar-benar sesuai sebelum mengirim jawaban.

Balas HANYA dengan array JSON berisi satu objek, tanpa teks lain: [{"stimulus_text": "teks hasil perbaikan di sini"}]`;

  try {
    const res = await callGeminiResilient({
      apiKey,
      preferredModel,
      systemInstruction,
      userPrompt,
      temperature: 0.3,
    });
    const parsed = parseGeminiJson(res.rawText);
    const repairedText = parsed?.[0]?.stimulus_text;
    if (typeof repairedText === "string" && repairedText.trim().length > 0) {
      return { success: true, repairedText: repairedText.trim() };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

// Kandidat model gambar "Nano Banana Pro" (nama tampilan resmi Google untuk keluarga model
// gemini-*-pro-image). Beberapa id sengaja disiapkan sebagai fallback karena id model preview
// Google kerap berganti; urutan mencerminkan prioritas kualitas/stabilitas.
const NANO_BANANA_PRO_MODELS = ["gemini-3-pro-image-preview", "gemini-3-pro-image", "nano-banana-pro-preview"];

export type NanoBananaErrorCode =
  | "model_unauthorized"
  | "model_not_found"
  | "quota_exceeded"
  | "timeout"
  | "no_image_returned"
  | "unknown_error";

export interface NanoBananaResult {
  success: boolean;
  dataUri?: string;
  usedModel?: string;
  errorCode?: NanoBananaErrorCode;
  errorMessage?: string;
}

/**
 * Memanggil model gambar Nano Banana Pro (keluarga Gemini image) untuk menghasilkan satu
 * ilustrasi kontekstual. Mencoba setiap model kandidat maksimal 2x sebelum menyerah ke
 * kandidat berikutnya, agar kegagalan satu model/preview tidak langsung menggagalkan seluruh
 * proses generate paket (pemanggil WAJIB fallback ke SVG asli bila fungsi ini mengembalikan
 * success: false).
 */
export async function callNanoBananaImage(apiKey: string, prompt: string): Promise<NanoBananaResult> {
  const errors: string[] = [];
  let lastErrorCode: NanoBananaErrorCode = "unknown_error";

  for (const model of NANO_BANANA_PRO_MODELS) {
    let shouldTryNextModel = false;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
          const errText = await res.text();
          let code: NanoBananaErrorCode = "unknown_error";
          if (res.status === 401 || res.status === 403) code = "model_unauthorized";
          else if (res.status === 404) code = "model_not_found";
          else if (res.status === 429) code = "quota_exceeded";

          lastErrorCode = code;
          errors.push(`${model} (percobaan ${attempt}): HTTP ${res.status} - ${errText.slice(0, 200)}`);

          if (code === "model_unauthorized" || code === "model_not_found") {
            shouldTryNextModel = true;
            break; // model ini memang tidak bisa dipakai, langsung coba kandidat berikutnya
          }
          if (code === "quota_exceeded" && attempt < 2) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          continue;
        }

        const json = await res.json();
        const parts = json.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p?.inlineData?.data);

        if (!imagePart) {
          lastErrorCode = "no_image_returned";
          errors.push(`${model} (percobaan ${attempt}): respons tidak mengandung data gambar.`);
          continue;
        }

        const mimeType = imagePart.inlineData.mimeType || "image/png";
        return {
          success: true,
          dataUri: `data:${mimeType};base64,${imagePart.inlineData.data}`,
          usedModel: model,
        };
      } catch (err: any) {
        const isTimeout = err?.name === "TimeoutError" || err?.name === "AbortError";
        lastErrorCode = isTimeout ? "timeout" : "unknown_error";
        errors.push(`${model} (percobaan ${attempt}): ${isTimeout ? "timeout" : err.message}`);
      }
    }

    if (shouldTryNextModel) continue;
  }

  return {
    success: false,
    errorCode: lastErrorCode,
    errorMessage: errors.slice(-3).join("; "),
  };
}

/**
 * Parser helper untuk membersihkan format markdown code-fence dari keluaran JSON
 */
export function parseGeminiJson(rawText: string): any[] {
  let cleanJson = preprocessJsonForLatex(rawText);
  let parsed: any;

  // 1. Coba parse hasil preprocessJsonForLatex
  try {
    parsed = JSON.parse(cleanJson);
  } catch (_e1) {
    // 2. Coba parse fallback markdown fence murni
    let fallback = rawText.trim();
    if (fallback.startsWith("```json")) {
      fallback = fallback.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (fallback.startsWith("```")) {
      fallback = fallback.replace(/^```/, "").replace(/```$/, "").trim();
    }

    try {
      parsed = JSON.parse(fallback);
    } catch (_e2) {
      // 3. Gunakan jsonrepair untuk membetulkan unescaped quotes dan format cacat LLM pada cleanJson
      try {
        const repaired = jsonrepair(cleanJson);
        parsed = JSON.parse(repaired);
      } catch (_e3) {
        // 4. Gunakan jsonrepair pada fallback
        try {
          const repaired = jsonrepair(fallback);
          parsed = JSON.parse(repaired);
        } catch (repairErr: any) {
          // 5. Smart Truncation Recovery: jika output AI terpotong sebelum selesai,
          // cari penutup objek '}' terakhir yang utuh dan tutup array ']'
          try {
            const lastObjEnd = Math.max(cleanJson.lastIndexOf("}"), fallback.lastIndexOf("}"));
            if (lastObjEnd > 10) {
              const targetStr = cleanJson.length >= fallback.length ? cleanJson : fallback;
              const truncatedSlice = targetStr.substring(0, lastObjEnd + 1).trim();
              const candidate = truncatedSlice.endsWith("]") ? truncatedSlice : `${truncatedSlice}\n]`;
              const repairedTruncated = jsonrepair(candidate);
              const recovered = JSON.parse(repairedTruncated);
              if (Array.isArray(recovered) && recovered.length > 0) {
                console.warn(`[JSON Parser Recovery] Berhasil menyelamatkan ${recovered.length} objek utuh dari JSON terpotong.`);
                parsed = recovered;
              }
            }
          } catch (_truncErr) {}

          if (!parsed) {
            console.error("[JSON Parser Error] Gagal mem-parse JSON dari model:", repairErr.message);
            throw new Error(`Format JSON dari AI tidak valid: ${repairErr.message}`);
          }
        }
      }
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Output dari model bukan merupakan array JSON.");
  }
  return deepRepairLatex(parsed);
}

/**
 * Uji koneksi ringan (ping) ke Google Gemini API
 */
export async function testGeminiConnection(
  apiKeyInput?: string,
  modelInput?: string
): Promise<{
  success: boolean;
  model: string;
  latencyMs: number;
  message: string;
  error?: string;
}> {
  const startedAt = Date.now();
  let key = apiKeyInput;
  let model = modelInput || "gemini-3-flash-preview";

  if (!key || !key.trim()) {
    const stored = await getStoredAiConfig();
    key = stored.apiKey;
    if (!modelInput) model = stored.modelName;
  }

  if (!key || !key.trim()) {
    return {
      success: false,
      model,
      latencyMs: 0,
      message: "API Key belum diisi. Masukkan API Key Google Gemini terlebih dahulu.",
      error: "API_KEY_MISSING",
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.trim()}`;
    const payload = {
      contents: [{ role: "user", parts: [{ text: "Tes koneksi. Jawab singkat: OK." }] }],
      generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const latencyMs = Date.now() - startedAt;

    if (!res.ok) {
      const errText = await res.text();
      let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error?.message) errorMsg = parsed.error.message;
      } catch {}
      if (res.status === 503) {
        errorMsg += " (Server Google sedang mengalami lonjakan beban sementara pada model ini. Disarankan memilih 'gemini-3-flash-preview' yang lebih tangguh dan stabil).";
      }
      return {
        success: false,
        model,
        latencyMs,
        message: `Koneksi ke Gemini API gagal: ${errorMsg}`,
        error: errorMsg,
      };
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "OK";

    return {
      success: true,
      model,
      latencyMs,
      message: `Koneksi Sukses! Model ${model} aktif dan merespons dalam ${latencyMs}ms. (Respon uji: "${reply.trim()}")`,
    };
  } catch (err: any) {
    return {
      success: false,
      model,
      latencyMs: Date.now() - startedAt,
      message: `Terjadi kendala jaringan saat menghubungi Google AI Studio: ${err.message}`,
      error: err.message,
    };
  }
}

/**
 * Menghasilkan panduan kurikulum dan matriks asesmen kontekstual
 * berdasarkan jenjang dan mata pelajaran sesuai standar Pusmendik & Defantri.
 */
export function getCurriculumPromptContext(jenjang: string, mapel: string): string {
  const isMat = mapel.toLowerCase().includes("matematika");
  const isBin = mapel.toLowerCase().includes("indonesia") || mapel.toLowerCase().includes("inggris");

  // Rincian kompetensi Matematika dikirim lewat rencana cakupan kompetensi, dan aturan wacana
  // Bahasa lewat buildSystemPrompt — di sini hanya pengingat struktur paket yang ringkas.
  if (isMat) {
    return `\nSTRUKTUR PAKET: sertakan 1–2 stimulus grup (tabel data, diagram, atau teks situasi), masing-masing dengan 2–3 butir soal yang benar-benar membaca stimulus tersebut. Butir lainnya berupa soal tunggal.`;
  }

  if (isBin) {
    return `\nSTRUKTUR PAKET: sebagian besar butir berupa soal grup (2–3 butir per stimulus). Panjang setiap teks: ${formatWacanaCriteriaText(jenjang)}. Wakili kedua taksonomi kompetensi (domestik dan PISA).`;
  }

  return "";
}

export function getStrictSvgPromptInstructions(jenjang: string, mapel: string): string {
  const isMat = mapel.toLowerCase().includes("matematika");
  const isSd = jenjang.includes("SD");

  return `\n\nMODE VISUAL KETAT AKTIF: sekitar sepertiga butir dalam batch ini wajib memiliki "gambar" (tidak null), mengikuti aturan ILUSTRASI di atas.
${isMat ? `- Data dan peluang: sajikan data dengan template diagram_batang atau diagram_lingkaran (tabel Markdown boleh sebagai pelengkap).
- Geometri dan pengukuran: SVG bangun datar/ruang, denah, atau jaring-jaring dengan label ukuran yang proporsional. Khusus sudut pada dua garis sejajar dipotong transversal, WAJIB pakai template archetype "sudut_transversal" (lihat aturan ILUSTRASI), jangan SVG bebas.
- Bilangan: ${isSd ? "template model_pecahan (lingkaran atau persegi panjang berarsir) untuk pecahan, dan garis_bilangan untuk urutan atau operasi bilangan." : "template garis_bilangan untuk bilangan bertanda atau urutan bilangan."}` : `- Teks informasi yang memuat persentase atau perbandingan: template diagram_lingkaran atau diagram_batang.
- Teks prosedur: SVG bagan alur langkah kerja yang sederhana.`}
- SVG memakai viewBox="0 0 480 300", width="100%", font-family="system-ui, sans-serif", ukuran huruf minimal 12, dan warna yang ramah mata (mis. #4f46e5, #059669, #d97706, #475569, latar #f8fafc).`;
}

// SYSTEM PROMPT UNTUK PERBAIKAN SATU BUTIR SOAL BERDASARKAN CATATAN VALIDATOR
const AI_REVISION_SYSTEM_PROMPT = `Anda adalah editor soal Tes Kemampuan Akademik (TKA) profesional untuk Kementerian Pendidikan Dasar dan Menengah RI. Tugas Anda: merevisi SATU butir soal yang sudah ada berdasarkan catatan perbaikan spesifik dari validator penelaah, TANPA mengubah hal-hal di luar yang diminta.

ATURAN WAJIB:
1. Perbaiki HANYA sesuai catatan validator yang diberikan. Jangan mengubah bentuk soal, jenis soal, atau taksonomi elemen/kompetensi kecuali validator secara eksplisit memintanya.
2. Jika catatan meminta redaksi ulang pertanyaan, opsi, atau pembahasan, tulis ulang secara utuh dan konsisten — jangan setengah-setengah atau menyisakan bagian lama yang kontradiktif dengan bagian baru.
3. Jika catatan menyebutkan hasil perhitungan tidak bulat/tidak rapi, PILIH SALAH SATU: sesuaikan angka pada soal, ATAU ubah redaksi pertanyaan (misalnya menjadi "tambahan/kekurangan minimal") agar tetap valid secara matematis dan kunci jawabannya benar-benar cocok dengan salah satu opsi yang ada (jangan menghasilkan kunci yang tidak ada di daftar opsi).
4. Field "pembahasan" WAJIB diuraikan bertingkat ke bawah per baris memakai karakter newline (\\n) untuk tiap langkah (contoh: "Diketahui: ...\\nLangkah 1: ...\\nLangkah 2: ...\\nSimpulan: ..."), jelas dan langsung ke inti. DILARANG memakai gaya bahasa yang terasa seperti keluaran AI generik (hindari frasa seperti "Tentu, berikut adalah...", "Sebagai AI...", "Baik, saya akan...", dsb) — tulis sebagaimana pendidik manusia menulis kunci pembahasan.
5. Notasi matematika memakai LaTeX; di dalam JSON, escape backslash ganda (\\\\frac, \\\\times, \\\\sqrt, dst). Satu persamaan utuh berada di dalam SATU pasangan $...$, sedangkan kata penjelas dan satuan ditulis di luar tanda $ (contoh benar: Total = $140 + 180 = 320$ kg; contoh salah: $Total $= 140 + 180 = 320$ kg$). Perhitungan panjang boleh ditulis pada baris sendiri sebagai $$...$$.
6. Field "gambar": jika catatan validator meminta ganti soal/tema total, atau jika soal baru tidak lagi berhubungan dengan gambar lama, WAJIB buat ilustrasi SVG baru yang sesuai dengan topik baru atau kembalikan "gambar": null (DILARANG mempertahankan gambar lama yang tidak relevan). Jika catatan validator TIDAK menyinggung ilustrasi dan topik soal tetap sama, kembalikan "gambar": null (sistem akan mempertahankan ilustrasi asli). Jika catatan validator secara eksplisit meminta perbaikan visual, sertakan revisi "gambar" mengikuti salah satu format: {"tipe": "svg", "svg_content": "<svg viewBox=\\"0 0 480 300\\" width=\\"100%\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>", "deskripsi_alt": "..."} untuk geometri/denah bebas, atau {"tipe": "diagram", "archetype": "diagram_batang"|"diagram_lingkaran"|"model_pecahan"|"garis_bilangan", "data": {...}, "deskripsi_alt": "..."} untuk diagram data/pecahan/garis bilangan (parameter data mengikuti skema masing-masing archetype).
7. PADA SOAL BENTUK PGK_MCMA (Pilihan Ganda Kompleks Multi-Jawaban):
   - DILARANG membuat semua opsi bernilai benar (semua opsi benar adalah cacat desain soal asesmen).
   - Jika validator menyarankan agar "tidak semua jawaban benar" atau meminta agar "ada jawaban yang bernilai salah", JANGAN SELALU membuat pola malas yang hanya menyalahkan tepat 1 opsi (3 benar, 1 salah).
   - VARIASIKAN jumlah opsi yang benar secara proporsional dan mendidik:
     * Kombinasi 2 OPSI BENAR (dan 2 opsi salah) — SANGAT DISARANKAN untuk daya beda asesmen penalaran.
     * Kombinasi 1 OPSI BENAR (dan 3 opsi salah) — sangat baik untuk mengecoh miskonsepsi umum.
     * Kombinasi 3 OPSI BENAR (dan 1 opsi salah).
   - Buatlah opsi pengecoh (distraktor salah) dengan kekeliruan konsep, rumus, atau hitungan yang masuk akal bagi siswa, lalu sesuaikan "kunci_jawaban" dan "pembahasan" secara konsisten.
8. Kembalikan HANYA array JSON valid berisi TEPAT SATU objek, tanpa markdown code fence dan tanpa teks penjelasan apa pun di luar JSON, dengan skema PERSIS:
[{
  "soal_text": string,
  "opsi": [{"label": string, "text": string}] | null,
  "pernyataan": [{"no": number, "text": string}] | null,
  "kategori_respons": [string] | null,
  "kunci_jawaban": [string],
  "pembahasan": string,
  "gambar": null | {"tipe": "svg", "svg_content": string, "deskripsi_alt": string} | {"tipe": "diagram", "archetype": string, "data": object, "deskripsi_alt": string}
}]`;

export interface ReviseQuestionInput {
  jenjang: string;
  mapel: string;
  elemen: string;
  subElemen?: string | null;
  bentukSoal: string;
  jenisSoal: string;
  tingkatKesulitan?: string | null;
  soalText: string;
  opsi?: Array<{ label: string; text: string }> | null;
  pernyataan?: Array<{ no: number; text: string }> | null;
  kategoriRespons?: string[] | null;
  kunciJawaban: string[];
  pembahasan: string;
  gambarTipe?: string | null;
  validationNotes: string;
}

export interface ReviseQuestionResult {
  success: boolean;
  revised?: {
    soal_text: string;
    opsi?: Array<{ label: string; text: string }> | null;
    pernyataan?: Array<{ no: number; text: string }> | null;
    kategori_respons?: string[] | null;
    kunci_jawaban: string[];
    pembahasan: string;
    gambar?: any;
  };
  error?: string;
}

/**
 * Meminta AI merevisi satu butir soal berdasarkan catatan perbaikan validator.
 * Hanya mengembalikan draf revisi (tidak menyimpan ke database) agar Pembuat Soal
 * tetap meninjau dan menyetujui hasilnya sebelum dikirim ulang ke validator.
 */
export async function reviseQuestionWithAi(input: ReviseQuestionInput): Promise<ReviseQuestionResult> {
  const storedConfig = await getStoredAiConfig();
  const apiKey = storedConfig.apiKey;
  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      error: "Kunci API Gemini belum dikonfigurasi oleh admin. Perbaikan otomatis oleh AI tidak dapat dijalankan.",
    };
  }

  if (!input.validationNotes || !input.validationNotes.trim()) {
    return { success: false, error: "Tidak ada catatan validator yang dapat dijadikan acuan perbaikan." };
  }

  const originalPayload = {
    soal_text: input.soalText,
    opsi: input.opsi || null,
    pernyataan: input.pernyataan || null,
    kategori_respons: input.kategoriRespons || null,
    kunci_jawaban: input.kunciJawaban,
    pembahasan: input.pembahasan,
    gambar_tipe_saat_ini: input.gambarTipe || null,
  };

  const userPrompt = `Konteks butir soal:
- Jenjang: ${input.jenjang}
- Mapel: ${input.mapel}
- Elemen: ${input.elemen}${input.subElemen ? ` | Sub Elemen: ${input.subElemen}` : ""}
- Bentuk Soal: ${input.bentukSoal} | Jenis Soal: ${input.jenisSoal}
- Tingkat Kesulitan: ${input.tingkatKesulitan || "-"}

Butir soal SAAT INI (sebelum revisi):
${JSON.stringify(originalPayload, null, 2)}

CATATAN PERBAIKAN DARI VALIDATOR (wajib dipatuhi seluruhnya, poin demi poin):
${input.validationNotes}

Kembalikan array JSON berisi TEPAT SATU objek hasil revisi sesuai skema pada instruksi sistem. Jawaban WAJIB ringkas dan efisien token — jangan mengulang informasi, jangan menambahkan field lain di luar skema, dan jangan mengembalikan "gambar" ber-SVG kecuali benar-benar diminta oleh catatan validator.`;

  const attemptOnce = async (): Promise<ReviseQuestionResult> => {
    let rawText: string;
    try {
      const res = await callGeminiResilient({
        apiKey,
        preferredModel: storedConfig.modelName,
        systemInstruction: AI_REVISION_SYSTEM_PROMPT,
        userPrompt,
        temperature: 0.4,
      });
      rawText = res.rawText;
    } catch (err: any) {
      return { success: false, error: err.message || "Gagal menghubungi Gemini API." };
    }

    let parsedArray: any[];
    try {
      parsedArray = parseGeminiJson(rawText);
    } catch (err: any) {
      return { success: false, error: `Gagal membaca hasil revisi dari AI: ${err.message}` };
    }

    const revised = parsedArray[0];
    const hasValidKunci = Array.isArray(revised?.kunci_jawaban) && revised.kunci_jawaban.length > 0;
    if (!revised || typeof revised !== "object" || !revised.soal_text || !revised.pembahasan || !hasValidKunci) {
      return {
        success: false,
        error: "AI mengembalikan hasil revisi yang tidak lengkap (kemungkinan keluaran terpotong sebelum selesai).",
      };
    }

    return {
      success: true,
      revised: {
        soal_text: revised.soal_text,
        opsi: revised.opsi ?? null,
        pernyataan: revised.pernyataan ?? null,
        kategori_respons: revised.kategori_respons ?? null,
        kunci_jawaban: revised.kunci_jawaban,
        pembahasan: revised.pembahasan,
        gambar: revised.gambar ?? null,
      },
    };
  };

  // Keluaran LLM sesekali terpotong di tengah jalan; coba ulang sekali secara otomatis
  // sebelum menyerah, karena percobaan kedua pada suhu yang sama seringkali berhasil.
  let lastResult = await attemptOnce();
  if (!lastResult.success) {
    lastResult = await attemptOnce();
  }
  return lastResult;
}

export interface GenerateOptions {
  jenjang: string;
  mapel: string;
  configId?: string;
  adminId?: string;
  triggeredBy: "schedule" | "manual_admin";
  forceMock?: boolean;
  totalSoal?: number;
  distribusiBentuk?: { PG: number; PGK_MCMA: number; PGK_KATEGORI: number };
  distribusiKesulitan?: { rendah: number; sedang: number; tinggi: number };
  customInstruction?: string;
  selectedThemes?: Array<{ namaTema: string; subKonteks?: string[] }>;
  themeMode?: "auto_dynamic" | "auto_multi" | "manual_pool";
  selectedElements?: string[];
  elementMode?: "all" | "selective";
  modelName?: string;
  temperature?: number;
  apiKey?: string;
  strictSvgMode?: boolean;
  /** Menambah soal baru ke paket yang sudah ada (mis. melengkapi paket uji coba 10 soal menjadi 30),
   * alih-alih membuat paket baru. `startingSlot` adalah nomorUrut pertama untuk soal baru ini.
   * Bila `replaceSlots` diisi, soal baru justru MENGGANTI soal lama di nomor-nomor slot tersebut
   * (soal lama baru dihapus tepat sebelum penggantinya disimpan, setelah lolos validasi). */
  appendToPackage?: { id: string; code: string; startingSlot: number; targetTotal: number; replaceSlots?: number[] };
}

export interface GenerationResult {
  success: boolean;
  logId: string;
  status: "berhasil" | "gagal" | "sebagian";
  packageCode?: string;
  packageId?: string;
  totalDiminta: number;
  totalDiterima: number;
  totalLolos: number;
  totalGagal: number;
  detailPemeriksaan: Array<{ index: number; reason: string; itemTitle?: string }>;
  errorMessage?: string;
  durationMs: number;
  nanoBananaConverted?: number;
  nanoBananaFallback?: number;
}

async function saveGenerationLog(values: typeof generationLogs.$inferInsert) {
  await db
    .insert(generationLogs)
    .values(values)
    .onConflictDoUpdate({ target: generationLogs.id, set: values });
}

/** Dipakai generateBatchQuestions (jaring pengaman terluar) untuk tahu progres inti sejauh apa
 * saat terjadi kegagalan tak tertangani -- lihat komentar di pemanggilnya. */
interface GenLogContext {
  packageId: string | null;
  packageCode: string | null;
}

/**
 * Core Engine Pembuatan Soal Otomatis Berbasis Google Gemini API. Dipanggil lewat wrapper
 * generateBatchQuestions di bawah -- jangan panggil langsung dari luar file ini.
 */
async function generateBatchQuestionsCore(
  options: GenerateOptions,
  logId: string,
  startedAt: Date,
  ctx: GenLogContext
): Promise<GenerationResult> {
  await ensureTablesCreated();

  const { mapel, configId, adminId, triggeredBy, forceMock } = options;
  const jenjang = normalizeJenjang(options.jenjang);
  const storedConfig = await getStoredAiConfig();

  const apiKey = options.apiKey?.trim() || storedConfig.apiKey;
  const modelName = options.modelName?.trim() || storedConfig.modelName;
  const temperature = typeof options.temperature === "number" ? options.temperature : storedConfig.temperature;
  const totalDiminta = options.totalSoal && options.totalSoal > 0 ? options.totalSoal : 30;

  // Hitung target distribusi
  const distB = options.distribusiBentuk || {
    PG: Math.round(totalDiminta * 0.53),
    PGK_MCMA: Math.round(totalDiminta * 0.27),
    PGK_KATEGORI: totalDiminta - Math.round(totalDiminta * 0.53) - Math.round(totalDiminta * 0.27),
  };

  const distK = options.distribusiKesulitan || {
    rendah: Math.round(totalDiminta * 0.27),
    sedang: Math.round(totalDiminta * 0.46),
    tinggi: totalDiminta - Math.round(totalDiminta * 0.27) - Math.round(totalDiminta * 0.46),
  };

  const curriculumGuidance = getCurriculumPromptContext(jenjang, mapel);

  // 0. Logika Pemilihan Tema Konteks (Mendukung Multi-Tema Standar Tryout Nasional & Pilihan Pool Tema)
  let themeName = "";
  let subKonteksList: string[] = [];
  let dynamicContextBlock = "";
  let catatanPengecualian: string | null = null;

  if (options.themeMode === "auto_multi") {
    // Mode Multi-Tema Otomatis (Rekomendasi Standar Tryout Nasional ayotka.id)
    const allActive = await db.select().from(temaKonteksPool).where(eq(temaKonteksPool.aktif, true));
    const suitable = allActive.filter((t: any) => {
      const cocok = t.jenjangCocok || ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"];
      return cocok.includes(jenjang) || cocok.some((j: any) => j.includes(jenjang.split("/")[0]));
    });
    const poolToPick = suitable.length > 0 ? suitable : allActive;
    const shuffled = [...poolToPick].sort(() => 0.5 - Math.random());
    const pickedThemes = shuffled.slice(0, Math.min(5, shuffled.length));

    themeName = `Multi-Tema Tryout Nasional (${pickedThemes.map((t) => t.namaTema).join(", ")})`;
    dynamicContextBlock = `\n\nINSPIRASI TEMA KONTEKS (tidak wajib untuk setiap butir):
${pickedThemes.map((t, idx) => `${idx + 1}. ${t.namaTema} — contoh sub-konteks: ${(t.subKonteks || []).join(", ")}`).join("\n")}
Pakai tema-tema ini sebagai sumber ide latar untuk sebagian soal jika cocok dengan kompetensi yang diuji; butir lain boleh memakai situasi keseharian siswa yang lain. Jangan memaksakan tema ke soal yang tidak cocok, dan jangan menumpuk satu tema di terlalu banyak butir. Tema hanya latar cerita — yang diuji tetap kompetensi ${mapel} jenjang ${jenjang}.`;

  } else if (options.selectedThemes && options.selectedThemes.length > 0) {
    // Pengguna memilih 1 atau lebih tema dari Pool Tema Konteks (29 Tema)
    if (options.selectedThemes.length === 1) {
      const st = options.selectedThemes[0];
      themeName = st.namaTema;
      subKonteksList = st.subKonteks && st.subKonteks.length > 0 ? st.subKonteks : [st.namaTema];
      dynamicContextBlock = `\n\nTEMA PILIHAN ADMIN: ${themeName}.
Gunakan tema ini sebagai latar utama paket dengan sub-konteks yang bervariasi (boleh dikembangkan):
${subKonteksList.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}
Situasi tetap harus wajar dan mudah dibayangkan siswa jenjang ${jenjang}, dengan istilah yang mereka kenal. Tema hanya latar cerita — yang diuji tetap kompetensi ${mapel}.`;
    } else {
      // Lebih dari 1 tema dipilih dari Pool
      themeName = options.selectedThemes.map((t) => t.namaTema).join(", ");
      dynamicContextBlock = `\n\nTEMA PILIHAN ADMIN (${options.selectedThemes.length} tema, bagikan secara seimbang ke butir-butir soal):
${options.selectedThemes
  .map((t, idx) => `${idx + 1}. ${t.namaTema} — sub-konteks: ${(t.subKonteks || []).join(", ")}`)
  .join("\n")}
Situasi tetap harus wajar dan mudah dibayangkan siswa jenjang ${jenjang}, dengan istilah yang mereka kenal. Tema hanya latar cerita — yang diuji tetap kompetensi ${mapel}.`;
    }
  } else {
    // Mode Default: Dynamic theme selector berdasarkan riwayat 4 hari
    const dynamicTheme = await selectThemeForGeneration(jenjang, mapel);
    catatanPengecualian = dynamicTheme.catatanPengecualian;
    themeName = options.customInstruction?.trim()
      ? `Kustom: ${options.customInstruction.trim().substring(0, 40)}`
      : dynamicTheme.namaTema;
    subKonteksList = options.customInstruction?.trim()
      ? [options.customInstruction.trim(), ...dynamicTheme.subKonteks]
      : dynamicTheme.subKonteks;

    dynamicContextBlock = `\n\nINSPIRASI TEMA KONTEKS (tidak wajib untuk setiap butir): ${themeName} — contoh sub-konteks: ${subKonteksList.join(", ")}.
Pakai tema ini sebagai sumber ide latar untuk sebagian soal jika cocok dengan kompetensi yang diuji; butir lain boleh memakai situasi keseharian siswa yang lain. Jangan memaksakan tema ke soal yang tidak cocok. Tema hanya latar cerita — yang diuji tetap kompetensi ${mapel} jenjang ${jenjang}.`;
  }

  // Lapis 1: Dynamic Negative Memory (Sliding Window 90 butir soal terakhir dari DB)
  const recentMemory = await fetchRecentQuestionsMemory(jenjang, mapel, 90);

  const competencySlotPlans = generateCompetencySlotPlan(
    totalDiminta,
    jenjang,
    mapel,
    options.selectedElements
  );
  const competencyPlanBlock = formatCompetencyPlanPrompt(competencySlotPlans);

  const isStrictSvg = typeof options.strictSvgMode === "boolean" ? options.strictSvgMode : !!storedConfig.strictSvgMode;
  const strictSvgBlock = isStrictSvg ? getStrictSvgPromptInstructions(jenjang, mapel) : "";

  const activeSystemPrompt = `${buildSystemPrompt(jenjang, mapel)}${dynamicContextBlock}${strictSvgBlock}${recentMemory.promptBlock}`;

  // Prompt Pengguna Target Distribusi
  let userPrompt = `Hasilkan tepat ${totalDiminta} butir soal TKA berkualitas tinggi dengan distribusi bentuk soal sekitar ${distB.PG} PG, ${distB.PGK_MCMA} PGK_MCMA, ${distB.PGK_KATEGORI} PGK_KATEGORI, dan distribusi tingkat kesulitan sekitar ${distK.rendah} rendah, ${distK.sedang} sedang, ${distK.tinggi} tinggi untuk jenjang ${jenjang} dan mata pelajaran ${mapel}.

Ikuti gaya soal dan contoh acuan pada instruksi sistem, dan sesuaikan banyak langkah berpikir dengan tingkat kesulitan tiap butir.
${curriculumGuidance}
${competencyPlanBlock}`;

  // Pembatasan Elemen Materi jika dipilih sebagian oleh admin
  let elementRestrictionPrompt = "";
  if (options.elementMode === "selective" && options.selectedElements && options.selectedElements.length > 0) {
    const elListStr = options.selectedElements.map((el, idx) => `${idx + 1}. Elemen: ${el}`).join("\n");
    elementRestrictionPrompt = `\n\nATURAN KHUSUS PEMBATASAN ELEMEN MATERI (WAJIB DIPATUHI SECARA KETAT):
Admin membatasi pembuatan soal HANYA pada elemen materi berikut:
${elListStr}
DILARANG KERAS membuat soal di luar elemen materi di atas! Seluruh butir soal (${totalDiminta} butir) WAJIB didistribusikan hanya di antara elemen materi yang telah dipilih tersebut. Setiap butir soal harus mengisi field "elemen" dengan salah satu dari elemen yang dipilih di atas, dan materi substansi soal (teks soal, konsep, perhitungan, atau analisis) HARUS 100% menguji kompetensi dari elemen materi terpilih tersebut!`;
    userPrompt += elementRestrictionPrompt;
  }

  if (options.customInstruction && options.customInstruction.trim()) {
    userPrompt += `\n\nFokus/Instruksi konteks tambahan: ${options.customInstruction.trim()}`;
  }

  let parsedArray: any[] = [];
  let isMock = forceMock || false;

  // 1. Panggil Gemini API jika API Key tersedia
  if (!isMock) {
    if (!apiKey.trim()) {
      // Catat kegagalan total ke log
      const completedAt = new Date();
      const errMsg = "GEMINI_API_KEY belum dikonfigurasi di file .env server maupun di form Pengaturan Admin.";

      await saveGenerationLog({
        id: logId,
        configId: configId || null,
        jenjang,
        mapel,
        packageId: null,
        packageCode: null,
        status: "gagal",
        totalDiminta,
        totalDiterima: 0,
        totalLolos: 0,
        totalGagal: 0,
        detailPemeriksaan: [],
        errorMessage: errMsg,
        triggeredBy,
        adminId: adminId || null,
        temaKonteks: themeName,
        distribusiTema: {},
        startedAt,
        completedAt,
      });

      return {
        success: false,
        logId,
        status: "gagal",
        totalDiminta,
        totalDiterima: 0,
        totalLolos: 0,
        totalGagal: 0,
        detailPemeriksaan: [],
        errorMessage: errMsg,
        durationMs: completedAt.getTime() - startedAt.getTime(),
      };
    }

    // Respons yang JSON-nya rusak (mis. terpotong atau tanda petik tidak di-escape) diminta
    // ulang sekali; kegagalan HTTP sudah ditangani callGeminiResilient sehingga langsung dilempar.
    const callAndParse = async (prompt: string): Promise<any[]> => {
      for (let attempt = 1; ; attempt++) {
        const res = await callGeminiResilient({
          apiKey,
          preferredModel: modelName,
          systemInstruction: activeSystemPrompt,
          userPrompt: prompt,
          temperature,
        });
        try {
          return parseGeminiJson(res.rawText);
        } catch (parseErr) {
          if (attempt >= 2) throw parseErr;
          console.warn("[Generate] Respons JSON dari model tidak valid, meminta ulang sekali.");
        }
      }
    };

    try {
      if (totalDiminta <= 15) {
        // Batch kecil (<= 15 butir): panggil sekali secara langsung
        parsedArray = await callAndParse(userPrompt);
      } else {
        // Batch besar (16 - 30 butir): bagi menjadi 2 sub-batch untuk stabilitas tinggi,
        // mencegah token cutoff, dan menghindari 503 high demand spike di server Google
        const chunk1Count = Math.ceil(totalDiminta / 2);
        const chunk2Count = totalDiminta - chunk1Count;

        const distB1 = {
          PG: Math.round(chunk1Count * (distB.PG / totalDiminta)),
          PGK_MCMA: Math.round(chunk1Count * (distB.PGK_MCMA / totalDiminta)),
          PGK_KATEGORI: Math.max(0, chunk1Count - Math.round(chunk1Count * (distB.PG / totalDiminta)) - Math.round(chunk1Count * (distB.PGK_MCMA / totalDiminta))),
        };
        const distK1 = {
          rendah: Math.round(chunk1Count * (distK.rendah / totalDiminta)),
          sedang: Math.round(chunk1Count * (distK.sedang / totalDiminta)),
          tinggi: Math.max(0, chunk1Count - Math.round(chunk1Count * (distK.rendah / totalDiminta)) - Math.round(chunk1Count * (distK.sedang / totalDiminta))),
        };

        const distB2 = {
          PG: Math.max(0, distB.PG - distB1.PG),
          PGK_MCMA: Math.max(0, distB.PGK_MCMA - distB1.PGK_MCMA),
          PGK_KATEGORI: Math.max(0, distB.PGK_KATEGORI - distB1.PGK_KATEGORI),
        };
        const distK2 = {
          rendah: Math.max(0, distK.rendah - distK1.rendah),
          sedang: Math.max(0, distK.sedang - distK1.sedang),
          tinggi: Math.max(0, distK.tinggi - distK1.tinggi),
        };

        let p1 = `Hasilkan tepat ${chunk1Count} butir soal TKA berkualitas tinggi (bagian 1 dari 2) dengan distribusi bentuk soal sekitar ${distB1.PG} PG, ${distB1.PGK_MCMA} PGK_MCMA, ${distB1.PGK_KATEGORI} PGK_KATEGORI, dan distribusi tingkat kesulitan sekitar ${distK1.rendah} rendah, ${distK1.sedang} sedang, ${distK1.tinggi} tinggi untuk jenjang ${jenjang} dan mata pelajaran ${mapel}.

Ikuti gaya soal dan contoh acuan pada instruksi sistem, dan sesuaikan banyak langkah berpikir dengan tingkat kesulitan tiap butir.
${curriculumGuidance}
${formatCompetencyPlanPrompt(competencySlotPlans.slice(0, chunk1Count))}`;
        let p2 = `Hasilkan tepat ${chunk2Count} butir soal TKA berkualitas tinggi (bagian 2 dari 2) dengan distribusi bentuk soal sekitar ${distB2.PG} PG, ${distB2.PGK_MCMA} PGK_MCMA, ${distB2.PGK_KATEGORI} PGK_KATEGORI, dan distribusi tingkat kesulitan sekitar ${distK2.rendah} rendah, ${distK2.sedang} sedang, ${distK2.tinggi} tinggi untuk jenjang ${jenjang} dan mata pelajaran ${mapel}.

Ikuti gaya soal dan contoh acuan pada instruksi sistem, dan sesuaikan banyak langkah berpikir dengan tingkat kesulitan tiap butir.
${curriculumGuidance}
${formatCompetencyPlanPrompt(competencySlotPlans.slice(chunk1Count))}`;

        if (elementRestrictionPrompt) {
          p1 += elementRestrictionPrompt;
          p2 += elementRestrictionPrompt;
        }

        if (options.customInstruction && options.customInstruction.trim()) {
          p1 += `\n\nFokus/Instruksi konteks tambahan: ${options.customInstruction.trim()}`;
          p2 += `\n\nFokus/Instruksi konteks tambahan: ${options.customInstruction.trim()}`;
        }

        // Jika salah satu bagian gagal, hasil bagian lain tetap dipakai dan kekurangannya diisi
        // oleh mekanisme regenerasi — sebelumnya satu bagian gagal membuang seluruh paket.
        let arr1: any[] = [];
        let arr2: any[] = [];
        let chunkError: any = null;
        try {
          arr1 = await callAndParse(p1);
        } catch (err) {
          chunkError = err;
          console.warn("[Generate] Bagian 1 gagal, melanjutkan dengan bagian 2:", (err as Error).message);
        }
        try {
          arr2 = await callAndParse(p2);
        } catch (err) {
          if (chunkError) throw chunkError;
          console.warn("[Generate] Bagian 2 gagal, melanjutkan dengan bagian 1:", (err as Error).message);
        }

        // Hindari tabrakan ID stimulus sementara antarsub-batch
        arr2.forEach((item: any) => {
          if (item.stimulus_id_sementara) {
            item.stimulus_id_sementara = `c2-${item.stimulus_id_sementara}`;
          }
        });

        parsedArray = [...arr1, ...arr2];
      }
    } catch (apiError: any) {
      const completedAt = new Date();
      const errMsg = `Kegagalan pemanggilan model Gemini API (${modelName}): ${apiError.message}`;

      await saveGenerationLog({
        id: logId,
        configId: configId || null,
        jenjang,
        mapel,
        packageId: null,
        packageCode: null,
        status: "gagal",
        totalDiminta,
        totalDiterima: 0,
        totalLolos: 0,
        totalGagal: 0,
        detailPemeriksaan: [],
        errorMessage: errMsg,
        triggeredBy,
        adminId: adminId || null,
        startedAt,
        completedAt,
      });

      return {
        success: false,
        logId,
        status: "gagal",
        totalDiminta,
        totalDiterima: 0,
        totalLolos: 0,
        totalGagal: 0,
        detailPemeriksaan: [],
        errorMessage: errMsg,
        durationMs: completedAt.getTime() - startedAt.getTime(),
      };
    }
  } else {
    // Mode Simulasi/Mock untuk Pengujian Offline/Unit Test
    const mockJson = generateMockGeminiBatchResponse(jenjang, mapel, totalDiminta, distB, distK);
    parsedArray = parseGeminiJson(mockJson);
  }

  // 3. Pisahkan Objek Stimulus dan Objek Butir Soal
  const stimulusObjects = parsedArray.filter((item) => !item.bentuk_soal && item.stimulus_id_sementara);
  const questionObjects = parsedArray.filter((item) => !!item.bentuk_soal);

  // 4. Petakan, Validasi Panjang & Kompleksitas Wacana BSKAP, dan Simpan Stimulus ke Database
  const stimulusIdMap: Record<string, string> = {};
  const rejectedStimuli: Record<string, { reasons: string[]; metricsSummary: string }> = {};
  const textComplexityLogs: Array<{ index: number; reason: string; itemTitle?: string }> = [];
  const failedItems: Array<{ index: number; reason: string; itemTitle?: string }> = [];
  let wacanaRepaired = 0;
  let wacanaRepairFailed = 0;

  for (const stim of stimulusObjects) {
    const tempId = stim.stimulus_id_sementara;
    let content = stim.konten || "";

    // Pemeriksaan BSKAP (Hanya Bahasa Indonesia/Inggris, Matematika dilewati total)
    let valResult = validateLanguageTextComplexity({
      rawJenjang: jenjang,
      mapel,
      text: content,
      sourceLabel: `Stimulus "${tempId}"`,
    });

    if (!valResult.skipped) {
      textComplexityLogs.push({
        index: 0,
        reason: valResult.metricsSummary,
        itemTitle: `Pemeriksaan Wacana BSKAP (${tempId})`,
      });

      for (const w of valResult.warnings) {
        textComplexityLogs.push({
          index: 0,
          reason: w,
          itemTitle: "Peringatan Wacana BSKAP",
        });
      }
    }

    // Jika gagal wacana, coba PERBAIKI teksnya (murah) sebelum membuang seluruh stimulus +
    // semua soal grup yang menempel padanya (mahal — butuh regenerasi total lewat ronde retry).
    if (!valResult.valid) {
      let candidateText = content;
      let candidateReasons = valResult.reasons;
      let repairAttempt = 0;
      let repairedOk = false;
      while (repairAttempt < 2 && !repairedOk) {
        repairAttempt++;
        const repairResult = await repairStimulusWacana(apiKey, modelName, candidateText, jenjang, candidateReasons);
        if (!repairResult.success) break;

        const reValResult = validateLanguageTextComplexity({
          rawJenjang: jenjang,
          mapel,
          text: repairResult.repairedText,
          sourceLabel: `Stimulus "${tempId}" (hasil perbaikan)`,
        });

        candidateText = repairResult.repairedText;
        candidateReasons = reValResult.reasons.length ? reValResult.reasons : candidateReasons;
        valResult = reValResult;

        if (reValResult.valid) {
          content = repairResult.repairedText;
          repairedOk = true;
        }
      }

      if (repairedOk) {
        wacanaRepaired++;
      } else {
        wacanaRepairFailed++;
      }
    }

    if (!valResult.valid) {
      rejectedStimuli[tempId] = {
        reasons: valResult.reasons,
        metricsSummary: valResult.metricsSummary,
      };
      failedItems.push({
        index: 0,
        reason: `[GAGAL WACANA BSKAP] Stimulus "${tempId}": ${valResult.reasons.join("; ")}`,
        itemTitle: `Stimulus Gagal (${tempId})`,
      });
      continue;
    }

    const realStimId = `stm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const wordCount = valResult.skipped
      ? (content.trim().split(/\s+/).filter(Boolean).length)
      : valResult.wordCount;

    await db.insert(stimulus).values({
      id: realStimId,
      jenjang: jenjang as any,
      mapel,
      tipe: stim.tipe === "data" ? "data" : "teks",
      judul: `Stimulus Bacaan/Data TKA (${jenjang} - ${mapel})`,
      konten: content,
      jumlahKata: wordCount,
      dibuatOleh: adminId || "usr-admin-001",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    stimulusIdMap[tempId] = realStimId;
  }

  // 5. Jalankan Gerbang Pemeriksaan Ketat pada Tiap Butir Soal
  const validQuestions: any[] = [];
  // Menandai objek "gambar" yang berasal dari template diagram presisi (diagram_batang/lingkaran/
  // model_pecahan/garis_bilangan) SETELAH diterjemahkan jadi svg_content oleh D3 di bawah. WeakSet
  // dipilih (bukan properti biasa di objek gambar) supaya tidak ikut tersimpan ke payload database,
  // dan tetap valid walau objek soal induknya di-shallow-copy (mis. {...q, realStimulusId}) karena
  // referensi objek "gambar" itu sendiri tidak berubah. Dipakai nanti oleh gerbang Nano Banana Pro
  // agar diagram data presisi TIDAK PERNAH ikut dikonversi jadi ilustrasi kontekstual.
  const diagramOriginGambar = new WeakSet<object>();

  questionObjects.forEach((q, idx) => {
    const itemNum = idx + 1;
    const reasons: string[] = [];

    // A. Kelengkapan Field Wajib
    const requiredFields = [
      "elemen",
      "sub_elemen",
      "kompetensi",
      "level_kognitif",
      "tingkat_kesulitan",
      "bentuk_soal",
      "jenis_soal",
      "soal_text",
      "pembahasan",
      "tema_konteks",
    ];

    for (const f of requiredFields) {
      if (!q[f] || (typeof q[f] === "string" && !q[f].trim())) {
        reasons.push(`Field wajib "${f}" kosong.`);
      }
    }

    // A2. Pengecekan Tema Konteks (Revisi Terbatas Variasi Konteks)
    if (!q.tema_konteks || (typeof q.tema_konteks === "string" && !q.tema_konteks.trim())) {
      reasons.push('Field "tema_konteks" wajib diisi (tidak boleh kosong).');
    }

    // B. Pengecekan Kunci Jawaban
    if (!Array.isArray(q.kunci_jawaban) || q.kunci_jawaban.length === 0) {
      reasons.push("Kunci jawaban wajib berupa array dan tidak boleh kosong.");
    }

    // C. Pengecekan Khusus Bentuk Soal
    if (q.bentuk_soal === "PG") {
      if (!Array.isArray(q.opsi) || q.opsi.length < 2) {
        reasons.push("Bentuk PG wajib memiliki minimal 2 opsi jawaban.");
      }
      if (q.kunci_jawaban && q.kunci_jawaban.length !== 1) {
        reasons.push("Bentuk PG wajib memiliki tepat 1 kunci jawaban.");
      }
    } else if (q.bentuk_soal === "PGK_MCMA") {
      if (!Array.isArray(q.opsi) || q.opsi.length < 2) {
        reasons.push("Bentuk PGK_MCMA wajib memiliki minimal 2 opsi jawaban.");
      }
      if (
        Array.isArray(q.opsi) &&
        Array.isArray(q.kunci_jawaban) &&
        q.opsi.length >= 2 &&
        q.kunci_jawaban.length === q.opsi.length
      ) {
        reasons.push(
          "Bentuk PGK_MCMA dilarang membuat semua opsi bernilai benar (cacat desain soal asesmen); minimal 1 opsi harus salah."
        );
      }
    } else if (q.bentuk_soal === "PGK_KATEGORI") {
      if (!Array.isArray(q.pernyataan) || q.pernyataan.length === 0) {
        reasons.push("Bentuk PGK_KATEGORI wajib memiliki daftar pernyataan.");
      }
      if (!Array.isArray(q.kategori_respons) || q.kategori_respons.length === 0) {
        reasons.push("Bentuk PGK_KATEGORI wajib memiliki kategori_respons.");
      }
      if (
        Array.isArray(q.pernyataan) &&
        Array.isArray(q.kunci_jawaban) &&
        q.pernyataan.length !== q.kunci_jawaban.length
      ) {
        reasons.push(
          `Panjang kunci_jawaban (${q.kunci_jawaban.length}) tidak sama dengan jumlah pernyataan (${q.pernyataan.length}).`
        );
      }
      if (Array.isArray(q.kategori_respons) && Array.isArray(q.kunci_jawaban)) {
        const invalidAnswers = q.kunci_jawaban.filter((k: string) => !q.kategori_respons.includes(k));
        if (invalidAnswers.length > 0) {
          reasons.push(`Kunci jawaban "${invalidAnswers.join(", ")}" tidak ada dalam kategori_respons.`);
        }
      }
    }

    // D. Pengecekan Delimiter LaTeX
    if (q.soal_text) {
      const v = validateLatexDelimiters(q.soal_text, "Teks Soal");
      if (!v.valid) reasons.push(v.error!);
    }
    if (q.pembahasan) {
      const v = validateLatexDelimiters(q.pembahasan, "Pembahasan");
      if (!v.valid) reasons.push(v.error!);
    }
    if (Array.isArray(q.opsi)) {
      for (const op of q.opsi) {
        if (op.text) {
          const v = validateLatexDelimiters(op.text, `Opsi ${op.label}`);
          if (!v.valid) reasons.push(v.error!);
        }
      }
    }
    if (Array.isArray(q.pernyataan)) {
      for (const p of q.pernyataan) {
        if (p.text) {
          const v = validateLatexDelimiters(p.text, `Pernyataan #${p.no}`);
          if (!v.valid) reasons.push(v.error!);
        }
      }
    }

    // D2. Pengecekan Karakteristik Teks Wacana pada Soal Mandiri (jika soal memuat wacana > 100 kata)
    if (isLanguageSubject(mapel) && q.jenis_soal === "tunggal" && q.soal_text) {
      const wordsInStem = countWords(q.soal_text);
      if (wordsInStem >= 100) {
        const vStem = validateLanguageTextComplexity({
          rawJenjang: jenjang,
          mapel,
          text: q.soal_text,
          sourceLabel: `Teks Soal #${itemNum}`,
        });
        if (!vStem.valid) {
          reasons.push(`Wacana pada teks soal melanggar aturan BSKAP: ${vStem.reasons.join("; ")}`);
        }
      }
    }

    // D3. Render Deterministik Template Diagram (diagram_batang/lingkaran/model_pecahan/garis_bilangan)
    if (q.gambar && q.gambar.tipe === "diagram") {
      const diagramResult = renderDiagramTemplate({ archetype: q.gambar.archetype, ...(q.gambar.data || {}) });
      if (!diagramResult.svg) {
        reasons.push(`Spesifikasi template diagram tidak valid: ${diagramResult.error}`);
      } else {
        const renderedGambar = { tipe: "svg", svg_content: diagramResult.svg, deskripsi_alt: q.gambar.deskripsi_alt || "" };
        diagramOriginGambar.add(renderedGambar);
        q.gambar = renderedGambar;
      }
    }

    // D4. Pengecekan & Perbaikan Otomatis Kualitas SVG (anti-tag berbahaya & anti-output terpotong)
    if (q.gambar && q.gambar.tipe === "svg") {
      const svgResult = validateAndRepairSvg(q.gambar.svg_content);
      if (!svgResult.content) {
        reasons.push(`Ilustrasi SVG tidak valid: ${svgResult.issues.join("; ")}`);
      } else {
        q.gambar.svg_content = svgResult.content;
      }
    }

    // E. Pemetaan Stimulus
    let finalStimulusId: string | null = null;
    if (q.jenis_soal === "grup") {
      if (!q.stimulus_id_sementara) {
        reasons.push("Soal bertipe grup tidak menyertakan stimulus_id_sementara.");
      } else if (rejectedStimuli[q.stimulus_id_sementara]) {
        reasons.push(
          `Stimulus "${q.stimulus_id_sementara}" ditolak karena melanggar aturan BSKAP: ${rejectedStimuli[q.stimulus_id_sementara].reasons.join("; ")}`
        );
      } else if (!stimulusIdMap[q.stimulus_id_sementara]) {
        reasons.push(`Objek stimulus "${q.stimulus_id_sementara}" tidak ditemukan dalam batch keluaran.`);
      } else {
        finalStimulusId = stimulusIdMap[q.stimulus_id_sementara];
      }
    }

    // F. Keputusan Lolos / Gagal
    if (reasons.length > 0) {
      failedItems.push({
        index: itemNum,
        reason: reasons.join("; "),
        itemTitle: q.soal_text ? q.soal_text.substring(0, 45) + "..." : `Butir #${itemNum}`,
      });
    } else {
      validQuestions.push({
        ...q,
        realStimulusId: finalStimulusId,
      });
    }
  });

  // 5B. Pemeriksaan Sebaran Tema Konteks (Revisi Terbatas Variasi Konteks)
  const temaFrequency: Record<string, number> = {};
  questionObjects.forEach((q) => {
    const rawTheme = (q.tema_konteks || "").trim();
    if (rawTheme) {
      temaFrequency[rawTheme] = (temaFrequency[rawTheme] || 0) + 1;
    }
  });

  const themeWarnings: Array<{ index: number; reason: string; itemTitle?: string }> = [];
  for (const [tKey, count] of Object.entries(temaFrequency)) {
    if (count > 6) {
      themeWarnings.push({
        index: 0,
        reason: `[Peringatan Variasi] Tema konteks "${tKey}" digunakan ${count} kali dalam batch ini (> 6 kali dari 30 butir). Disarankan memperkaya variasi sub-konteks.`,
        itemTitle: "Peringatan Sebaran Konteks",
      });
    }
  }

  if (catatanPengecualian) {
    themeWarnings.push({
      index: 0,
      reason: catatanPengecualian,
      itemTitle: "Catatan Pengecualian Tema",
    });
  }

  // 5C. Mekanisme Regenerasi Otomatis (Retry Loop jika ada butir/stimulus yang gagal agar kuota totalDiminta tetap genap)
  let retryAttempts = 0;
  const maxRetries = 2;

  while (validQuestions.length < totalDiminta && retryAttempts < maxRetries) {
    retryAttempts++;
    const missingCount = totalDiminta - validQuestions.length;
    console.log(`[Regenerasi AI BSKAP] Percobaan ke-${retryAttempts}: Mengajukan ${missingCount} butir pengganti untuk melengkapi kuota ${totalDiminta}.`);

    // Alasan per butir (bukan hanya stimulus) diteruskan agar model tahu persis apa yang harus
    // dihindari; id sementara dinormalisasi supaya alasan yang sama tidak terulang di daftar.
    const rejectionReasons = [
      ...Object.values(rejectedStimuli).flatMap((r) => r.reasons),
      ...failedItems.map((f) => f.reason),
    ];
    const distinctReasons = [
      ...new Set(rejectionReasons.map((r) => r.replace(/"[^"]*"/g, '"…"').slice(0, 220))),
    ].slice(0, 8);

    let retryUserPrompt = `Sebagian butir pada pengiriman sebelumnya ditolak pemeriksaan otomatis. Hasilkan tepat ${missingCount} butir soal pengganti untuk jenjang ${jenjang} dan mata pelajaran ${mapel}, mengikuti gaya soal dan contoh acuan pada instruksi sistem.
${distinctReasons.length > 0 ? `\nAlasan penolakan sebelumnya (jangan diulang):\n${distinctReasons.map((r) => `- ${r}`).join("\n")}\n` : ""}${isLanguageSubject(mapel) ? `\nSetiap teks stimulus baru wajib ${formatWacanaCriteriaText(jenjang)}; hitung sendiri sebelum menjawab.\n` : ""}
${curriculumGuidance}`;

    if (elementRestrictionPrompt) {
      retryUserPrompt += elementRestrictionPrompt;
    }

    let retryParsedArray: any[] = [];
    if (!isMock && apiKey.trim()) {
      try {
        const retryRes = await callGeminiResilient({
          apiKey,
          preferredModel: modelName,
          systemInstruction: activeSystemPrompt,
          userPrompt: retryUserPrompt,
          temperature,
        });
        retryParsedArray = parseGeminiJson(retryRes.rawText);
      } catch (retryErr: any) {
        console.error(`[Regenerasi Error] Percobaan ke-${retryAttempts} gagal:`, retryErr);
        if (retryAttempts < maxRetries) {
          continue; // Coba sekali lagi di percobaan berikutnya
        }
        break;
      }
    } else {
      const mockJson = generateMockGeminiBatchResponse(jenjang, mapel, missingCount, distB, distK);
      retryParsedArray = parseGeminiJson(mockJson);
    }

    if (retryParsedArray.length === 0) break;

    const retryStimuli = retryParsedArray.filter((item) => !item.bentuk_soal && item.stimulus_id_sementara);
    const retryQuestions = retryParsedArray.filter((item) => !!item.bentuk_soal);

    for (const stim of retryStimuli) {
      const tempId = `retry-${retryAttempts}-${stim.stimulus_id_sementara}`;
      stim.stimulus_id_sementara = tempId;
      let content = stim.konten || "";

      let valResult = validateLanguageTextComplexity({
        rawJenjang: jenjang,
        mapel,
        text: content,
        sourceLabel: `Stimulus Pengganti "${tempId}"`,
      });

      if (!valResult.skipped) {
        textComplexityLogs.push({
          index: 0,
          reason: `[Regenerasi] ${valResult.metricsSummary}`,
          itemTitle: `Pemeriksaan Wacana BSKAP (${tempId})`,
        });
      }

      if (!valResult.valid) {
        let candidateText = content;
        let candidateReasons = valResult.reasons;
        let repairAttempt = 0;
        let repairedOk = false;
        while (repairAttempt < 2 && !repairedOk) {
          repairAttempt++;
          const repairResult = await repairStimulusWacana(apiKey, modelName, candidateText, jenjang, candidateReasons);
          if (!repairResult.success) break;

          const reValResult = validateLanguageTextComplexity({
            rawJenjang: jenjang,
            mapel,
            text: repairResult.repairedText,
            sourceLabel: `Stimulus Pengganti "${tempId}" (hasil perbaikan)`,
          });

          candidateText = repairResult.repairedText;
          candidateReasons = reValResult.reasons.length ? reValResult.reasons : candidateReasons;
          valResult = reValResult;

          if (reValResult.valid) {
            content = repairResult.repairedText;
            repairedOk = true;
          }
        }

        if (repairedOk) {
          wacanaRepaired++;
        } else {
          wacanaRepairFailed++;
        }
      }

      if (!valResult.valid) {
        rejectedStimuli[tempId] = {
          reasons: valResult.reasons,
          metricsSummary: valResult.metricsSummary,
        };
        failedItems.push({
          index: 0,
          reason: `[GAGAL WACANA BSKAP - REGENERASI] Stimulus "${tempId}": ${valResult.reasons.join("; ")}`,
          itemTitle: `Stimulus Gagal (${tempId})`,
        });
        continue;
      }

      const realStimId = `stm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const wordCount = valResult.skipped ? content.trim().split(/\s+/).filter(Boolean).length : valResult.wordCount;

      await db.insert(stimulus).values({
        id: realStimId,
        jenjang: jenjang as any,
        mapel,
        tipe: stim.tipe === "data" ? "data" : "teks",
        judul: `Stimulus Bacaan/Data TKA (${jenjang} - ${mapel})`,
        konten: content,
        jumlahKata: wordCount,
        dibuatOleh: adminId || "usr-admin-001",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      stimulusIdMap[tempId] = realStimId;
    }

    const requiredFields = [
      "elemen",
      "sub_elemen",
      "kompetensi",
      "level_kognitif",
      "tingkat_kesulitan",
      "bentuk_soal",
      "jenis_soal",
      "soal_text",
      "pembahasan",
      "tema_konteks",
    ];

    for (const q of retryQuestions) {
      if (validQuestions.length >= totalDiminta) break;

      if (q.stimulus_id_sementara) {
        q.stimulus_id_sementara = `retry-${retryAttempts}-${q.stimulus_id_sementara}`;
      }

      const qReasons: string[] = [];
      for (const f of requiredFields) {
        if (!q[f] || (typeof q[f] === "string" && !q[f].trim())) {
          qReasons.push(`Field wajib "${f}" kosong.`);
        }
      }

      if (q.jenis_soal === "grup") {
        if (!q.stimulus_id_sementara || rejectedStimuli[q.stimulus_id_sementara]) {
          qReasons.push("Stimulus yang terkait ditolak atau tidak valid.");
        }
      }

      if (q.gambar && q.gambar.tipe === "diagram") {
        const diagramResult = renderDiagramTemplate({ archetype: q.gambar.archetype, ...(q.gambar.data || {}) });
        if (!diagramResult.svg) {
          qReasons.push(`Spesifikasi template diagram tidak valid: ${diagramResult.error}`);
        } else {
          const renderedGambar = { tipe: "svg", svg_content: diagramResult.svg, deskripsi_alt: q.gambar.deskripsi_alt || "" };
          diagramOriginGambar.add(renderedGambar);
          q.gambar = renderedGambar;
        }
      }

      if (q.gambar && q.gambar.tipe === "svg") {
        const svgResult = validateAndRepairSvg(q.gambar.svg_content);
        if (!svgResult.content) {
          qReasons.push(`Ilustrasi SVG tidak valid: ${svgResult.issues.join("; ")}`);
        } else {
          q.gambar.svg_content = svgResult.content;
        }
      }

      if (qReasons.length === 0) {
        validQuestions.push({
          ...q,
          realStimulusId: q.jenis_soal === "grup" ? stimulusIdMap[q.stimulus_id_sementara] : null,
        });
      }
    }
  }

  if (wacanaRepaired > 0 || wacanaRepairFailed > 0) {
    textComplexityLogs.push({
      index: 0,
      reason: JSON.stringify({ repaired: wacanaRepaired, failedAfterRepair: wacanaRepairFailed }),
      itemTitle: "__WACANA_REPAIR_STATS__",
    });
  }

  // 5D. Lapis 4: Evaluasi Kemiripan (Similarity Check) & Kalibrasi Observasi 5-7 Hari
  const simEvaluation = evaluateBatchSimilarity(
    validQuestions.map((vq, idx) => ({ soal_text: vq.soal_text, index: idx + 1 })),
    recentMemory.rawStems,
    true
  );

  const similarityLogs: Array<{ index: number; reason: string; itemTitle?: string }> = [];
  if (recentMemory.rawStems.length > 0) {
    similarityLogs.push({
      index: 0,
      reason: `[Observasi Kalibrasi Kemiripan Lapis 4] Skor Rata-rata: ${simEvaluation.averageScore}%, Skor Tertinggi: ${simEvaluation.maxScore}%, Indikasi Kemiripan Tinggi (>60%): ${simEvaluation.highSimilarityCount} butir. (Mode observasi aktif: pencatatan log tanpa penolakan otomatis).`,
      itemTitle: "Kalibrasi Kemiripan AI",
    });

    for (const cl of simEvaluation.calibrationLogs) {
      similarityLogs.push({
        index: cl.itemIndex,
        reason: `[Kalibrasi Kemiripan Butir #${cl.itemIndex}] Skor: ${cl.score}% (Frasa: ${cl.phraseOverlap}%, Kata: ${cl.wordOverlap}%). Pembanding: "${cl.comparisonSnippet}"`,
        itemTitle: `Observasi Kemiripan Butir #${cl.itemIndex}`,
      });
    }
  }

  // 6. Jika tidak ada soal yang lolos pemeriksaan sama sekali -> Gagalkan
  if (validQuestions.length === 0) {
    const completedAt = new Date();
    const errMsg = `Seluruh butir soal (${questionObjects.length}) gagal dalam gerbang pemeriksaan otomatis.`;

    await saveGenerationLog({
      id: logId,
      configId: configId || null,
      jenjang,
      mapel,
      packageId: null,
      packageCode: null,
      status: "gagal",
      totalDiminta,
      totalDiterima: questionObjects.length,
      totalLolos: 0,
      totalGagal: failedItems.length,
      detailPemeriksaan: [...failedItems, ...themeWarnings, ...textComplexityLogs],
      errorMessage: errMsg,
      triggeredBy,
      adminId: adminId || null,
      temaKonteks: themeName,
      distribusiTema: temaFrequency,
      startedAt,
      completedAt,
    });

    return {
      success: false,
      logId,
      status: "gagal",
      totalDiminta,
      totalDiterima: questionObjects.length,
      totalLolos: 0,
      totalGagal: failedItems.length,
      detailPemeriksaan: failedItems,
      errorMessage: errMsg,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };
  }

  // Mode ganti slot: jangan simpan lebih banyak soal daripada slot yang akan diganti.
  const replaceSlots = options.appendToPackage?.replaceSlots;
  if (replaceSlots && validQuestions.length > replaceSlots.length) {
    validQuestions.splice(replaceSlots.length);
  }

  // 7. Hitung Sequence dan Buat Paket Baru AI (A01-..., A02-...) secara andal tanpa tabrakan kode,
  // KECUALI bila appendToPackage diisi -- soal baru disambung ke paket yang sudah ada.
  const prefix = "A";
  const jenjangCode = jenjang.split("/")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const mapelCode = mapel.toLowerCase().includes("matematika") ? "MAT" : "BIN";

  let packageCode: string;
  let packageNama: string | undefined;
  let packageId: string;

  if (options.appendToPackage) {
    packageId = options.appendToPackage.id;
    packageCode = options.appendToPackage.code;
  } else {
    // Periksa semua kode paket dan soal yang sudah ada untuk mendapatkan nomor sequence terbesar
    const existingPkgs = await db.select({ code: questionPackages.code }).from(questionPackages);
    let maxSeq = 0;
    const pkgRegex = new RegExp(`^${prefix}(\\d+)-${jenjangCode}-${mapelCode}$`);
    for (const p of existingPkgs) {
      if (p.code) {
        const match = p.code.match(pkgRegex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSeq) maxSeq = num;
        }
      }
    }

    const existingQuestions = await db.select({ code: questions.code }).from(questions);
    const qRegex = new RegExp(`^${prefix}(\\d+)-${jenjangCode}-${mapelCode}-\\d+$`);
    for (const q of existingQuestions) {
      if (q.code) {
        const match = q.code.match(qRegex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSeq) maxSeq = num;
        }
      }
    }

    const sequenceNumber = maxSeq + 1;
    const generated = generatePackageCode("ai", sequenceNumber, jenjang, mapel);
    packageCode = generated.code;
    packageNama = generated.nama;
    packageId = `pkg-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }
  // Catat sejak di sini (sebelum langkah Nano Banana/simpan yang bisa gagal) agar wrapper
  // generateBatchQuestions tahu paket mana yang sedang diproses bila terjadi crash tak tertangani.
  ctx.packageId = packageId;
  ctx.packageCode = packageCode;

  // Hitung distribusi bentuk & kesulitan AKTUAL dari soal yang benar-benar tersimpan. Untuk mode
  // sambung/ganti slot, distribusi paket dihitung ulang dari database setelah soal disimpan.
  const actualDistBentuk: Record<string, number> = {};
  const actualDistKesulitan: Record<string, number> = {};

  validQuestions.forEach((vq) => {
    actualDistBentuk[vq.bentuk_soal] = (actualDistBentuk[vq.bentuk_soal] || 0) + 1;
    actualDistKesulitan[vq.tingkat_kesulitan] = (actualDistKesulitan[vq.tingkat_kesulitan] || 0) + 1;
  });

  const packageStatus = validQuestions.length >= totalDiminta ? "dalam_validasi" : "draft";

  // 7B. Konversi Ilustrasi Kontekstual Nano Banana Pro (opsional, hanya utk gambar.tipe === "svg")
  // Berlaku sama untuk Trigger Manual maupun Jadwal Cron Otomatis Pagi karena beroperasi di sini,
  // setelah seluruh soal lolos gerbang validasi dan SEBELUM disimpan ke database.
  let nanoBananaConverted = 0;
  let nanoBananaFallback = 0;
  const nanoBananaFallbackReasons: Record<string, number> = {};

  if (storedConfig.nanoBananaEnabled && apiKey.trim()) {
    for (const vq of validQuestions) {
      if (!vq.gambar || vq.gambar.tipe !== "svg") continue;
      // PENTING: diagram_batang/lingkaran/model_pecahan/garis_bilangan SUDAH diterjemahkan jadi
      // tipe "svg" oleh D3 di atas, sehingga tidak lagi bisa dibedakan dari SVG bebas hanya lewat
      // field "tipe". diagramOriginGambar (WeakSet) yang membedakannya -- TANPA cek ini, diagram
      // data presisi akan ikut salah dikonversi jadi foto (bug nyata yang pernah terjadi).
      if (diagramOriginGambar.has(vq.gambar)) continue;

      // JANGAN konversi diagram data kuantitatif, grafik, tabel, atau diagram garis/koordinat matematika
      const isQuantitativeChart =
        vq.elemen === "Data dan Peluang" ||
        /diagram|grafik|tabel|sumbu|koordinat|garis bilangan|histogram|kartesius|frekuensi|piktogram/i.test(
          vq.sub_elemen || ""
        ) ||
        /diagram|grafik|tabel|sumbu\s*[xy]|garis\s*bilangan|koordinat/i.test(
          vq.soal_text || ""
        ) ||
        /diagram|grafik|tabel|chart|plot/i.test(
          vq.gambar.deskripsi_alt || ""
        );
      if (isQuantitativeChart) continue;

      const deskripsiAlt = vq.gambar.deskripsi_alt || vq.soal_text?.slice(0, 120) || "Ilustrasi soal";
      const imagePrompt = `Konteks soal TKA (${jenjang} - ${mapel}): ${vq.soal_text}\n\nDeskripsi ilustrasi yang dibutuhkan: ${deskripsiAlt}\n\nGambarkan HANYA skenario/pemandangan nyata yang dideskripsikan. DILARANG KERAS menambahkan garis bantu geometri, label sudut, label ukuran/angka, notasi matematika, panah pengukuran, atau anotasi teknis apa pun pada gambar. Gambar harus berupa ilustrasi/foto adegan natural, bukan diagram.`;

      const result = await callNanoBananaImage(apiKey, imagePrompt);

      if (result.success && result.dataUri) {
        const svgFallback = vq.gambar.svg_content;
        vq.gambar = {
          tipe: "ilustrasi_kontekstual",
          image_data: result.dataUri,
          deskripsi_alt: deskripsiAlt,
          svg_fallback: svgFallback,
        };
        nanoBananaConverted++;
      } else {
        // Fallback: biarkan gambar.tipe tetap "svg" apa adanya, JANGAN gagalkan proses generate paket.
        nanoBananaFallback++;
        const code = result.errorCode || "unknown_error";
        nanoBananaFallbackReasons[code] = (nanoBananaFallbackReasons[code] || 0) + 1;
        console.warn(
          `[Nano Banana] Gagal konversi ilustrasi untuk soal "${vq.soal_text?.slice(0, 60)}...": ${code} - ${result.errorMessage}`
        );
      }
    }
  }

  const nanoBananaLogs: Array<{ index: number; reason: string; itemTitle?: string }> =
    nanoBananaConverted > 0 || nanoBananaFallback > 0
      ? [
          {
            index: 0,
            itemTitle: "__NANO_BANANA_STATS__",
            reason: JSON.stringify({
              converted: nanoBananaConverted,
              fallback: nanoBananaFallback,
              fallbackReasons: nanoBananaFallbackReasons,
            }),
          },
        ]
      : [];

  // 8. Simpan paket + seluruh butir soal valid. Paket sengaja baru dibuat SETELAH langkah
  // Nano Banana yang lambat: bila fungsi serverless terputus (batas durasi Vercel) di tengah
  // pembuatan ilustrasi, tidak ada lagi paket kosong 0/30 yang tertinggal tanpa soal.
  // Mode sambung/ganti slot: paket sudah ada; jumlah, distribusi, dan statusnya dihitung ulang dari
  // database SETELAH soal disimpan (lihat di bawah loop), agar soal yang diganti tidak terhitung ganda.
  if (!options.appendToPackage) {
    await db.insert(questionPackages).values({
      id: packageId,
      code: packageCode,
      nama: packageNama,
      jenjang: jenjang as any,
      mapel,
      tipeSumber: "ai",
      authorId: adminId || "usr-admin-001",
      // jumlahSoal WAJIB angka yang benar-benar tersimpan (validQuestions.length), bukan
      // totalDiminta -- retry chunk kadang meloloskan lebih/kurang dari target, dan field ini
      // pernah keliru dibiarkan memakai angka permintaan sehingga beda dari isi paket sungguhan.
      jumlahSoal: validQuestions.length,
      distribusiBentukSoal: actualDistBentuk,
      distribusiKesulitan: actualDistKesulitan,
      status: packageStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const replacedStimulusIds = new Set<string>();

  for (let i = 0; i < validQuestions.length; i++) {
    const vq = validQuestions[i];
    const slotNumber = replaceSlots ? replaceSlots[i] : (options.appendToPackage?.startingSlot ?? 1) + i;
    const itemCode = `${packageCode}-${slotNumber.toString().padStart(2, "0")}`;

    if (replaceSlots) {
      const removed = await db
        .delete(questions)
        .where(and(eq(questions.paketId, packageId), eq(questions.nomorUrut, slotNumber)))
        .returning({ stimulusId: questions.stimulusId });
      removed.forEach((r: { stimulusId: string | null }) => r.stimulusId && replacedStimulusIds.add(r.stimulusId));
    }
    const questionId = `soal-ai-${Date.now()}-${slotNumber}-${Math.random().toString(36).substring(2, 6)}`;

    const checkSim = checkQuestionSimilarity(vq.soal_text, recentMemory.rawStems, 60);
    const assignedArchetype = competencySlotPlans[i]?.fokus || null;

    const payload = {
      soal_text: vq.soal_text,
      gambar: vq.gambar || null,
      opsi: vq.opsi || [],
      pernyataan: vq.pernyataan || [],
      kategori_respons: vq.kategori_respons || [],
      kunci_jawaban: vq.kunci_jawaban || [],
      pembahasan: vq.pembahasan,
      // Metadata Keberagaman (Lapis 2 & Lapis 4)
      target_arketipe: assignedArchetype,
      similarity_score: checkSim.score,
      similarity_pembanding: checkSim.comparedWithStem || null,
    };

    await db.insert(questions).values({
      id: questionId,
      code: itemCode,
      nomorUrut: slotNumber,
      jenjang: jenjang as any,
      mapel,
      elemen: (options.elementMode === "selective" && options.selectedElements && options.selectedElements.length > 0 &&
        !options.selectedElements.some((el) => normalizeElemenName(el) === normalizeElemenName(vq.elemen || "")))
        ? options.selectedElements[i % options.selectedElements.length]
        : vq.elemen,
      subElemen: vq.sub_elemen,
      kompetensi: vq.kompetensi,
      levelKognitif: vq.level_kognitif,
      tingkatKesulitan: vq.tingkat_kesulitan,
      bentukSoal: vq.bentuk_soal,
      jenisSoal: vq.jenis_soal,
      stimulusId: vq.realStimulusId || null,
      paketId: packageId,
      sumber: "ai_generated",
      status: "menunggu_validasi", // Masuk antrean telaah validator
      authorId: adminId || "usr-admin-001",
      validatorId: null,
      validationNotes: null,
      validatedAt: null,
      payload,
      temaKonteks: (vq.tema_konteks && typeof vq.tema_konteks === "string") ? vq.tema_konteks.trim() : themeName,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  if (options.appendToPackage) {
    const pkgQuestions = await db
      .select({ bentuk: questions.bentukSoal, tingkat: questions.tingkatKesulitan })
      .from(questions)
      .where(eq(questions.paketId, packageId));
    const distBentuk: Record<string, number> = {};
    const distKesulitan: Record<string, number> = {};
    pkgQuestions.forEach((q: { bentuk: string; tingkat: string | null }) => {
      distBentuk[q.bentuk] = (distBentuk[q.bentuk] || 0) + 1;
      if (q.tingkat) distKesulitan[q.tingkat] = (distKesulitan[q.tingkat] || 0) + 1;
    });
    await db
      .update(questionPackages)
      .set({
        jumlahSoal: pkgQuestions.length,
        distribusiBentukSoal: distBentuk,
        distribusiKesulitan: distKesulitan,
        status: pkgQuestions.length >= options.appendToPackage.targetTotal ? "dalam_validasi" : "draft",
        updatedAt: new Date(),
      })
      .where(eq(questionPackages.id, packageId));

    // Stimulus milik soal yang diganti dihapus bila tidak lagi dipakai soal lain.
    for (const stimId of replacedStimulusIds) {
      const [{ n }] = await db
        .select({ n: count() })
        .from(questions)
        .where(eq(questions.stimulusId, stimId));
      if (Number(n) === 0) await db.delete(stimulus).where(eq(stimulus.id, stimId));
    }
  }

  // 9. Catat Log Audit & Log Generasi
  // ">=" (bukan "===") supaya batch yang meloloskan LEBIH banyak dari target (retry chunk
  // kadang menghasilkan surplus valid) tetap berstatus "berhasil", bukan "sebagian" yang
  // menyiratkan kekurangan padahal sebenarnya kelebihan.
  const overallStatus = validQuestions.length >= totalDiminta ? "berhasil" : "sebagian";
  const completedAt = new Date();

  await saveGenerationLog({
    id: logId,
    configId: configId || null,
    jenjang,
    mapel,
    packageId,
    packageCode,
    status: overallStatus,
    totalDiminta,
    totalDiterima: questionObjects.length,
    totalLolos: validQuestions.length,
    totalGagal: failedItems.length,
    detailPemeriksaan: [...failedItems, ...themeWarnings, ...similarityLogs, ...textComplexityLogs, ...nanoBananaLogs],
    errorMessage: null,
    triggeredBy,
    adminId: adminId || null,
    temaKonteks: themeName,
    distribusiTema: temaFrequency,
    startedAt,
    completedAt,
  });

  await db.insert(auditLogs).values({
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: adminId || "usr-admin-001",
    userEmail: "admin@ayotka.id",
    action: "AI_GENERATE_BATCH",
    targetResource: `question_packages/${packageCode}`,
    details: {
      packageId,
      packageCode,
      totalDiminta,
      totalLolos: validQuestions.length,
      totalGagal: failedItems.length,
      status: overallStatus,
    },
    ipAddress: "127.0.0.1",
  });

  return {
    success: true,
    logId,
    status: overallStatus,
    packageCode,
    packageId,
    totalDiminta,
    totalDiterima: questionObjects.length,
    totalLolos: validQuestions.length,
    totalGagal: failedItems.length,
    detailPemeriksaan: failedItems,
    durationMs: completedAt.getTime() - startedAt.getTime(),
    nanoBananaConverted,
    nanoBananaFallback,
  };
}

/**
 * Core Engine Pembuatan Soal Otomatis Berbasis Google Gemini API. Jaring pengaman terluar:
 * apa pun yang terjadi di dalam generateBatchQuestionsCore (termasuk error tak tertangani di
 * luar semua try/catch internalnya, mis. antara penyimpanan soal dan penulisan log akhir),
 * fungsi ini MEMASTIKAN log generate tidak pernah tertinggal selamanya berstatus "berjalan".
 *
 * Ditemukan nyata di produksi: satu proses cron berhasil menyimpan paket + 30 soal secara utuh,
 * tapi log generate-nya macet di "berjalan" tanpa batas waktu karena ada error tak tertangani
 * SETELAH penyimpanan soal namun SEBELUM penulisan log akhir -- paket itu jadi tidak pernah
 * muncul di riwayat generate sama sekali walau isinya valid.
 */
export async function generateBatchQuestions(options: GenerateOptions): Promise<GenerationResult> {
  const startedAt = new Date();
  const logId = `gen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const jenjang = normalizeJenjang(options.jenjang);
  const totalDiminta = options.totalSoal && options.totalSoal > 0 ? options.totalSoal : 30;
  const ctx: GenLogContext = { packageId: null, packageCode: null };

  // Log "berjalan" ditulis di awal dan ditimpa di setiap jalur keluar (termasuk lewat catch di
  // bawah). Jika fungsi serverless terputus karena batas durasi sebelum sempat menulis apa pun
  // lagi, log ini tetap tertinggal sebagai jejak -- lebih baik daripada tanpa jejak sama sekali.
  await saveGenerationLog({
    id: logId,
    configId: options.configId || null,
    jenjang,
    mapel: options.mapel,
    packageId: null,
    packageCode: null,
    status: "berjalan",
    totalDiminta,
    totalDiterima: 0,
    totalLolos: 0,
    totalGagal: 0,
    detailPemeriksaan: [],
    errorMessage: null,
    triggeredBy: options.triggeredBy,
    adminId: options.adminId || null,
    startedAt,
    completedAt: null,
  });

  try {
    return await generateBatchQuestionsCore(options, logId, startedAt, ctx);
  } catch (err: any) {
    const completedAt = new Date();
    const message = err?.message || String(err);
    console.error("[generateBatchQuestions] Kegagalan tak tertangani:", err);
    // Bila paket sudah sempat dibuat sebelum crash, tandai "sebagian" (bukan "gagal") dan
    // sertakan tautan paketnya -- isinya mungkin sudah lengkap & valid, admin perlu memeriksa
    // langsung, bukan menganggapnya gagal total dan hilang begitu saja seperti kasus nyata di atas.
    const status = ctx.packageId ? "sebagian" : "gagal";
    const errorMessage = ctx.packageId
      ? `Proses terputus setelah paket ${ctx.packageCode} mulai disimpan (error tak terduga: ${message}). Periksa langsung kelengkapan paket ini.`
      : `Kegagalan tak terduga sebelum paket dibuat: ${message}`;

    await saveGenerationLog({
      id: logId,
      configId: options.configId || null,
      jenjang,
      mapel: options.mapel,
      packageId: ctx.packageId,
      packageCode: ctx.packageCode,
      status,
      totalDiminta,
      totalDiterima: 0,
      totalLolos: 0,
      totalGagal: 0,
      detailPemeriksaan: [],
      errorMessage,
      triggeredBy: options.triggeredBy,
      adminId: options.adminId || null,
      startedAt,
      completedAt,
    }).catch((logErr) => console.error("[generateBatchQuestions] Gagal menulis log kegagalan akhir:", logErr));

    return {
      success: false,
      logId,
      status,
      packageId: ctx.packageId || undefined,
      packageCode: ctx.packageCode || undefined,
      totalDiminta,
      totalDiterima: 0,
      totalLolos: 0,
      totalGagal: 0,
      detailPemeriksaan: [],
      errorMessage,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };
  }
}

/**
 * Generator Mock untuk Pengujian Otomatis / CI Offline
 * Menghasilkan n butir soal lengkap dengan standar Pusmendik & Defantri
 */
export function generateMockGeminiBatchResponse(
  jenjang: string,
  mapel: string,
  totalCount: number = 30,
  distB?: { PG: number; PGK_MCMA: number; PGK_KATEGORI: number },
  distK?: { rendah: number; sedang: number; tinggi: number }
): string {
  return mockDataBatchResponse(jenjang, mapel, totalCount, distB, distK);
}

