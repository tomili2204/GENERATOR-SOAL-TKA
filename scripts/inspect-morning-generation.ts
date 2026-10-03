import fs from "fs";
import path from "path";

if (!process.env.DATABASE_URL) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || "";
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val.trim();
      }
    }
  }
}

import { db } from "../src/db";
import { questionPackages, questions, stimulus, auditLogs } from "../src/db/schema";
import { gte, desc, sql } from "drizzle-orm";
import { analyzeStimulusText } from "./measure-stimulus-bin";

async function inspectMorningGeneration() {
  console.log("=== EVALUASI HASIL GENERATE HARI INI (2 OKTOBER 2026) ===\n");

  // Batas waktu mulai pagi ini (sejak 00:00 WIB / 17:00 UTC kemarin)
  const todayStartUtc = new Date("2026-10-01T17:00:00Z");

  // 1. Periksa paket soal yang dibuat hari ini
  const recentPackages = await db
    .select()
    .from(questionPackages)
    .where(gte(questionPackages.createdAt, todayStartUtc))
    .orderBy(desc(questionPackages.createdAt));

  console.log(`Ditemukan ${recentPackages.length} paket soal yang dibuat/diperbarui hari ini:`);
  for (const pkg of recentPackages) {
    console.log(`- [${pkg.code}] ${pkg.nama} | Jenjang: ${pkg.jenjang} | Mapel: ${pkg.mapel} | Status: ${pkg.status} | Jumlah Soal: ${pkg.jumlahSoal} | Dibuat: ${pkg.createdAt?.toISOString()}`);
  }

  // 2. Jika tidak ada yang sejak 00:00 WIB, ambil 10 paket terbaru untuk melihat aktivitas terkini
  if (recentPackages.length === 0) {
    console.log("\nTidak ada paket baru persis setelah 00:00 WIB. Mengambil 10 paket terbaru:");
    const latestPackages = await db
      .select()
      .from(questionPackages)
      .orderBy(desc(questionPackages.createdAt))
      .limit(10);
    for (const pkg of latestPackages) {
      console.log(`- [${pkg.code}] ${pkg.nama} | Jenjang: ${pkg.jenjang} | Mapel: ${pkg.mapel} | Status: ${pkg.status} | Jumlah Soal: ${pkg.jumlahSoal} | Dibuat: ${pkg.createdAt?.toISOString()}`);
    }
  }

  // 3. Periksa stimulus yang dibuat hari ini atau sesi terakhir
  const recentStimuli = await db
    .select()
    .from(stimulus)
    .where(gte(stimulus.createdAt, todayStartUtc))
    .orderBy(desc(stimulus.createdAt));

  console.log(`\nDitemukan ${recentStimuli.length} stimulus yang dibuat hari ini:`);
  let stimCount = 0;
  for (const s of recentStimuli.slice(0, 15)) {
    stimCount++;
    const metrics = analyzeStimulusText(s.konten);
    console.log(`  ${stimCount}. [${s.id}] (${s.jenjang} - ${s.mapel}) "${s.judul}" | Kata: ${metrics.wordCount}, Para: ${metrics.paragraphCount}, KPK: ${metrics.meanWps.toFixed(1)} (std: ${metrics.stdWps.toFixed(1)}), Def: ${metrics.definitionCount}`);
  }

  // 4. Periksa log audit / cron / generator terbaru
  console.log("\n--- Log Aktivitas Generator / Sistem Terkini ---");
  const recentLogs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  for (const log of recentLogs) {
    console.log(`- [${log.createdAt?.toISOString()}] ${log.action} oleh ${log.actorName || log.actorId} | Detail: ${JSON.stringify(log.details)}`);
  }

  // 5. Periksa distribusi kompetensi pada soal Bahasa Indonesia terbaru
  console.log("\n--- Distribusi Kompetensi Soal Bahasa Indonesia Hari Ini ---");
  const recentQuestions = await db
    .select({
      kompetensi: questions.kompetensi,
      count: sql<number>`count(*)::int`,
    })
    .from(questions)
    .where(gte(questions.createdAt, todayStartUtc))
    .groupBy(questions.kompetensi);

  for (const q of recentQuestions) {
    console.log(`  * ${q.kompetensi}: ${q.count} butir`);
  }
}

inspectMorningGeneration().catch((err) => {
  console.error("Gagal memeriksa:", err);
  process.exit(1);
});
