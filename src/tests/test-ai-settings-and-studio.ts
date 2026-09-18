async function runSettingsAndStudioTests() {
  console.log("=== PENGUJIAN FITUR PENGATURAN API AI & STUDIO GENERATOR FLEKSIBEL ===\n");

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

  // 1. Login sebagai Admin
  console.log("--- 1. Autentikasi Admin ---");
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ayotka.id", password: "admin123" }),
  });

  assert(loginRes.ok, "Login Admin berhasil (HTTP 200)");
  const setCookie = loginRes.headers.get("set-cookie") || "";
  const authCookie = setCookie.split(";")[0];
  assert(Boolean(authCookie), "Cookie sesi Admin diperoleh");

  // 2. Uji GET /api/admin/settings/ai
  console.log("\n--- 2. Uji Endpoint GET /api/admin/settings/ai ---");
  const getSettingsRes = await fetch(`${baseUrl}/api/admin/settings/ai`, {
    headers: { Cookie: authCookie },
  });
  assert(getSettingsRes.ok, "GET /api/admin/settings/ai dapat diakses (HTTP 200)");
  const settingsData = await getSettingsRes.json();
  assert(settingsData.success, "Respon setting AI berstatus sukses");
  assert("hasKey" in settingsData.data, "Payload memuat indikator hasKey");

  // 3. Uji POST /api/admin/settings/ai (Simpan Konfigurasi Baru)
  console.log("\n--- 3. Uji POST /api/admin/settings/ai (Simpan Pengaturan) ---");
  const testKey = "AIzaSyTestAdminKey1234567890abcdef";
  const postSettingsRes = await fetch(`${baseUrl}/api/admin/settings/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      apiKey: testKey,
      modelName: "gemini-2.0-flash",
      temperature: 0.8,
      customPromptPrefix: "Standar TKA BSKAP 2025",
    }),
  });

  assert(postSettingsRes.ok, "POST /api/admin/settings/ai berhasil (HTTP 200)");
  const postSettingsData = await postSettingsRes.json();
  assert(postSettingsData.success, "Penyimpanan konfigurasi AI sukses");

  // 4. Uji Verifikasi Masking API Key
  console.log("\n--- 4. Uji Verifikasi Masking API Key di Server ---");
  const reGetSettingsRes = await fetch(`${baseUrl}/api/admin/settings/ai`, {
    headers: { Cookie: authCookie },
  });
  const reGetSettingsData = await reGetSettingsRes.json();
  assert(reGetSettingsData.data.hasKey === true, "Indikator hasKey bernilai TRUE setelah disimpan");
  assert(
    reGetSettingsData.data.apiKeyMasked.includes("••••••••"),
    `Kunci API disamarkan (Masked: ${reGetSettingsData.data.apiKeyMasked})`
  );
  assert(
    !reGetSettingsData.data.apiKeyMasked.includes("1234567890"),
    "Kunci API asli TIDAK bocor secara telanjang di respon GET"
  );
  assert(
    reGetSettingsData.data.modelName === "gemini-2.0-flash",
    "Model yang tersimpan adalah gemini-2.0-flash"
  );
  assert(
    reGetSettingsData.data.temperature === 0.8,
    "Temperature yang tersimpan adalah 0.8"
  );

  // 5. Uji Endpoint Test Koneksi API
  console.log("\n--- 5. Uji Endpoint POST /api/admin/settings/ai/test ---");
  const testConnRes = await fetch(`${baseUrl}/api/admin/settings/ai/test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      apiKey: "AIzaSyFakeKeyForTestPingOnly",
      modelName: "gemini-2.0-flash",
    }),
  });

  assert(testConnRes.ok, "Endpoint test koneksi dapat dipanggil (HTTP 200)");
  const testConnData = await testConnRes.json();
  assert("success" in testConnData, "Response test koneksi memiliki status terstruktur");
  assert(
    typeof testConnData.data?.message === "string",
    `Pesan pengujian informatif diterima: "${testConnData.data?.message}"`
  );

  // 6. Uji Studio Generator Fleksibel (Jumlah Kustom & Instruksi Tambahan)
  console.log("\n--- 6. Uji Studio Generator Fleksibel dengan Parameter Kustom ---");
  const studioTriggerRes = await fetch(`${baseUrl}/api/admin/generator/trigger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      jenjang: "SMP/MTs",
      mapel: "Bahasa Indonesia",
      totalSoal: 10,
      distribusiBentuk: { PG: 5, PGK_MCMA: 3, PGK_KATEGORI: 2 },
      distribusiKesulitan: { rendah: 3, sedang: 5, tinggi: 2 },
      customInstruction: "Fokuskan pada analisis teks laporan observasi ilmiah dan kearifan lokal.",
      forceMock: true,
    }),
  });

  assert(studioTriggerRes.ok, "Trigger generator fleksibel berhasil (HTTP 200)");
  const studioData = await studioTriggerRes.json();
  assert(studioData.success, "Response generator berstatus sukses");
  assert(
    studioData.data?.packageCode?.startsWith("A"),
    `Paket AI kustom dibuat: ${studioData.data?.packageCode}`
  );
  assert(
    studioData.data?.totalLolos === 10,
    `Tepat 10 butir lolos gerbang pemeriksaan (Lolos: ${studioData.data?.totalLolos})`
  );

  // 7. Verifikasi Log Terbaru Mencatat Total Diminta = 10
  console.log("\n--- 7. Verifikasi Riwayat Log Setelah Eksekusi Studio ---");
  const logsRes = await fetch(`${baseUrl}/api/admin/generator/logs`, {
    headers: { Cookie: authCookie },
  });
  const logsData = await logsRes.json();
  const latestLog = logsData.data?.find(
    (l: any) => l.packageCode === studioData.data?.packageCode
  );

  assert(Boolean(latestLog), "Log eksekusi studio tercatat di database");
  assert(latestLog?.totalDiminta === 10, "Log mencatat total diminta = 10 butir");
  assert(latestLog?.jenjang === "SMP/MTs", "Log mencatat jenjang SMP/MTs");
  assert(latestLog?.mapel === "Bahasa Indonesia", "Log mencatat mapel Bahasa Indonesia");

  console.log(`\n========================================`);
  console.log(`HASIL PENGUJIAN: ${passed} LULUS, ${failed} GAGAL`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSettingsAndStudioTests().catch((err) => {
  console.error("Gagal menjalankan pengujian:", err);
  process.exit(1);
});
