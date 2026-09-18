const BASE_URL = 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  const cookie = res.headers.get('set-cookie');
  return { email, cookie, user: data.user || data.data?.user };
}

async function main() {
  console.log("=== MEMULAI VERIFIKASI HTTP REVISI VARIASI KONTEKS ===");
  const admin = await login('admin@ayotka.id', 'admin123');
  console.log("Admin berhasil login.");

  // 1. Ambil daftar tema dari /api/admin/tema-pool
  const resThemes = await fetch(`${BASE_URL}/api/admin/tema-pool`, {
    headers: { Cookie: admin.cookie },
  });
  const themesJson = await resThemes.json();

  if (!themesJson.success) {
    console.error("Gagal memuat tema:", themesJson);
    process.exit(1);
  }

  const themes = themesJson.data;
  console.log(`\n[1] Total Tema di Pool: ${themes.length} tema`);

  if (themes.length === 24) {
    console.log("PASS: Tepat 24 tema di pool.");
  } else {
    console.error(`FAIL: Jumlah tema ${themes.length} (diharapkan 24).`);
    process.exit(1);
  }

  // 2. Periksa 4 Tema Khusus SMP ke atas
  const smpOnly = themes.filter(t => !t.jenjangCocok.includes('SD/MI'));
  console.log(`\n[2] Tema yang dibatasi khusus SMP/MTs ke atas (${smpOnly.length} tema):`);
  smpOnly.forEach(t => console.log(`   - ${t.namaTema}: [${t.jenjangCocok.join(', ')}]`));

  const expectedSmpOnly = [
    "Arsitektur Adat & Geometri Tradisional",
    "Teknologi Terapan & Infrastruktur Hijau",
    "Pangan Tradisional & Kimia/Biologi Lokal",
    "Ekonomi Kerakyatan & UMKM Lanjut",
  ];

  const matchedAll = expectedSmpOnly.every(name => smpOnly.some(t => t.namaTema === name));
  if (matchedAll && smpOnly.length === 4) {
    console.log("PASS: 4 tema khusus SMP/MTs ke atas terkonfigurasi dengan benar.");
  } else {
    console.error("FAIL: 4 tema khusus SMP/MTs ke atas tidak cocok persis.");
    process.exit(1);
  }

  // 3. Periksa 20 tema sisanya yang cocok semua jenjang
  const allJenjangThemes = themes.filter(t => t.jenjangCocok.includes('SD/MI'));
  console.log(`\n[3] Tema yang cocok untuk Semua Jenjang: ${allJenjangThemes.length} tema.`);
  if (allJenjangThemes.length === 20) {
    console.log("PASS: 20 tema mencakup semua jenjang (SD/MI, SMP/MTs, SMA/MA, SMK/MAK).");
  } else {
    console.error(`FAIL: Ditemukan ${allJenjangThemes.length} tema untuk semua jenjang (diharapkan 20).`);
    process.exit(1);
  }

  // 4. Jalankan Trigger Generator On-Demand untuk SD/MI (Mode Mock Cepat)
  console.log("\n[4] Menguji eksekusi generator on-demand untuk SD/MI (memastikan tema terpilih valid & lolos sanitasi)...");
  const triggerRes = await fetch(`${BASE_URL}/api/admin/generator/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: admin.cookie,
    },
    body: JSON.stringify({
      jenjang: "SD/MI",
      mapel: "Matematika",
      useMock: true,
      totalSoal: 30,
      distribusiBentuk: { PG: 16, PGK_MCMA: 8, PGK_KATEGORI: 6 },
      distribusiKesulitan: { rendah: 8, sedang: 14, tinggi: 8 },
    }),
  });

  const triggerJson = await triggerRes.json();
  console.log("Hasil generate:", triggerJson);

  if (!triggerJson.success) {
    console.error("FAIL: Generator gagal dieksekusi:", triggerJson);
    process.exit(1);
  }

  console.log(`PASS: Paket soal AI #${triggerJson.packageCode} berhasil terbentuk dengan ${triggerJson.totalLolos} butir lolos sanitasi.`);

  // 5. Periksa Log Eksekusi
  console.log("\n[5] Mengambil riwayat log generator...");
  const logsRes = await fetch(`${BASE_URL}/api/admin/generator/logs`, {
    headers: { Cookie: admin.cookie },
  });
  const logsJson = await logsRes.json();
  const latestLog = logsJson.data[0];

  console.log("Log generator terbaru:");
  console.log(`   - Waktu: ${latestLog.startedAt}`);
  console.log(`   - Kombinasi: ${latestLog.jenjang} - ${latestLog.mapel}`);
  console.log(`   - Tema Konteks: ${latestLog.temaKonteks}`);
  console.log(`   - Paket: ${latestLog.packageCode}`);
  console.log(`   - Sebaran Tema:`, latestLog.distribusiTema);

  if (latestLog.temaKonteks && expectedSmpOnly.includes(latestLog.temaKonteks)) {
    console.error(`FAIL: Tema ${latestLog.temaKonteks} khusus SMP ke atas tetapi dipakai untuk SD/MI!`);
    process.exit(1);
  } else if (latestLog.temaKonteks) {
    console.log(`PASS: Tema terpilih "${latestLog.temaKonteks}" valid untuk jenjang SD/MI dan tercatat di tabel log.`);
  }

  console.log("\n============================================================");
  console.log("      SELURUH REVISI VARIASI KONTEKS TERVERIFIKASI 100%!     ");
  console.log("============================================================");
}

main().catch((err) => {
  console.error("Verification failed with exception:", err);
  process.exit(1);
});
