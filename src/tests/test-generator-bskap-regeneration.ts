import { generateBatchQuestions } from "../lib/generator/gemini-generator";
import { db } from "../db";
import { generationLogs, questionPackages, questions, stimulus } from "../db/schema";
import { eq } from "drizzle-orm";

async function runE2ETests() {
  console.log("=== PENGUJIAN E2E GENERATOR BSKAP & REGENERASI OTOMATIS ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Batch Bahasa Indonesia SMP/MTs (Standar BSKAP)
  // -------------------------------------------------------------
  console.log("\n--- Test 1: Generate Batch Bahasa Indonesia SMP/MTs (Mock Mode) ---");
  const binRes = await generateBatchQuestions({
    jenjang: "SMP/MTs",
    mapel: "Bahasa Indonesia",
    totalDiminta: 30,
    forceMock: true,
    triggeredBy: "cron",
  });

  assert(binRes.success, "Generasi Bahasa Indonesia SMP/MTs berhasil");
  assert(binRes.totalLolos === 30, `Total soal lolos tepat 30 butir (aktual: ${binRes.totalLolos})`);

  // Cek log di database
  const logRecords = await db
    .select()
    .from(generationLogs)
    .where(eq(generationLogs.id, binRes.logId))
    .limit(1);

  assert(logRecords.length > 0, "Catatan generation_logs tersimpan di DB");
  const details = logRecords[0].detailPemeriksaan as any[];
  const hasMetrikLog = details.some((d: any) =>
    typeof d.reason === "string" && d.reason.includes("[Metrik Wacana BSKAP - SMP/MTs]")
  );
  assert(hasMetrikLog, "Log memuat metrik wacana BSKAP (jumlah kata & kata/kalimat aktual)");

  // Cek paket di database
  if (binRes.packageId) {
    const pkg = await db
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, binRes.packageId))
      .limit(1);
    assert(pkg.length > 0 && pkg[0].status === "dalam_validasi", "Paket berstatus 'dalam_validasi'");
  }

  // -------------------------------------------------------------
  // Test 2: Batch Matematika SMP/MTs (Wajib Dilewati Total)
  // -------------------------------------------------------------
  console.log("\n--- Test 2: Generate Batch Matematika (Pemeriksaan Wacana Wajib Skip) ---");
  const matRes = await generateBatchQuestions({
    jenjang: "SMP/MTs",
    mapel: "Matematika",
    totalDiminta: 30,
    forceMock: true,
    triggeredBy: "cron",
  });

  assert(matRes.success, "Generasi Matematika SMP/MTs berhasil");
  assert(matRes.totalLolos === 30, `Total soal Matematika lolos 30 butir (aktual: ${matRes.totalLolos})`);

  const matLogRecords = await db
    .select()
    .from(generationLogs)
    .where(eq(generationLogs.id, matRes.logId))
    .limit(1);

  const matDetails = matLogRecords[0].detailPemeriksaan as any[];
  const hasUnexpectedWordFail = matDetails.some((d: any) =>
    typeof d.reason === "string" && d.reason.includes("KURANG dari batas minimal")
  );
  assert(!hasUnexpectedWordFail, "Matematika 100% bebas dari pemeriksaan jumlah kata");

  console.log(`\nHASIL AKHIR E2E: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

runE2ETests().catch((err) => {
  console.error("E2E Test Error:", err);
  process.exit(1);
});
