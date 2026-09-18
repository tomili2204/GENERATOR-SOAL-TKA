import { BSKAP_SYSTEM_PROMPT } from "../lib/generator/gemini-generator";

async function runHttpTests() {
  console.log("=== PENGUJIAN INTEGRASI HTTP AI GENERATOR SOAL TKA ===\n");

  const baseUrl = "http://localhost:3000";
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
    "System prompt memiliki deklarasi peran Kemendikdasmen RI"
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

  // 2. Login sebagai Admin untuk Mendapatkan Sesi Cookie
  console.log("\n--- 2. Autentikasi Admin ---");
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ayotka.id", password: "admin123" }),
  });

  assert(loginRes.ok, "Login Admin berhasil (HTTP 200)");
  const setCookie = loginRes.headers.get("set-cookie") || "";
  const authCookie = setCookie.split(";")[0];
  assert(Boolean(authCookie), "Mendapatkan sesi cookie autentikasi admin");

  // 3. Uji Endpoint GET /api/admin/generator/logs
  console.log("\n--- 3. Uji Endpoint GET /api/admin/generator/logs ---");
  const logsRes = await fetch(`${baseUrl}/api/admin/generator/logs`, {
    headers: { Cookie: authCookie },
  });
  console.log("logsRes status:", logsRes.status);
  const logsText = await logsRes.text();
  console.log("logsRes body:", logsText);
  let logsData: any = {};
  try { logsData = JSON.parse(logsText); } catch {}
  assert(logsRes.ok, "Endpoint GET logs berhasil diakses oleh Admin");
  assert(logsData.success === true && Array.isArray(logsData.data), "Format log JSON valid dan berbentuk array");

  // 4. Uji Trigger Tanpa API Key (Deteksi Kegagalan Total Tanpa Paket Kosong)
  console.log("\n--- 4. Uji Penanganan Kegagalan Total (Ketiadaan GEMINI_API_KEY) ---");
  const failTriggerRes = await fetch(`${baseUrl}/api/admin/generator/trigger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      jenjang: "SD/MI",
      mapel: "Matematika",
      forceMock: false, // Mencoba panggil real API tanpa key
    }),
  });

  const failData = await failTriggerRes.json();
  assert(!failData.success, "Eksekusi ditolak secara elegan saat API key tidak ada");
  assert(failData.data?.status === "gagal", "Status proses tercatat sebagai 'gagal'");
  assert(!failData.data?.packageCode, "TIDAK membuat kode paket (mencegah paket kosong palsu)");
  assert(
    Boolean(
      failData.data?.errorMessage?.includes("GEMINI_API_KEY belum dikonfigurasi") ||
      failData.data?.errorMessage?.includes("API key not valid") ||
      failData.data?.errorMessage?.includes("Kegagalan pemanggilan model Gemini API")
    ),
    "Pesan error informatif tercatat pada log: " + failData.data?.errorMessage
  );

  // 5. Uji Trigger Generator Sukses dengan Mock Generator (30 Butir & Gerbang Sanitasi)
  console.log("\n--- 5. Uji Gerbang Sanitasi & Pembuatan Paket Soal AI ---");
  const successTriggerRes = await fetch(`${baseUrl}/api/admin/generator/trigger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      jenjang: "SD/MI",
      mapel: "Matematika",
      forceMock: true,
    }),
  });

  assert(successTriggerRes.ok, "Trigger generator mock berhasil (HTTP 200)");
  const successData = await successTriggerRes.json();
  assert(successData.success, "Response generator berstatus sukses");
  assert(
    successData.data?.packageCode?.startsWith("A"),
    `Paket berawalan 'A' berhasil dibuat: ${successData.data?.packageCode}`
  );
  assert(
    successData.data?.totalLolos === 30,
    `Tepat 30 butir lolos gerbang pemeriksaan (Lolos: ${successData.data?.totalLolos})`
  );

  // 6. Uji Endpoint Cron /api/cron/generate
  console.log("\n--- 6. Uji Endpoint Scheduled Cron /api/cron/generate ---");
  const cronRes = await fetch(`${baseUrl}/api/cron/generate`);
  assert(cronRes.ok, "Endpoint cron generate dapat dipanggil oleh sistem");
  const cronData = await cronRes.json();
  assert(cronData.success === true, "Cron job mengembalikan respon sukses");

  // 7. Verifikasi Log Terbaru  // 7. Verifikasi Riwayat Log Setelah Generate
  console.log("\n--- 7. Verifikasi Riwayat Log Setelah Generate ---");
  const updatedLogsRes = await fetch(`${baseUrl}/api/admin/generator/logs`, {
    headers: { Cookie: authCookie },
  });
  const updatedLogsData = await updatedLogsRes.json();
  const successfulLog = updatedLogsData.data?.find(
    (l: any) => l.packageCode === successData.data?.packageCode
  );
  assert(
    Boolean(successfulLog && successfulLog.status === "berhasil"),
    "Log generate AI sukses tercatat dengan status 'berhasil'"
  );
  assert(
    successfulLog?.totalLolos === 30,
    `Log mencatat 30 butir lolos untuk paket ${successfulLog?.packageCode}`
  );

  console.log(`\n========================================`);
  console.log(`HASIL AKHIR INTEGRASI: ${passed} LULUS, ${failed} GAGAL`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runHttpTests().catch((err) => {
  console.error("Gagal menjalankan pengujian HTTP:", err);
  process.exit(1);
});
