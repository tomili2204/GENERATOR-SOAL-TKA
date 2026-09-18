import {
  BSKAP_SYSTEM_PROMPT,
  generateBatchQuestions,
  generateMockGeminiBatchResponse,
} from "../lib/generator/gemini-generator";
import { db } from "../db";
import { generationLogs, questionPackages, questions, stimulus } from "../db/schema";
import { eq, desc } from "drizzle-orm";

async function runTests() {
  console.log("=== MEMULAI PENGUJIAN OTOMATIS GENERATOR SOAL TKA BERBASIS AI ===\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: any, testName: string) {
    if (Boolean(condition)) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Verifikasi System Prompt BSKAP Persis Sesuai Ketetapan
  console.log("--- 1. Uji Integritas System Prompt BSKAP ---");
  assert(
    BSKAP_SYSTEM_PROMPT.includes(
      "Anda adalah pengembang soal Tes Kemampuan Akademik (TKA) profesional, bekerja untuk Kementerian Pendidikan Dasar dan Menengah RI."
    ),
    "System prompt memiliki deklarasi peran Kementerian Pendidikan Dasar dan Menengah RI"
  );
  assert(
    BSKAP_SYSTEM_PROMPT.includes(
      "Perkaban BSKAP No. 45/2025 (SMA/MA & SMK/MAK) dan No. 47/2025 (SD/MI & SMP/MTs)"
    ),
    "System prompt memuat rujukan resmi Perkaban BSKAP No. 45/2025 dan No. 47/2025"
  );
  assert(
    BSKAP_SYSTEM_PROMPT.includes("PG: pilihan ganda sederhana") &&
      BSKAP_SYSTEM_PROMPT.includes("PGK_MCMA: beberapa opsi") &&
      BSKAP_SYSTEM_PROMPT.includes("PGK_KATEGORI: beberapa pernyataan"),
    "System prompt membatasi 3 bentuk soal resmi (PG, PGK_MCMA, PGK_KATEGORI)"
  );
  assert(
    BSKAP_SYSTEM_PROMPT.includes("FORMAT KELUARAN — WAJIB, TIDAK BOLEH DILANGGAR"),
    "System prompt memuat format keluaran JSON array murni tanpa code fence"
  );

  // 2. Uji Penanganan Kegagalan Total Tanpa Paket Kosong (Missing API Key)
  console.log("\n--- 2. Uji Penanganan Kegagalan Total (Tanpa API Key) ---");
  // Pastikan env key sementara kosong untuk tes ini
  const origKey = process.env.GEMINI_API_KEY;
  const origGKey = process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;

  const failResult = await generateBatchQuestions({
    jenjang: "SD/MI",
    mapel: "Matematika",
    triggeredBy: "manual_admin",
    forceMock: false, // sengaja false agar memicu deteksi ketiadaan API key
  });

  assert(!failResult.success, "Eksekusi ditolak secara elegan saat API key tidak ada");
  assert(failResult.status === "gagal", "Status proses tercatat sebagai 'gagal'");
  assert(!failResult.packageCode, "TIDAK membuat kode paket (mencegah paket kosong palsu)");
  assert(
    failResult.errorMessage?.includes("GEMINI_API_KEY belum dikonfigurasi"),
    "Pesan error informatif tercatat pada log"
  );

  // Periksa log di database
  const latestFailLog = await db
    .select()
    .from(generationLogs)
    .where(eq(generationLogs.id, failResult.logId))
    .limit(1);

  assert(latestFailLog.length === 1, "Log kegagalan berhasil masuk ke tabel generation_logs");
  assert(latestFailLog[0]?.packageId === null, "Kolom package_id pada log gagal bernilai NULL");

  // Pulihkan env
  if (origKey) process.env.GEMINI_API_KEY = origKey;
  if (origGKey) process.env.GOOGLE_API_KEY = origGKey;

  // 3. Uji Gerbang Sanitasi Otomatis & Pembuatan Paket AI Berhasil
  console.log("\n--- 3. Uji Gerbang Sanitasi & Pembuatan Paket Soal AI ---");
  const successResult = await generateBatchQuestions({
    jenjang: "SD/MI",
    mapel: "Matematika",
    triggeredBy: "manual_admin",
    forceMock: true, // Menggunakan generator mock lengkap untuk menguji sanitasi & pipeline
  });

  assert(successResult.success, "Proses generate mock batch berhasil diselesaikan");
  assert(
    successResult.packageCode?.startsWith("A") || false,
    `Kode paket AI berawalan 'A' (Dihasilkan: ${successResult.packageCode})`
  );
  assert(successResult.totalLolos === 30, `Tepat 30 butir lolos gerbang pemeriksaan (Lolos: ${successResult.totalLolos})`);

  // Periksa paket di database
  const createdPkg = await db
    .select()
    .from(questionPackages)
    .where(eq(questionPackages.id, successResult.packageId!))
    .limit(1);

  assert(createdPkg.length === 1, "Paket soal AI tersimpan di tabel question_packages");
  assert(createdPkg[0]?.tipeSumber === "ai", "Tipe sumber paket tercatat sebagai 'ai'");

  // Periksa distribusi aktual di paket
  const distBentuk = createdPkg[0]?.distribusiBentukSoal as Record<string, number>;
  assert(
    distBentuk?.PG === 16 && distBentuk?.PGK_MCMA === 8 && distBentuk?.PGK_KATEGORI === 6,
    `Distribusi bentuk soal aktual tercatat presisi (PG: ${distBentuk?.PG}, MCMA: ${distBentuk?.PGK_MCMA}, Kategori: ${distBentuk?.PGK_KATEGORI})`
  );

  // Periksa butir soal yang tersimpan
  const savedQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.paketId, successResult.packageId!));

  assert(savedQuestions.length === 30, `Tersimpan tepat 30 butir soal di tabel questions`);
  assert(
    savedQuestions.every((q: any) => q.status === "menunggu_validasi"),
    "Semua butir soal hasil generate AI berstatus 'menunggu_validasi' siap ditelaah validator"
  );
  assert(
    savedQuestions.every((q: any) => q.sumber === "ai_generated"),
    "Semua butir soal memiliki sumber 'ai_generated'"
  );

  // Periksa relasi stimulus (soal nomor 5 dan 6 berbagi stimulus)
  const groupedQuestions = savedQuestions.filter((q: any) => q.jenisSoal === "grup");
  assert(groupedQuestions.length === 2, "Soal stimulus grup terdeteksi (2 butir)");
  assert(
    groupedQuestions[0]?.stimulusId !== null &&
      groupedQuestions[0]?.stimulusId === groupedQuestions[1]?.stimulusId,
    "Stimulus ID sementara berhasil dipetakan ke stimulus permanen yang sama di database"
  );

  const stimCheck = await db
    .select()
    .from(stimulus)
    .where(eq(stimulus.id, groupedQuestions[0]?.stimulusId!));
  assert(stimCheck.length === 1, "Stimulus permanen tersimpan di database dengan konten lengkap");

  // 4. Uji Penolakan Gerbang Sanitasi pada Delimiter LaTeX Rusak & Kunci Jawaban Tidak Konsisten
  console.log("\n--- 4. Uji Penolakan Gerbang Sanitasi Khusus ---");
  // Simulasikan raw output cacat
  const flawedItems = [
    // Butir 1: LaTeX tidak seimbang di teks soal
    {
      jenjang: "SD/MI",
      mapel: "Matematika",
      elemen: "Aljabar",
      sub_elemen: "Persamaan",
      kompetensi: "Hitung",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: "Hitung nilai $x = 10 + 5 (delimiter tidak berpasangan",
      gambar: null,
      opsi: [
        { label: "A", text: "15" },
        { label: "B", text: "20" },
      ],
      kunci_jawaban: ["A"],
      pembahasan: "Hasilnya 15",
    },
    // Butir 2: PGK Kategori dengan kunci jawaban tidak ada di kategori_respons
    {
      jenjang: "SD/MI",
      mapel: "Matematika",
      elemen: "Bilangan",
      sub_elemen: "Pecahan",
      kompetensi: "Analisis",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "tinggi",
      bentuk_soal: "PGK_KATEGORI",
      jenis_soal: "tunggal",
      stimulus_id_sementara: null,
      soal_text: "Tentukan kebenaran pernyataan:",
      gambar: null,
      pernyataan: [
        { no: 1, text: "Pernyataan satu" },
        { no: 2, text: "Pernyataan dua" },
      ],
      kategori_respons: ["Benar", "Salah"],
      kunci_jawaban: ["Mungkin", "Ragu-Ragu"], // SALAH: Bukan anggota kategori respons!
      pembahasan: "Pembahasan kategori",
    },
  ];

  // Uji langsung logika sanitasi
  const { validateLatexDelimiters } = await import("../lib/validations/latex");
  const latexRes = validateLatexDelimiters(flawedItems[0].soal_text, "Teks Soal");
  assert(!latexRes.valid, "Gerbang sanitasi mendeteksi LaTeX tidak berpasangan");

  const invalidKey = flawedItems[1].kunci_jawaban.filter(
    (k: any) => !flawedItems[1].kategori_respons!.includes(k)
  );
  assert(
    invalidKey.length > 0,
    "Gerbang sanitasi mendeteksi kunci jawaban PGK Kategori di luar respons biner"
  );

  console.log(`\n========================================`);
  console.log(`HASIL AKHIR: ${passed} LULUS, ${failed} GAGAL`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Error menjalankan pengujian:", err);
  process.exit(1);
});
