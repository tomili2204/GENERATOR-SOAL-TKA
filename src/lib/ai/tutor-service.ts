/**
 * Layanan Tutor AI Siswa (ai.ayotka.id / Tanya Tutor AI)
 * Menggunakan Gemini Flash khusus untuk interaksi siswa dengan metode Sokrates.
 * Dilengkapi multi-model fallback & auto-retry agar tidak pernah gagal saat 503/429.
 */

export interface TutorSoalContext {
  soalId?: string;
  jenjang?: string;
  mapel?: string;
  stimulus?: string;
  soal_text?: string;
  opsi?: Array<{ label: string; text: string }>;
  kunci_jawaban?: string | string[];
  pembahasan?: string;
  jawaban_siswa?: string;
  mode?: "socratic" | "solver" | "literacy" | "creator";
}

export interface TutorChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[]; // array of base64 data URIs e.g. "data:image/png;base64,..."
  documents?: Array<{ name: string; content: string }>; // text extracted from attached documents
}

const FALLBACK_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];

export function getTutorConfig() {
  const apiKey =
    process.env.AI_TUTOR_GEMINI_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";
  const modelName = process.env.AI_TUTOR_MODEL || "gemini-flash-lite-latest";
  const router9Url = process.env.ROUTER_9_BASE_URL || "http://127.0.0.1:20128/v1";
  const router9Key = process.env.ROUTER_9_API_KEY || "sk-local-dev-key";
  const router9Model = process.env.ROUTER_9_MODEL || "ayotka-tutor-combo";
  const router9Enabled = process.env.ROUTER_9_ENABLED !== "false";

  return {
    apiKey: apiKey.trim(),
    modelName: modelName.trim(),
    router9Url: router9Url.replace(/\/$/, ""),
    router9Key: router9Key.trim(),
    router9Model: router9Model.trim(),
    router9Enabled,
  };
}

export function buildTutorSystemInstruction(context?: TutorSoalContext): string {
  let soalSection = "";
  if (context && (context.soal_text || context.pembahasan)) {
    const opsiStr = context.opsi
      ? context.opsi.map((o) => `  ${o.label}. ${o.text}`).join("\n")
      : "-";
    const kunciStr = Array.isArray(context.kunci_jawaban)
      ? context.kunci_jawaban.join(", ")
      : context.kunci_jawaban || "-";

    soalSection = `
DATA SOAL YANG SEDANG DITANYAKAN SISWA:
- Jenjang: ${context.jenjang || "SD/SMP"}
- Mata Pelajaran: ${context.mapel || "Umum"}
- Stimulus/Wacana: ${context.stimulus ? `"${context.stimulus}"` : "(Tidak ada stimulus khusus)"}
- Pertanyaan Soal: "${context.soal_text || "-"}"
- Pilihan Opsi:
${opsiStr}
- Kunci Jawaban Resmi: ${kunciStr}
- Pembahasan Lengkap: "${context.pembahasan || "-"}"
- Jawaban yang Dipilih Siswa: ${context.jawaban_siswa ? `"${context.jawaban_siswa}"` : "(Belum dijawab / tidak memilih)"}
`;
  }

  const mode = context?.mode || "socratic";
  let modeGuidance = "";

  if (mode === "solver") {
    modeGuidance = `
MODE KHUSUS: PEMECAH SOAL & TRIK CEPAT (PROBLEM SOLVER)
- Berikan langkah penyelesaian yang runut, presisi, dan to-the-point.
- Setelah langkah standar, berikan "Trik Kilat / Trik Nalar Cepat" yang bisa menghemat waktu pengerjaan saat ujian.
- Sertakan verifikasi singkat agar siswa yakin jawabannya benar.`;
  } else if (mode === "literacy") {
    modeGuidance = `
MODE KHUSUS: ANALISIS LITERASI & WACANA
- Fokus pada teknik membaca kritis, menemukan ide pokok paragraf, membedakan fakta vs opini, dan menyimpulkan isi wacana.
- Tunjukkan kata kunci (clue) pada teks yang menjadi dasar pengambilan kesimpulan.
- Jelaskan makna kosakata atau peribahasa jika ada yang belum dipahami siswa.`;
  } else if (mode === "creator") {
    modeGuidance = `
MODE KHUSUS: ASISTEN PEMBUAT SOAL & GURU TKA
- Bantu pendidik atau pembuat soal menyusun soal berstandar Asesmen Kemendikdasmen RI.
- Pastikan soal memiliki stimulus kontekstual nyata, opsi pengecoh (distractor) yang masuk akal, dan indikator kompetensi yang jelas.
- Hindari pertanyaan teoretis murni tanpa stimulus.`;
  } else {
    modeGuidance = `
PEDOMAN PERILAKU & METODE PEMBELAJARAN (SOKRATIK PEDAGOGY):
1. **Sapaan Hangat & Santun:**
   - Gunakan bahasa Indonesia yang bersahabat, komunikatif, dan memotivasi (contoh: "Halo! Tenang, soal ini memang seru untuk kita bedah bersama 😊").
   - Sesuaikan gaya bahasa dengan jenjang anak (bahasa yang sederhana, jelas, dan tidak kaku).

2. **JANGAN LANGSUNG MEMBOCORKAN JAWABAN MENTAH:**
   - Jika siswa bertanya "Apa jawabannya?" atau "Kenapa salah?", jangan langsung menyebut huruf kunci jawaban di kalimat pertama.
   - Pancing logika berpikir siswa secara bertahap. Tunjukkan langkah awal atau konsep kuncinya terlebih dahulu, lalu ajak siswa menarik kesimpulan bersama.
   - Jika siswa salah menjawab, tunjukkan di mana biasanya letak "jebakan" atau kekeliruan perhitungan/pemahaman tanpa membuat siswa berkecil hati.`;
  }

  return `Anda adalah "Tutor AI AyoTKA" — asisten dan guru digital cerdas, ramah, sabar, dan suportif bagi pendidikan jenjang SD dan SMP di Indonesia.
Siswa atau pendidik sedang berkonsultasi seputar materi pelajaran, soal ujian TKA (Tes Kemampuan Akademik), maupun konsep akademik.

${soalSection}

${modeGuidance}

ATURAN WAJIB NOTASI MATEMATIKA & FORMAT (KATEX):
- Selalu apit setiap rumus, pecahan, variabel, operasi hitung, atau simbol matematika dengan tanda dollar tunggal \`$...$\` untuk inline, atau ganda \`$$...$$\` untuk display.
- Contoh: \`$\\frac{3}{4} + \\frac{1}{2} = \\frac{5}{4}$\`, \`$x = 12$\`, \`$12 + 8 = 20$\`, \`$\\text{cm}^2$\`, \`$\\sqrt{144} = 12$\`.
- DILARANG KERAS menggunakan tanda kutip terbalik / backtick (\`...\`) untuk menulis angka atau ekspresi hitungan (JANGAN tulis \`12\` atau \`8\`, WAJIB tulis $12$ atau $8$ dengan tanda dollar).
- Gunakan poin-poin bertahap (Langkah 1, Langkah 2) agar pembaca nyaman dan tidak lelah membaca teks panjang.
- Akhiri penjelasan dengan kalimat penyemangat atau pertanyaan reflektif untuk mengecek pemahaman.`;
}

/**
 * Panggil AI untuk percakapan Tutor AI:
 * Tahap 1: Coba via 9Router (Combo Multi-AI: Gemini Flash + Backup dengan auto-failover)
 * Tahap 2: Fallback otomatis langsung ke Google Gemini API jika 9Router tidak merespons
 */
export async function getTutorChatResponse(params: {
  context?: TutorSoalContext;
  messages: TutorChatMessage[];
}): Promise<{ reply: string; modelUsed: string }> {
  const config = getTutorConfig();
  const systemInstruction = buildTutorSystemInstruction(params.context);

  // TAHAP 1: Coba lewat 9Router Combo jika diaktifkan
  if (config.router9Enabled && config.router9Url) {
    try {
      const openAiMessages = [
        { role: "system", content: systemInstruction },
        ...params.messages.map((m) => {
          let textContent = m.content || "";
          if (m.documents && m.documents.length > 0) {
            for (const doc of m.documents) {
              textContent += `\n\n[DOKUMEN TERLAMPIR: ${doc.name}]\n${doc.content}\n[AKHIR DOKUMEN]`;
            }
          }

          if (m.images && m.images.length > 0) {
            return {
              role: m.role,
              content: [
                { type: "text", text: textContent || "Periksa lampiran gambar ini." },
                ...m.images.map((img) => ({
                  type: "image_url",
                  image_url: { url: img },
                })),
              ],
            };
          }

          return {
            role: m.role,
            content: textContent,
          };
        }),
      ];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const res = await fetch(`${config.router9Url}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.router9Key}`,
        },
        body: JSON.stringify({
          model: config.router9Model,
          stream: false,
          messages: openAiMessages,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim().length > 0) {
          return { reply: content.trim(), modelUsed: "AyoTKA Tutor AI" };
        }
      } else {
        const errText = await res.text().catch(() => "");
        console.warn(`[Tutor AI] 9Router mengembalikan status ${res.status}: ${errText}. Beralih ke fallback Gemini direct...`);
      }
    } catch (err: any) {
      console.warn(`[Tutor AI] 9Router tidak dapat dihubungi (${err.message}). Beralih ke direct Gemini fallback...`);
    }
  }

  // TAHAP 2: Fallback langsung ke Google Gemini API
  const modelsToTry = [
    config.modelName,
    ...FALLBACK_MODELS.filter((m) => m !== config.modelName),
  ];

  const contents = params.messages.map((m) => {
    let textContent = m.content || "";
    if (m.documents && m.documents.length > 0) {
      for (const doc of m.documents) {
        textContent += `\n\n[DOKUMEN TERLAMPIR: ${doc.name}]\n${doc.content}\n[AKHIR DOKUMEN]`;
      }
    }

    const parts: any[] = [{ text: textContent || "Periksa lampiran berikut." }];

    if (m.images && m.images.length > 0) {
      for (const img of m.images) {
        const match = img.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }
    }

    return {
      role: m.role === "assistant" ? "model" : "user",
      parts,
    };
  });

  const payload: any = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  let lastError: any = null;

  for (const currentModel of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${config.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const msg = errorJson?.error?.message || `Status ${res.status}`;
        console.warn(`[Tutor AI Direct] Model ${currentModel} mengembalikan status ${res.status}: ${msg}. Mencoba model alternatif...`);
        lastError = new Error(msg);
        continue;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim().length > 0) {
        return { reply: text.trim(), modelUsed: "AyoTKA Tutor AI" };
      }
    } catch (err: any) {
      console.warn(`[Tutor AI Direct] Kesalahan koneksi pada model ${currentModel}:`, err.message);
      lastError = err;
    }
  }

  throw new Error(
    lastError?.message || "Seluruh model Tutor AI saat ini sedang sibuk. Silakan coba lagi beberapa saat lagi."
  );
}
