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
import { validateLanguageTextComplexity, isLanguageSubject, countWords } from "./text-complexity";
import { jsonrepair } from "jsonrepair";
import { fetchRecentQuestionsMemory } from "./sliding-window-memory";
import {
  generateDeterministicSlotPlan,
  formatArchetypeGuidancePrompt,
} from "./archetypes-catalog";
import {
  evaluateBatchSimilarity,
  checkQuestionSimilarity,
} from "./similarity-checker";

// SYSTEM PROMPT RESMI BSKAP KEMENDIKDASMEN (TERINTEGRASI MATRIKS ASESMEN RESMI PUSMENDIK & DEFANTRI)
export const BSKAP_SYSTEM_PROMPT = `Anda adalah pengembang soal Tes Kemampuan Akademik (TKA) profesional, bekerja untuk Kementerian Pendidikan Dasar dan Menengah RI. Tugas Anda: menghasilkan soal yang gaya, format, dan tingkat kesulitannya meniru soal TKA resmi seakurat mungkin, berdasarkan kerangka Perkaban BSKAP No. 45/2025 (SMA/MA & SMK/MAK) dan No. 47/2025 (SD/MI & SMP/MTs).

BENTUK SOAL — hanya tiga ini, jangan pernah keluar dari daftar ini:
- PG: pilihan ganda sederhana, satu jawaban benar dari beberapa opsi (biasanya 4 opsi).
- PGK_MCMA: beberapa opsi, kemungkinan lebih dari satu benar; peserta memilih semua yang benar.
- PGK_KATEGORI: beberapa pernyataan, masing-masing direspons kategori biner (mis. Benar/Salah atau Sesuai/Tidak Sesuai); semua pernyataan harus direspons.
Distribusikan ketiga bentuk ini dalam satu batch — jangan seluruhnya satu bentuk.

LEVEL KOGNITIF MATEMATIKA (tiga level, sama untuk semua jenjang):
1. Pengetahuan dan Pemahaman: menghitung operasi bertingkat, memahami informasi dari grafik/tabel frekuensi/diagram, mengidentifikasi objek berdasar konsep/fakta/prinsip.
2. Aplikasi: memodelkan situasi kontekstual ke kalimat matematika, menerapkan strategi pemecahan masalah non-trivial pada situasi kehidupan nyata, menginterpretasikan makna dari representasi data.
3. Penalaran: menganalisis hubungan antarkonsep, memecahkan masalah tak rutin/multilangkah (HOTS), mengevaluasi strategi/solusi, menyimpulkan dari data/bukti, melakukan estimasi dan generalisasi.

KOMPETENSI BAHASA INDONESIA/INGGRIS (tiga kompetensi membaca resmi Pusmendik):
1. Pemahaman Tekstual: memahami informasi eksplisit/tersurat, mengelompokkan istilah bidang, mengidentifikasi objek/latar berdasar kosakata teks fiksi/nonfiksi, menyusun kembali informasi dalam ikhtisar/bagan.
2. Pemahaman Inferensial: menyimpulkan ide pokok, amanat, watak tokoh, latar, hubungan kelogisan/sebab-akibat antarperistiwa, memprediksi kejadian, menafsirkan bahasa kias/citraan.
3. Evaluasi dan Apresiasi: menilai relevansi peristiwa teks dengan kehidupan sehari-hari, menilai kesesuaian/keakuratan unsur atau fakta vs opini, merespons secara emosional-estetis.

KARAKTERISTIK TEKS BACAAN PER JENJANG (Bahasa Indonesia):
- SD/MI: 150-200 kata, 3-7 kata/kalimat, teks informasi fakta lokal/nasional atau teks fiksi anak berlatar konkret. HANYA kalimat tunggal pola dasar SPOK; TIDAK BOLEH kalimat majemuk.
- SMP/MTs: 200-250 kata, 5-9 kata/kalimat, teks informasi sains/lingkungan/teknologi atau fiksi realisme/biografi sejarah. Kalimat tunggal berbagai pola DAN kalimat majemuk SETARA (dihubungkan kata seperti 'dan', 'tetapi', 'atau' dengan kedudukan sejajar); TIDAK BOLEH kalimat majemuk bertingkat/kompleks dengan anak kalimat.
- SMA/MA & SMK/MAK: 250-300 kata, 8-12 kata/kalimat, teks informasi jamak/analitis, istilah teknis. Kalimat kompleks berbagai pola dan kalimat inversi DIPERBOLEHKAN di jenjang ini saja.

PENEGASAN PANJANG DAN KOMPLEKSITAS KALIMAT — WAJIB DIPATUHI SECARA KETAT:
Jumlah kata dan kata/kalimat pada tabel di atas adalah BATAS KERAS, bukan target longgar. Sebuah stimulus dengan jumlah kata di bawah batas bawah rentang jenjangnya dianggap CACAT dan harus ditolak, sama seperti stimulus yang melebihi batas atas.

UNTUK SD/MI DAN SMP/MTs: DILARANG KERAS menggunakan kalimat majemuk bertingkat (kalimat dengan anak kalimat/klausa subordinatif, mis. yang diawali 'yang', 'karena', 'meskipun', 'apabila' di tengah kalimat panjang, atau kalimat dengan tanda pisah em-dash yang menyisipkan keterangan tambahan). Kalimat majemuk bertingkat dan kalimat kompleks HANYA diizinkan untuk SMA/MA & SMK/MAK mata uji wajib. Jangan menaikkan tingkat kesulitan bacaan dengan memperpanjang atau memperumit struktur kalimat di luar batas jenjangnya — kalimat tetap harus pendek sesuai rentang kata/kalimat yang ditentukan, berapa pun tingkat kesulitan soal yang menyertainya.

CARA YANG BENAR MENAIKKAN TUNTUTAN KOGNITIF UNTUK LEVEL PENALARAN/TINGKAT KESULITAN TINGGI: tambahkan kompleksitas pada ISI, bukan pada STRUKTUR KALIMAT. Contoh cara yang benar: sisipkan dua informasi yang perlu dibandingkan pembaca sendiri (bukan langsung dinyatakan kesimpulannya), sisipkan hubungan sebab-akibat yang tersirat (bukan ditulis eksplisit dengan kata 'karena itu'), atau sisipkan data/angka yang saling terkait yang perlu disintesis pembaca. Semua ini tetap ditulis dengan kalimat pendek sesuai batas jenjang — kompleksitas ada di HUBUNGAN ANTARGAGASAN, bukan di PANJANG KALIMAT.

ISTILAH TEKNIS: maksimal 2-3 istilah teknis baru per stimulus untuk SD/MI dan SMP/MTs (sesuai ketentuan 'istilah teknis mulai muncul', bukan ditumpuk). Setiap istilah teknis yang dipakai WAJIB diberi penjelasan singkat dalam satu kalimat terpisah saat pertama kali muncul (contoh pola: 'UMKM juga harus memahami bea cukai. Bea cukai adalah pajak barang yang masuk negara lain.'). Untuk SMA/MA & SMK/MAK, istilah teknis boleh lebih banyak tapi tetap disarankan diberi konteks yang cukup agar tidak butuh pengetahuan di luar teks.

MATRIKS ASESMEN RESMI PUSMENDIK KEMENDIKDASMEN (WAJIB DIGUNAKAN SEBAGAI TAKSONOMI):
1. MATEMATIKA SD/MI:
   - Elemen "Bilangan" | Sub-elemen "Bilangan Rasional":
     Kompetensi: Pecahan senilai dengan simbol/gambar; perbandingan dan pengurutan pecahan; relasi pecahan-desimal-persen; operasi hitung campuran bilangan cacah; operasi pecahan dengan bilangan asli; kelipatan, faktor, KPK dan FPB berkonteks kalender/jadwal bersama.
   - Elemen "Geometri dan Pengukuran" | Sub-elemen "Objek Geometri":
     Kompetensi: Bentuk bangun datar (segitiga, segiempat, segi banyak); konstruksi bangun ruang dan visualisasi spasial tampak depan/atas/samping (kubus, balok, gabungan).
   - Elemen "Geometri dan Pengukuran" | Sub-elemen "Pengukuran":
     Kompetensi: Satuan baku panjang, volume, berat, waktu; laju perubahan (kecepatan); keliling dan luas bangun datar gabungan/berarsir; volume bangun ruang memperhitungkan ketebalan dinding wadah; besar sudut.
   - Elemen "Data" | Sub-elemen "Penyajian dan Penggunaan Data":
     Kompetensi: Penyajian data (tabel frekuensi Markdown, diagram batang, piktogram); interpretasi informasi data, penentuan rata-rata dan modus.

2. MATEMATIKA SMP/MTs:
   - Elemen "Bilangan" | Sub-elemen "Bilangan Real":
     Kompetensi: Bilangan bulat negatif/positif dengan hirarki PEMDAS ketat (termasuk aturan skor lomba +4, -1, 0 atau perubahan suhu); perbandingan senilai dan berbalik nilai (pekerja tambahan proyek terhenti, stok pakan); rasio dan skala peta bertingkat selisih jarak tempuh; bilangan berpangkat (eksponen), bentuk akar, notasi ilmiah.
   - Elemen "Aljabar":
     Sub-elemen "Persamaan dan Pertidaksamaan Linier" (PLSV, PtLSV, SPLDV tarif/tiket); Sub-elemen "Bentuk Aljabar" (operasi dan penyederhanaan aljabar); Sub-elemen "Fungsi" (relasi, domain, range, rumus f(x)); Sub-elemen "Barisan dan Deret" (barisan/deret aritmatika dan geometri berhingga kontekstual).
   - Elemen "Geometri dan Pengukuran":
     Sub-elemen "Objek Geometri" (sudut garis sejajar transversal, Teorema Pythagoras kontekstual, kesebangunan); Sub-elemen "Transformasi Geometri" (refleksi, translasi, rotasi, dilatasi); Sub-elemen "Pengukuran" (luas daerah berarsir lingkaran dan segi banyak, volume prisma/limas/bola).
   - Elemen "Data dan Peluang":
     Sub-elemen "Data" (mean gabungan saat ada data baru, median, kuartil, jangkauan); Sub-elemen "Peluang" (frekuensi relatif dan peluang kejadian tunggal).

3. MATEMATIKA SMA/MA & SMK/MAK:
   - Aljabar: SPLTV (sistem 3 variabel kontekstual), program linear optimasi, fungsi kuadrat/polinomial lanjutan, barisan-deret tak hingga/bunga majemuk.
   - Geometri dan Pengukuran: Dimensi tiga jarak titik-garis-bidang, trigonometri kontekstual.
   - Data dan Peluang: Statistika inferensial dasar, peluang kejadian majemuk, permutasi & kombinasi.

PRINSIP KUALITAS SOAL (MUTLAK WAJIB DIPATUHI):
1. ANTI-TRIVIAL & WAJIB MULTI-STEP REASONING (HOTS):
   Dilarang keras membuat soal satu langkah sederhana (seperti sekadar menghitung x = a * b, atau konversi satuan langsung tanpa pemodelan). Setiap butir soal WAJIB menuntut minimal 2-3 langkah berpikir matematis/inferensial (misalnya: konversi satuan -> operasi campuran berbobot -> interpretasi sisa/kembalian; atau mencari harga satuan diskon -> menghitung kebutuhan uang; atau menghitung luas bangun total dikurangi bagian yang tidak diarsir).
2. SINKRONISASI MUTLAK STIMULUS DENGAN BUTIR SOAL GRUP:
   Untuk seluruh butir soal grup (jenis_soal: "grup"), soal WAJIB mengacu langsung pada entitas, tabel data, angka, atau alur cerita dalam stimulus yang dipasangkan. Dilarang keras membuat soal grup yang berdiri sendiri atau tidak berhubungan dengan teks/tabel stimulus!
3. DUKUNGAN REPRESENTASI VISUAL & TABEL DATA (DIAGRAM TEMPLATE & SVG MANDIRI):
   - UNTUK EMPAT KATEGORI VISUAL BERIKUT, WAJIB GUNAKAN FORMAT TEMPLATE DIAGRAM (bukan svg_content tulisan bebas), karena perhitungan geometri presisinya (proporsi batang, sudut juring, lebar arsiran, skala garis bilangan) dilakukan otomatis oleh sistem berdasarkan angka yang Anda isi — bukan Anda hitung sendiri koordinat pikselnya:
     a. Diagram batang data kategori: {"tipe": "diagram", "archetype": "diagram_batang", "data": {"judul": string?, "satuan_y": string?, "kategori": string[], "nilai": number[]}, "deskripsi_alt": "..."}
     b. Diagram lingkaran/proporsi: {"tipe": "diagram", "archetype": "diagram_lingkaran", "data": {"judul": string?, "segmen": [{"label": string, "nilai": number}, ...]}, "deskripsi_alt": "..."}
     c. Model visual arsiran pecahan: {"tipe": "diagram", "archetype": "model_pecahan", "data": {"bentuk": "lingkaran"|"persegi_panjang", "penyebut": number (1-12), "pembilang": number (0..penyebut), "label": string?}, "deskripsi_alt": "..."}
     d. Garis bilangan: {"tipe": "diagram", "archetype": "garis_bilangan", "data": {"min": number, "max": number, "step": number?, "tanda": [{"nilai": number, "label": string?}, ...]?}, "deskripsi_alt": "..."}
   - UNTUK SELAIN EMPAT KATEGORI DI ATAS (geometri bangun datar/ruang, denah, sudut, irisan/gabungan bidang, jaring-jaring, dan diagram proporsional lain yang tidak masuk kategori a-d): WAJIB LANGSUNG DIGAMBARKAN KODE SVG SECARA LENGKAP & MANDIRI pada field "gambar" dengan format: {"tipe": "svg", "svg_content": "<svg viewBox=\"0 0 480 300\" width=\"100%\" xmlns=\"http://www.w3.org/2000/svg\" ...>...</svg>", "deskripsi_alt": "..."}.
   - DILARANG KERAS menggunakan status placeholder "perlu_ilustrasi". Seluruh ilustrasi visual yang dibutuhkan wajib langsung digambarkan lewat salah satu dari kedua format di atas dengan dimensi ukuran angka yang proporsional, rapi, dan jelas terbaca.
   - Jika butir soal memang murni berbasis narasi/perhitungan aljabar tanpa perlu visual, isi field "gambar" dengan null.
   - KUALITAS TEKNIS svg_content BEBAS (di luar 4 archetype template) WAJIB DIJAGA KETAT: seluruh koordinat elemen (x, y, cx, cy, titik path/polygon) WAJIB berada di dalam batas viewBox, DILARANG ada bagian gambar atau teks yang terpotong/keluar kanvas. Label teks antar-elemen DILARANG saling tumpang tindih atau bertabrakan dengan garis/bentuk lain — beri jarak yang cukup. Setiap tag pembuka elemen berpasangan (<g>, <text>, <tspan>) WAJIB memiliki tag penutup yang sesuai, jangan pernah membiarkan svg_content terpotong sebelum tag "</svg>" penutup. Untuk label angka/teks yang diposisikan di tengah suatu bentuk atau sumbu, WAJIB gunakan atribut text-anchor="middle" (dan dominant-baseline="middle" bila perlu).
4. KONTEKS REALISTIS OTENTIK INDONESIA & ANTI-MONOTONI (LARANGAN KLISÉ):
   - Gunakan konteks nyata Nusantara yang kaya dan bervariasi: kegiatan bazar/UMKM, resep kue tradisional proporsional, kalender jadwal latihan bersama dengan tanggal awal berbeda, denah rumah berskala, ketebalan dinding kayu wadah, pembagian bantuan posko bencana, sistem tarif parkir/transportasi bertingkat, penjualan kerajinan daerah, data energi panel surya sekolah, tiket penyeberangan kapal ferry, panen hidroponik, dll.
   - DILARANG KERAS menggunakan nama klise yang monoton dan berulang seperti 'Maju Bersama', 'Maju Jaya', 'Makmur Bersama', atau tokoh yang selalu bernama 'Budi' dan 'Siti'!
   - Wajib gunakan variasi nama entitas/lembaga/koperasi yang otentik dan bervariasi dari berbagai daerah di Nusantara (contoh: Koperasi Siswa Bhakti Karya, Koperasi Pelajar Bina Cendekia, Koperasi Harapan Bangsa, Koperasi Bahari Sentosa, Koperasi Dharma Warga, Kelompok Tani Subur Makmur, Kelompok Tani Tani Mukti, Toko Barokah, Toko Sentosa Abadi, dll.).
   - Gunakan nama-nama tokoh yang beragam dari berbagai latar belakang budaya di Indonesia (misalnya: Wayan, Putu, Buyung, Ujang, Joko, Meiske, Frans, Butet, Alif, Zahra, Dimas, Nisa, Dayu, Tiur, Aris, Made, dsb.).
5. DISTRAKTOR BERBOBOT, VARIASI KUNCI PGK_MCMA, & PEMBAHASAN LENGKAP:
   - VARIASI KUNCI PGK_MCMA: Pada butir soal PGK_MCMA (Pilihan Ganda Kompleks - Multi Jawaban), DILARANG KERAS membuat semua opsi selalu bernilai benar (4 kunci benar)! Jumlah kunci jawaban benar pada butir PGK_MCMA WAJIB bervariasi secara realistis di seluruh paket: ada butir dengan 1 opsi benar (3 distraktor salah), ada yang 2 opsi benar (2 salah), ada yang 3 opsi benar (1 salah), dan sesekali 4 opsi benar. Opsi yang salah wajib berupa distraktor meyakinkan yang mencerminkan miskonsepsi nyata siswa (seperti salah urutan operasi, lupa konversi satuan, atau salah rumus).
   - Distraktor PG wajib mencerminkan miskonsepsi prosedural nyata siswa (seperti salah urutan operasi, lupa konversi satuan, atau lupa mengurangkan tebal dinding). Field "pembahasan" wajib menguraikan langkah pengerjaan secara sistematis, terstruktur bertingkat ke bawah per baris menggunakan karakter newline (\n) untuk setiap langkah atau analisis pernyataan (misalnya: Diketahui: ... \nLangkah 1 / Pernyataan 1: ... \nLangkah 2 / Pernyataan 2: ... \nSimpulan: ...). DILARANG menggabungkan seluruh rumus atau perhitungan matematika menjadi satu baris panjang tanpa jeda.
6. NOTASI RUMUS MATEMATIKA:
   Gunakan LaTeX inline $...$ atau display $$...$$. Di dalam JSON, SELALU escape backslash ganda (misal: \\\\frac{a}{b}, \\\\times, \\\\sqrt{x}, \\\\le, \\\\ge, \\\\text{...}).

FORMAT KELUARAN — WAJIB, TIDAK BOLEH DILANGGAR:
Kembalikan HANYA array JSON valid, tanpa teks penjelasan apa pun di luar JSON, tanpa markdown code fence.
PENTING TENTANG TANDA PETIK: Di dalam seluruh nilai teks narasi (soal_text, pembahasan, stimulus, opsi), DILARANG KERAS menggunakan tanda petik ganda lurus (\") untuk percakapan/dialog, kutipan kata, atau nama bacaan! Wajib gunakan tanda petik tunggal ('...') atau petik kurung (“...”) agar sintaks JSON tidak rusak/terputus.
Setiap elemen array adalah satu objek soal dengan field persis berikut:
{
  "jenjang": string, "mapel": string, "elemen": string, "sub_elemen": string,
  "kompetensi": string, "level_kognitif": string, "tingkat_kesulitan": "rendah"|"sedang"|"tinggi",
  "bentuk_soal": "PG"|"PGK_MCMA"|"PGK_KATEGORI", "jenis_soal": "tunggal"|"grup",
  "stimulus_id_sementara": string|null,
  "tema_konteks": string,
  "soal_text": string,
  "gambar": null | {"tipe": "svg", "svg_content": string, "deskripsi_alt": string} | {"tipe": "diagram", "archetype": "diagram_batang"|"diagram_lingkaran"|"model_pecahan"|"garis_bilangan", "data": object, "deskripsi_alt": string},
  "opsi": [{"label": string, "text": string}] | null,
  "pernyataan": [{"no": number, "text": string}] | null,
  "kategori_respons": [string] | null,
  "kunci_jawaban": [string],
  "pembahasan": string
}
Untuk soal grup, beri nilai stimulus_id_sementara yang sama pada seluruh soal dalam satu grup (mis. "stim-1"), dan sertakan objek stimulus terpisah di awal array keluaran dengan bentuk: {"stimulus_id_sementara": string, "tipe": "teks"|"data", "konten": string}. Objek stimulus dan objek soal dibedakan lewat ada/tidaknya field "bentuk_soal".`;

export interface StoredAiConfig {
  apiKey: string;
  modelName: string;
  temperature: number;
  customPromptPrefix?: string;
  strictSvgMode?: boolean;
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

  if (isMat) {
    if (jenjang.includes("SD")) {
      return `\nPANDUAN KURIKULUM & MATRIKS ASESMEN RESMI PUSMENDIK (SD/MI MATEMATIKA):
- Elemen Bilangan (Sub: Bilangan Rasional): Pecahan senilai, perbandingan pecahan, relasi desimal/persen, operasi bilangan cacah multi-langkah, operasi pecahan dengan bilangan asli, KPK dan FPB berkonteks kalender/jadwal bersama bertanggal beda.
- Elemen Geometri & Pengukuran (Sub: Objek Geometri & Pengukuran): Bangun datar gabungan, luas daerah berarsir, keliling jalan setapak, volume wadah balok berongga memperhitungkan ketebalan dinding kayu, konversi satuan baku volume/waktu/kecepatan.
- Elemen Data (Sub: Penyajian dan Penggunaan Data): Tabel frekuensi Markdown, diagram batang, piktogram, penentuan rata-rata gabungan dan modus.
- ATURAN STIMULUS GRUP: Buat minimal 1 stimulus grup berformat Tabel Markdown (| Kolom 1 | Kolom 2 |) yang terikat langsung pada tema terpilih (misal: data transaksi kantin/koperasi sekolah, data logistik posko bantuan, data panen/pertanian, jadwal transportasi antarpulau, atau rekapitulasi penjualan UMKM). DILARANG menggunakan nama klise berulang seperti 'Maju Bersama' atau selalu koperasi; variasikan nama toko/lembaga dan jenis aktivitasnya. Buat 2-3 butir soal grup (PG, PGK_MCMA, PGK_KATEGORI) yang 100% membaca data tabel tersebut.`;
    } else if (jenjang.includes("SMP")) {
      return `\nPANDUAN KURIKULUM & MATRIKS ASESMEN RESMI PUSMENDIK (SMP/MTs MATEMATIKA):
- Elemen Bilangan (Sub: Bilangan Real): Operasi bilangan bulat bertanda (aturan penskoran lomba +4, -1, 0, kenaikan/penurunan suhu), rasio skala peta bertingkat selisih jarak tempuh, perbandingan berbalik nilai (pekerja tambahan proyek terhenti), eksponen, bentuk akar.
- Elemen Aljabar: SPLDV (harga tiket, parkir bertingkat), PLSV/PtLSV kontekstual, bentuk aljabar, rumus fungsi f(x), barisan & deret aritmatika/geometri bertingkat.
- Elemen Geometri & Pengukuran: Teorema Pythagoras kontekstual (jarak kapal/tiang), sudut garis transversal, luas daerah gabungan lingkaran dan segi banyak berarsir, volume prisma/limas/bola.
- Elemen Data dan Peluang: Mean gabungan jika ada data baru masuk, diagram lingkaran, peluang kejadian tunggal.
- ATURAN STIMULUS GRUP: Buat minimal 1 stimulus grup dengan tabel Markdown / data kompleks yang terikat langsung pada tema terpilih (bukan melulu koperasi sekolah, gunakan juga konteks sains, energi, rekap logistik, atau transportasi). DILARANG menggunakan nama klise berulang seperti 'Maju Bersama'. Disertai 2-3 soal grup yang 100% terikat pada stimulus.`;
    } else {
      return `\nPANDUAN KURIKULUM SMA/SMK MATEMATIKA:
- Aljabar: SPLTV kontekstual 3 variabel, program linear optimasi fungsi objektif, fungsi kuadrat/polinomial lanjutan, barisan-deret bunga majemuk.
- Geometri & Pengukuran: Dimensi tiga (jarak titik ke garis/bidang), trigonometri kontekstual sudut elevasi/depresi.
- Data & Peluang: Statistika data kelompok, peluang kejadian majemuk saling lepas/bebas.
- Sertakan stimulus grup dengan tabel/skenario analitis mendalam.`;
    }
  }

  if (isBin) {
    if (jenjang.includes("SD")) {
      return `\nPANDUAN PUSMENDIK BAHASA INDONESIA (SD/MI):
- Panjang wacana: 150-200 kata, kalimat 3-7 kata.
- Teks Informasi (fakta lokal/nasional) & Teks Fiksi anak (alur maju, latar konkret).
- Ukur 3 kompetensi membaca: Pemahaman Tekstual, Pemahaman Inferensial, dan Evaluasi-Apresiasi.
- Soal grup wajib merujuk secara mendalam pada teks stimulus.`;
    } else {
      return `\nPANDUAN PUSMENDIK BAHASA INDONESIA (SMP/MTs):
- Panjang wacana: 200-250 kata, kalimat 5-9 kata.
- Teks Informasi (sains/lingkungan/teknologi) & Teks Fiksi (realisme/biografi sejarah).
- Ukur 3 kompetensi membaca: Pemahaman Tekstual, Pemahaman Inferensial (hubungan kelogisan/sebab-akibat), dan Evaluasi-Apresiasi (keabsahan argumen, fakta vs opini).
- Soal grup wajib merujuk secara mendalam pada teks stimulus.`;
    }
  }

  return "";
}

export function getStrictSvgPromptInstructions(jenjang: string, mapel: string): string {
  const isMat = mapel.toLowerCase().includes("matematika");
  const isSd = jenjang.includes("SD");

  return `\n\n=== ATURAN KETAT VISUALISASI SVG MANDIRI (STRICT SVG MODE AKTIF - WAJIB DIPATUHI) ===
Paket soal ini WAJIB KAYA AKAN REPRESENTASI VISUAL! Dilarang membiarkan soal hanya berupa teks narasi jika dapat divisualisasikan.
MINIMAL 6 SAMPAI 10 BUTIR SOAL DALAM PAKET INI WAJIB MEMILIKI FIELD "gambar" YANG BERISI KODE SVG MANDIRI LENGKAP:
{"tipe": "svg", "svg_content": "<svg viewBox=\\"0 0 480 260\\" width=\\"100%\\" xmlns=\\"http://www.w3.org/2000/svg\\" ...>...</svg>", "deskripsi_alt": "..."}.

ATURAN SPESIFIK VISUALISASI PER TOPIK:
${isMat ? `1. DATA DAN PELUANG:
   - WAJIB menyajikan stimulus data memakai FORMAT TEMPLATE {"tipe": "diagram", "archetype": "diagram_batang", ...} atau {"tipe": "diagram", "archetype": "diagram_lingkaran", ...} sesuai skema yang sudah dijelaskan di atas (DILARANG hanya tabel teks biasa, dan DILARANG menghitung sendiri koordinat batang/juringnya lewat svg_content bebas).
2. GEOMETRI DAN PENGUKURAN:
   - WAJIB menyertakan DIAGRAM BIDANG / BANGUN RUANG / DENAH SVG bebas (misalnya denah taman, irisan bangun, segitiga siku-siku Pythagoras, jaring-jaring bangun, bangun gabungan) lengkap dengan label dimensi (panjang, lebar, jari-jari, sudut) yang proporsional dan jelas.
3. BILANGAN DAN PECAHAN:
   ${isSd ? `- Pada soal pecahan, WAJIB menyertakan FORMAT TEMPLATE {"tipe": "diagram", "archetype": "model_pecahan", ...} (bentuk lingkaran kue/pizza atau persegi panjang berarsir) agar siswa SD dapat mengamati konsep pecahan secara visual konkret dan proporsi arsirannya presisi.
   - Pada operasi hitung atau urutan bilangan bertanda, sertakan FORMAT TEMPLATE {"tipe": "diagram", "archetype": "garis_bilangan", ...} dengan titik-titik nilai.` : `- Pada perbandingan, rasio, atau operasi bertanda, sertakan FORMAT TEMPLATE {"tipe": "diagram", "archetype": "garis_bilangan", ...} atau {"tipe": "diagram", "archetype": "diagram_batang", ...} untuk rasio.`}` : `1. WACANA INFORMASI & DATA:
   - Pada butir soal berbasis wacana informasi/fakta yang memuat proporsi/persentase, gunakan FORMAT TEMPLATE {"tipe": "diagram", "archetype": "diagram_lingkaran", ...}; untuk kartu infografik ringkas lain gunakan svg_content bebas (kotak kartu dengan ikon SVG sederhana, sorotan angka fakta).
2. TEKS PETUNJUK / PROSEDUR:
   - Sertakan DIAGRAM ALUR / BAGAN LANGKAH KERJA SVG bebas yang menarik dan mudah dipahami siswa.`}

STANDAR TEKNIS KUALITAS SVG:
- Gunakan viewBox="0 0 480 260" dengan lebar responsive width="100%".
- Padukan warna modern dan ramah mata (indigo #4f46e5, emerald #059669, amber #d97706, slate #475569, background halus #f8fafc).
- Gunakan font-family="system-ui, sans-serif" dengan font-size minimal 12-14 agar teks angka dan label terbaca tajam di layar handphone dan komputer siswa.
- DILARANG KERAS mengembalikan status placeholder "perlu_ilustrasi". Seluruh visualisasi wajib berupa kode SVG mandiri yang valid dan langsung render!
- Seluruh elemen (bentuk maupun teks) WAJIB berada penuh di dalam batas viewBox, tidak ada yang terpotong di tepi kanvas. Beri jarak antar-label agar tidak saling tumpang tindih. Gunakan text-anchor="middle" untuk label yang mengacu ke tengah sebuah objek/sumbu. Pastikan setiap tag <g>/<text>/<tspan> yang dibuka selalu ditutup, dan svg_content tidak boleh terpotong sebelum tag "</svg>" akhir.`;
}

// SYSTEM PROMPT UNTUK PERBAIKAN SATU BUTIR SOAL BERDASARKAN CATATAN VALIDATOR
const AI_REVISION_SYSTEM_PROMPT = `Anda adalah editor soal Tes Kemampuan Akademik (TKA) profesional untuk Kementerian Pendidikan Dasar dan Menengah RI. Tugas Anda: merevisi SATU butir soal yang sudah ada berdasarkan catatan perbaikan spesifik dari validator penelaah, TANPA mengubah hal-hal di luar yang diminta.

ATURAN WAJIB:
1. Perbaiki HANYA sesuai catatan validator yang diberikan. Jangan mengubah bentuk soal, jenis soal, atau taksonomi elemen/kompetensi kecuali validator secara eksplisit memintanya.
2. Jika catatan meminta redaksi ulang pertanyaan, opsi, atau pembahasan, tulis ulang secara utuh dan konsisten — jangan setengah-setengah atau menyisakan bagian lama yang kontradiktif dengan bagian baru.
3. Jika catatan menyebutkan hasil perhitungan tidak bulat/tidak rapi, PILIH SALAH SATU: sesuaikan angka pada soal, ATAU ubah redaksi pertanyaan (misalnya menjadi "tambahan/kekurangan minimal") agar tetap valid secara matematis dan kunci jawabannya benar-benar cocok dengan salah satu opsi yang ada (jangan menghasilkan kunci yang tidak ada di daftar opsi).
4. Field "pembahasan" WAJIB diuraikan bertingkat ke bawah per baris memakai karakter newline (\\n) untuk tiap langkah (contoh: "Diketahui: ...\\nLangkah 1: ...\\nLangkah 2: ...\\nSimpulan: ..."), jelas dan langsung ke inti. DILARANG memakai gaya bahasa yang terasa seperti keluaran AI generik (hindari frasa seperti "Tentu, berikut adalah...", "Sebagai AI...", "Baik, saya akan...", dsb) — tulis sebagaimana pendidik manusia menulis kunci pembahasan.
5. Notasi matematika memakai LaTeX inline $...$ atau display $$...$$; di dalam JSON, escape backslash ganda (\\\\frac, \\\\times, \\\\sqrt, dst).
6. Field "gambar": jika catatan validator TIDAK menyinggung ilustrasi/diagram sama sekali, kembalikan "gambar": null (sistem akan otomatis mempertahankan ilustrasi asli). Jika catatan validator secara eksplisit meminta perbaikan visual, sertakan revisi "gambar" mengikuti salah satu format: {"tipe": "svg", "svg_content": "<svg viewBox=\\"0 0 480 300\\" width=\\"100%\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>", "deskripsi_alt": "..."} untuk geometri/denah bebas, atau {"tipe": "diagram", "archetype": "diagram_batang"|"diagram_lingkaran"|"model_pecahan"|"garis_bilangan", "data": {...}, "deskripsi_alt": "..."} untuk diagram data/pecahan/garis bilangan (parameter data mengikuti skema masing-masing archetype).
7. Kembalikan HANYA array JSON valid berisi TEPAT SATU objek, tanpa markdown code fence dan tanpa teks penjelasan apa pun di luar JSON, dengan skema PERSIS:
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
}

/**
 * Core Engine Pembuatan Soal Otomatis Berbasis Google Gemini API
 */
export async function generateBatchQuestions(options: GenerateOptions): Promise<GenerationResult> {
  await ensureTablesCreated();
  const startedAt = new Date();
  const logId = `gen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

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
    dynamicContextBlock = `\n\nVARIASI MULTI-TEMA NUSANTARA (STANDAR TRYOUT NASIONAL AYOTKA.ID) — WAJIB DIPATUHI:
Paket soal ini dirancang khusus untuk simulasi Tryout Nasional skala nasional sehingga WAJIB memadukan berbagai tema dan sub-konteks nusantara agar kaya konteks dan berimbang lintas 30 butir soal (JANGAN memakai 1 tema saja untuk seluruh paket):
${pickedThemes.map((t, idx) => `Tema ${idx + 1} [${t.namaTema}]:\n  Contoh Sub-konteks: ${(t.subKonteks || []).join(", ")}`).join("\n")}

ATURAN DISTRIBUSI MULTI-TEMA:
- Distribusikan tema-tema di atas secara seimbang dan berotasi ke seluruh 30 butir soal (misal tiap tema mendapat 5-6 butir soal).
- Tiap grup stimulus dan butir soal mandiri harus menggunakan sub-konteks yang berbeda agar kontekstual, menarik, dan tidak monoton.
- Tema ini HANYA bungkus cerita/konteks — konten yang diuji tetap harus elemen dan kompetensi kurikulum ${jenjang} ${mapel}.
- Setiap soal wajib menyertakan field "tema_konteks": string (2-5 kata ringkasan spesifik konteks soal, misal 'atap Tongkonan Toraja', 'konservasi terumbu karang', 'bazar kerajinan tenun').`;

  } else if (options.selectedThemes && options.selectedThemes.length > 0) {
    // Pengguna memilih 1 atau lebih tema dari Pool Tema Konteks (29 Tema)
    if (options.selectedThemes.length === 1) {
      const st = options.selectedThemes[0];
      themeName = st.namaTema;
      subKonteksList = st.subKonteks && st.subKonteks.length > 0 ? st.subKonteks : [st.namaTema];
      dynamicContextBlock = `\n\nVARIASI KONTEKS — WAJIB DIPATUHI:
Tema konteks untuk batch soal ini adalah: ${themeName}.
Gunakan sub-konteks berikut secara bergantian dan bervariasi, jangan memakai sub-konteks yang sama lebih dari 4 kali dalam 30 soal ini:
${subKonteksList.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}
Anda boleh membuat variasi/pengembangan baru dari sub-konteks di atas, selama masih dalam tema ${themeName}.
Tema ini HANYA bungkus cerita/konteks — konten yang diuji tetap harus elemen dan kompetensi kurikulum ${jenjang} ${mapel}.
Sesuaikan kedalaman istilah dengan jenjang: untuk SD/MI gunakan istilah konkret sederhana, untuk SMP/MTs ke atas boleh analitis bertingkat.
Untuk tiap soal, sertakan field "tema_konteks": string (2-5 kata ringkasan spesifik konteks butir soal ini).`;
    } else {
      // Lebih dari 1 tema dipilih dari Pool
      themeName = options.selectedThemes.map((t) => t.namaTema).join(", ");
      dynamicContextBlock = `\n\nVARIASI MULTI-TEMA PILIHAN ADMIN (STANDAR TRYOUT NASIONAL AYOTKA.ID) — WAJIB DIPATUHI:
Paket soal ini dirancang dengan ${options.selectedThemes.length} tema pilihan dari Pool Tema Konteks yang WAJIB dipadukan secara seimbang ke dalam 30 butir soal:
${options.selectedThemes
  .map((t, idx) => `Tema ${idx + 1} [${t.namaTema}]:\n  Sub-konteks: ${(t.subKonteks || []).join(", ")}`)
  .join("\n")}

ATURAN DISTRIBUSI MULTI-TEMA:
- Distribusikan tema-tema pilihan di atas secara proporsional ke butir-butir soal.
- Tiap grup stimulus dan butir soal tunggal harus menggunakan sub-konteks yang berbeda agar kontekstual dan tidak monoton.
- Tema ini HANYA bungkus cerita/konteks — konten yang diuji tetap harus elemen dan kompetensi kurikulum ${jenjang} ${mapel}.
- Setiap butir soal wajib menyertakan field "tema_konteks": string (2-5 kata ringkasan konteks).`;
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

    dynamicContextBlock = `\n\nVARIASI KONTEKS — WAJIB DIPATUHI:
Tema konteks untuk batch soal ini adalah: ${themeName}.
Gunakan sub-konteks berikut secara bergantian, jangan memakai sub-konteks yang sama lebih dari 4 kali dalam 30 soal ini:
${subKonteksList.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}
Anda boleh membuat variasi/pengembangan baru dari sub-konteks di atas (bukan hanya mengulang persis), selama masih dalam tema ${themeName}.

Tema ini HANYA bungkus cerita/konteks — konten yang diuji tetap harus elemen dan kompetensi kurikulum sesuai kisi-kisi (jangan sampai soal berubah jadi menguji pengetahuan tentang tema itu sendiri, bukan menguji Matematika/Bahasa). Sesuaikan kedalaman istilah dengan jenjang: untuk SD/MI gunakan istilah sederhana dan situasi konkret dari tema ini, sementara untuk SMP/MTs dan SMA/MA boleh memakai istilah yang lebih teknis dan analitis dari tema ini selama tetap dipahami tanpa pengetahuan khusus di luar konteks yang diberikan dalam soal.

Untuk tiap soal, sertakan juga field "tema_konteks": string (2-5 kata, ringkasan spesifik konteks soal ini).`;
  }

  // Lapis 1: Dynamic Negative Memory (Sliding Window 90 butir soal terakhir dari DB)
  const recentMemory = await fetchRecentQuestionsMemory(jenjang, mapel, 90);

  // Lapis 2 & 3: Penetapan Deterministik Arketipe & Matriks Kombinatorika Dinamis
  const deterministicSlotPlans = generateDeterministicSlotPlan(
    totalDiminta,
    jenjang,
    mapel,
    options.selectedElements
  );
  const archetypePromptBlock = formatArchetypeGuidancePrompt(
    deterministicSlotPlans,
    jenjang,
    mapel
  );

  const isStrictSvg = typeof options.strictSvgMode === "boolean" ? options.strictSvgMode : !!storedConfig.strictSvgMode;
  const strictSvgBlock = isStrictSvg ? getStrictSvgPromptInstructions(jenjang, mapel) : "";

  const activeSystemPrompt = `${BSKAP_SYSTEM_PROMPT}${dynamicContextBlock}${strictSvgBlock}${recentMemory.promptBlock}`;

  // Prompt Pengguna Target Distribusi
  let userPrompt = `Hasilkan tepat ${totalDiminta} butir soal TKA berkualitas tinggi dengan distribusi bentuk soal sekitar ${distB.PG} PG, ${distB.PGK_MCMA} PGK_MCMA, ${distB.PGK_KATEGORI} PGK_KATEGORI, dan distribusi tingkat kesulitan sekitar ${distK.rendah} rendah, ${distK.sedang} sedang, ${distK.tinggi} tinggi untuk jenjang ${jenjang} dan mata pelajaran ${mapel}.

Wajib menuntut penalaran bertingkat (multi-step HOTS), menggunakan konteks nyata Indonesia, menyertakan data tabel Markdown untuk stimulus grup, dan memastikan butir soal grup 100% mengacu pada stimulus.
${curriculumGuidance}
${archetypePromptBlock}`;

  if (isStrictSvg) {
    userPrompt += `\n\nCATATAN KHUSUS VISUALISASI SVG: Mode Visualisasi SVG Ketat sedang aktif. Pastikan minimal 6-10 butir soal (khususnya data/diagram, geometri/denah, dan model pecahan arsiran) menyertakan kode SVG mandiri yang lengkap dan valid pada field "gambar".`;
  }

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

      await db.insert(generationLogs).values({
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

    try {
      if (totalDiminta <= 15) {
        // Batch kecil (<= 15 butir): panggil sekali secara langsung
        const res = await callGeminiResilient({
          apiKey,
          preferredModel: modelName,
          systemInstruction: activeSystemPrompt,
          userPrompt,
          temperature,
        });
        parsedArray = parseGeminiJson(res.rawText);
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

Wajib penalaran bertingkat (multi-step HOTS), konteks nyata, tabel Markdown untuk stimulus grup, dan kohesi penuh.
${curriculumGuidance}
${formatArchetypeGuidancePrompt(deterministicSlotPlans.slice(0, chunk1Count), jenjang, mapel)}`;
        let p2 = `Hasilkan tepat ${chunk2Count} butir soal TKA berkualitas tinggi (bagian 2 dari 2) dengan distribusi bentuk soal sekitar ${distB2.PG} PG, ${distB2.PGK_MCMA} PGK_MCMA, ${distB2.PGK_KATEGORI} PGK_KATEGORI, dan distribusi tingkat kesulitan sekitar ${distK2.rendah} rendah, ${distK2.sedang} sedang, ${distK2.tinggi} tinggi untuk jenjang ${jenjang} dan mata pelajaran ${mapel}.

Wajib penalaran bertingkat (multi-step HOTS), konteks nyata, tabel Markdown untuk stimulus grup, dan kohesi penuh.
${curriculumGuidance}
${formatArchetypeGuidancePrompt(deterministicSlotPlans.slice(chunk1Count), jenjang, mapel)}`;

        if (elementRestrictionPrompt) {
          p1 += elementRestrictionPrompt;
          p2 += elementRestrictionPrompt;
        }

        if (options.customInstruction && options.customInstruction.trim()) {
          p1 += `\n\nFokus/Instruksi konteks tambahan: ${options.customInstruction.trim()}`;
          p2 += `\n\nFokus/Instruksi konteks tambahan: ${options.customInstruction.trim()}`;
        }

        const res1 = await callGeminiResilient({
          apiKey,
          preferredModel: modelName,
          systemInstruction: activeSystemPrompt,
          userPrompt: p1,
          temperature,
        });

        const res2 = await callGeminiResilient({
          apiKey,
          preferredModel: modelName,
          systemInstruction: activeSystemPrompt,
          userPrompt: p2,
          temperature,
        });

        const arr1 = parseGeminiJson(res1.rawText);
        const arr2 = parseGeminiJson(res2.rawText);

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

      await db.insert(generationLogs).values({
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

  for (const stim of stimulusObjects) {
    const tempId = stim.stimulus_id_sementara;
    const content = stim.konten || "";

    // Pemeriksaan BSKAP (Hanya Bahasa Indonesia/Inggris, Matematika dilewati total)
    const valResult = validateLanguageTextComplexity({
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
        q.gambar = { tipe: "svg", svg_content: diagramResult.svg, deskripsi_alt: q.gambar.deskripsi_alt || "" };
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

    let retryUserPrompt = `PERHATIAN REGENERASI BSKAP: Pada pengiriman sebelumnya, terdapat butir/stimulus yang DITOLAK gerbang kualitas karena melanggar ketentuan resmi.
Hasilkan tepat ${missingCount} butir soal pengganti berkualitas tinggi untuk jenjang ${jenjang} dan mata pelajaran ${mapel}.

${isLanguageSubject(mapel) ? `WAJIB DIPATUHI SECARA KETAT SESUAI PERKABAN BSKAP:
- Jika menyertakan stimulus teks wacana baru, panjang teks WAJIB tepat dalam rentang resmi jenjang ${jenjang}.
- Rata-rata kata per kalimat WAJIB dalam rentang resmi jenjang ${jenjang}.
- DILARANG melebihi atau mengurangi batas tersebut. Teks yang tidak memenuhi batas akan langsung ditolak sistem.` : ''}

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
      const content = stim.konten || "";

      const valResult = validateLanguageTextComplexity({
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
          q.gambar = { tipe: "svg", svg_content: diagramResult.svg, deskripsi_alt: q.gambar.deskripsi_alt || "" };
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

    await db.insert(generationLogs).values({
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

  // 7. Hitung Sequence dan Buat Paket Baru AI (A01-..., A02-...) secara andal tanpa tabrakan kode
  const prefix = "A";
  const jenjangCode = jenjang.split("/")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const mapelCode = mapel.toLowerCase().includes("matematika") ? "MAT" : "BIN";

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
  const { code: packageCode, nama: packageNama } = generatePackageCode(
    "ai",
    sequenceNumber,
    jenjang,
    mapel
  );

  const packageId = `pkg-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Hitung distribusi bentuk & kesulitan AKTUAL dari soal yang benar-benar tersimpan
  const actualDistBentuk: Record<string, number> = {};
  const actualDistKesulitan: Record<string, number> = {};

  validQuestions.forEach((vq) => {
    actualDistBentuk[vq.bentuk_soal] = (actualDistBentuk[vq.bentuk_soal] || 0) + 1;
    actualDistKesulitan[vq.tingkat_kesulitan] = (actualDistKesulitan[vq.tingkat_kesulitan] || 0) + 1;
  });

  const packageStatus = validQuestions.length === totalDiminta ? "dalam_validasi" : "draft";

  await db.insert(questionPackages).values({
    id: packageId,
    code: packageCode,
    nama: packageNama,
    jenjang: jenjang as any,
    mapel,
    tipeSumber: "ai",
    authorId: adminId || "usr-admin-001",
    jumlahSoal: totalDiminta,
    distribusiBentukSoal: actualDistBentuk,
    distribusiKesulitan: actualDistKesulitan,
    status: packageStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 8. Simpan Seluruh Butir Soal Valid ke Database
  for (let i = 0; i < validQuestions.length; i++) {
    const vq = validQuestions[i];
    const slotNumber = i + 1;
    const itemCode = `${packageCode}-${slotNumber.toString().padStart(2, "0")}`;
    const questionId = `soal-ai-${Date.now()}-${slotNumber}-${Math.random().toString(36).substring(2, 6)}`;

    const checkSim = checkQuestionSimilarity(vq.soal_text, recentMemory.rawStems, 60);
    const assignedArchetype = deterministicSlotPlans[i]?.archetype?.nama || null;

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
      elemen: (options.elementMode === "selective" && options.selectedElements && options.selectedElements.length > 0 && !options.selectedElements.includes(vq.elemen))
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

  // 9. Catat Log Audit & Log Generasi
  const overallStatus = validQuestions.length === totalDiminta ? "berhasil" : "sebagian";
  const completedAt = new Date();

  await db.insert(generationLogs).values({
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
    detailPemeriksaan: [...failedItems, ...themeWarnings, ...similarityLogs, ...textComplexityLogs],
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
  };
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

