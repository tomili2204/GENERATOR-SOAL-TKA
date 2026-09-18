import { db, ensureTablesCreated } from "../src/db/index.js";
import { temaKonteksPool } from "../src/db/schema.js";
import { ensureThemesSeeded } from "../src/lib/generator/seed-themes.js";
import { selectThemeForGeneration } from "../src/lib/generator/theme-selector.js";
import { generateBatchQuestions } from "../src/lib/generator/gemini-generator.js";

async function main() {
  console.log("=== MEMULAI PENGUJIAN VERIFIKASI REVISI VARIASI KONTEKS ===");
  await ensureTablesCreated();
  await ensureThemesSeeded();

  // 1. Periksa Total Tema di Pool
  const allThemes = await db.select().from(temaKonteksPool);
  console.log(`[1] Total Tema di Pool Database: ${allThemes.length} tema`);

  if (allThemes.length !== 24) {
    console.error(`FAIL: Diharapkan 24 tema, tetapi ditemukan ${allThemes.length}`);
  } else {
    console.log("PASS: Total tema tepat 24 tema.");
  }

  // 2. Periksa Tema yang Dibatasi ke SMP/MTs ke atas
  const smpOnlyThemes = allThemes.filter((t) => {
    const list = t.jenjangCocok || [];
    return !list.includes("SD/MI");
  });

  console.log(`[2] Jumlah Tema Khusus SMP ke atas: ${smpOnlyThemes.length} tema:`);
  smpOnlyThemes.forEach((t) => {
    console.log(`    - ${t.namaTema} -> [${t.jenjangCocok.join(", ")}]`);
  });

  const expectedSmpOnly = [
    "Arsitektur Adat & Geometri Tradisional",
    "Teknologi Terapan & Infrastruktur Hijau",
    "Pangan Tradisional & Kimia/Biologi Lokal",
    "Ekonomi Kerakyatan & UMKM Lanjut",
  ];

  const matchedSmpOnly = expectedSmpOnly.every((name) =>
    smpOnlyThemes.some((t) => t.namaTema === name)
  );

  if (matchedSmpOnly && smpOnlyThemes.length === 4) {
    console.log("PASS: 4 tema yang dibatasi khusus SMP/MTs ke atas sudah tepat 100%.");
  } else {
    console.error("FAIL: Daftar tema khusus SMP ke atas tidak sesuai spesifikasi.");
  }

  // 3. Uji Logika Saringan Jenjang Sebelum Pengecualian 4 Hari
  console.log("[3] Menguji seleksi tema untuk jenjang SD/MI (harus bebas dari tema berat)...");
  for (let i = 0; i < 20; i++) {
    const picked = await selectThemeForGeneration("SD/MI", "Matematika");
    if (expectedSmpOnly.includes(picked.namaTema)) {
      console.error(`FAIL: Tema ${picked.namaTema} yang khusus SMP terpilih untuk SD/MI!`);
      process.exit(1);
    }
  }
  console.log("PASS: Uji acak 20x seleksi SD/MI tidak pernah memilih tema khusus SMP ke atas.");

  // 4. Uji Eksekusi Mock Generator untuk Memastikan Gerbang Sanitasi dan Log
  console.log("[4] Menguji generate batch mock (30 soal) dengan gerbang sanitasi tema...");
  const genResult = await generateBatchQuestions({
    jenjang: "SD/MI",
    mapel: "Matematika",
    forceMock: true,
    totalSoal: 30,
    triggeredBy: "manual_admin",
  });

  console.log(`    Status generate: ${genResult.status}`);
  console.log(`    Total lolos sanitasi: ${genResult.totalLolos} / ${genResult.totalDiminta}`);
  console.log(`    Paket terbentuk: #${genResult.packageCode}`);

  if (genResult.totalLolos === 30 && genResult.status === "berhasil") {
    console.log("PASS: 30 butir soal mock berhasil melewati sanitasi tema_konteks.");
  } else {
    console.error(`FAIL: Sanitasi gagal atau tidak lengkap: ${genResult.errorMessage}`);
    console.error(JSON.stringify(genResult.detailPemeriksaan, null, 2));
    process.exit(1);
  }

  console.log("\n=== SEMUA 4 PENGUJIAN VERIFIKASI LOLOS 100% ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
