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
import { questionPackages, questions, stimulus } from "../src/db/schema";
import { eq, ilike, and, inArray } from "drizzle-orm";
import { analyzeStimulusText } from "./measure-stimulus-bin";

async function main() {
  console.log("================================================================================");
  console.log("AUDIT KOMPREHENSIF SELURUH BANK SOAL BAHASA INDONESIA DI DATABASE");
  console.log("================================================================================\n");

  // 1. Ambil seluruh paket Bahasa Indonesia
  const allPackages = await db
    .select()
    .from(questionPackages)
    .where(ilike(questionPackages.mapel, "%indonesia%"))
    .orderBy(questionPackages.code);

  console.log(`1. RINGKASAN PAKET SOAL BAHASA INDONESIA:`);
  console.log(`   Total Paket Ditemukan: ${allPackages.length} paket\n`);

  const pkgByJenjang: Record<string, typeof allPackages> = {};
  for (const p of allPackages) {
    const j = p.jenjang || "Lainnya";
    if (!pkgByJenjang[j]) pkgByJenjang[j] = [];
    pkgByJenjang[j].push(p);
  }

  for (const [jenjang, pkgs] of Object.entries(pkgByJenjang)) {
    console.log(`   [${jenjang}] — ${pkgs.length} paket:`);
    const statusCounts: Record<string, number> = {};
    for (const p of pkgs) {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    }
    const statusStr = Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(", ");
    console.log(`     Status: ${statusStr}`);
    console.log(`     Daftar Kode: ${pkgs.map(p => p.code).join(", ")}`);
  }

  // 2. Ambil seluruh butir soal Bahasa Indonesia
  console.log(`\n2. AUDIT BUTIR SOAL BAHASA INDONESIA:`);
  const allQuestions = await db
    .select()
    .from(questions)
    .where(ilike(questions.mapel, "%indonesia%"));

  console.log(`   Total Butir Soal: ${allQuestions.length} butir`);

  const qByJenjang: Record<string, typeof allQuestions> = {};
  for (const q of allQuestions) {
    const j = q.jenjang || "Lainnya";
    if (!qByJenjang[j]) qByJenjang[j] = [];
    qByJenjang[j].push(q);
  }

  for (const [jenjang, qList] of Object.entries(qByJenjang)) {
    console.log(`\n   --- RINCIAN BUTIR JENJANG ${jenjang} (${qList.length} butir) ---`);

    // Bentuk Soal
    const bentukCounts: Record<string, number> = {};
    const kesulitanCounts: Record<string, number> = {};
    const jenisCounts: Record<string, number> = {};

    // Kompetensi
    const bskapCounts = {
      "Pemahaman Tekstual": 0,
      "Pemahaman Inferensial": 0,
      "Evaluasi dan Apresiasi": 0,
      "Label PISA / Lama (Perlu Migrasi)": 0,
    };
    const detailedPisaLabels: Record<string, number> = {};

    // Kualitas Pembahasan (Deteksi kebocoran monolog internal AI)
    let aiMonologueLeaks = 0;
    let missingStimulusInGroup = 0;

    for (const q of qList) {
      bentukCounts[q.bentukSoal] = (bentukCounts[q.bentukSoal] || 0) + 1;
      kesulitanCounts[q.tingkatKesulitan || "tanpa_kesulitan"] = (kesulitanCounts[q.tingkatKesulitan || "tanpa_kesulitan"] || 0) + 1;
      jenisCounts[q.jenisSoal] = (jenisCounts[q.jenisSoal] || 0) + 1;

      const komp = (q.kompetensi || "").trim();
      if (komp.startsWith("Pemahaman Tekstual")) {
        bskapCounts["Pemahaman Tekstual"]++;
      } else if (komp.startsWith("Pemahaman Inferensial")) {
        bskapCounts["Pemahaman Inferensial"]++;
      } else if (komp.startsWith("Evaluasi dan Apresiasi")) {
        bskapCounts["Evaluasi dan Apresiasi"]++;
      } else {
        bskapCounts["Label PISA / Lama (Perlu Migrasi)"]++;
        detailedPisaLabels[komp || "kosong"] = (detailedPisaLabels[komp || "kosong"] || 0) + 1;
      }

      if (q.jenisSoal === "grup" && !q.stimulusId) {
        missingStimulusInGroup++;
      }

      const payload = typeof q.payload === "string" ? JSON.parse(q.payload) : q.payload || {};
      const pembahasan = payload.pembahasan || "";
      if (/aturan\s+PGK|tidak\s+boleh\s+semua\s+opsi\s+benar|mari\s+kita\s+ubah|agar\s+opsi\s+[A-D]\s+salah/i.test(pembahasan)) {
        aiMonologueLeaks++;
      }
    }

    console.log(`   * Bentuk Soal:`, bentukCounts);
    console.log(`   * Tingkat Kesulitan:`, kesulitanCounts);
    console.log(`   * Jenis Soal (Tunggal vs Grup):`, jenisCounts);
    console.log(`   * Status Kepatuhan 3 Kompetensi BSKAP No. 47/2025:`);
    console.log(`     - Pemahaman Tekstual: ${bskapCounts["Pemahaman Tekstual"]} butir (${((bskapCounts["Pemahaman Tekstual"] / qList.length) * 100).toFixed(1)}%)`);
    console.log(`     - Pemahaman Inferensial: ${bskapCounts["Pemahaman Inferensial"]} butir (${((bskapCounts["Pemahaman Inferensial"] / qList.length) * 100).toFixed(1)}%)`);
    console.log(`     - Evaluasi dan Apresiasi: ${bskapCounts["Evaluasi dan Apresiasi"]} butir (${((bskapCounts["Evaluasi dan Apresiasi"] / qList.length) * 100).toFixed(1)}%)`);
    console.log(`     - Label PISA / Lama: ${bskapCounts["Label PISA / Lama (Perlu Migrasi)"]} butir (${((bskapCounts["Label PISA / Lama (Perlu Migrasi)"] / qList.length) * 100).toFixed(1)}%)`);
    if (Object.keys(detailedPisaLabels).length > 0) {
      console.log(`       Rincian label lama:`, detailedPisaLabels);
    }
    console.log(`   * Kebocoran Monolog AI pada Pembahasan: ${aiMonologueLeaks} butir`);
    console.log(`   * Soal Grup Tanpa Stimulus ID: ${missingStimulusInGroup} butir`);
  }

  // 3. Ambil seluruh stimulus Bahasa Indonesia
  console.log(`\n================================================================================`);
  console.log(`3. AUDIT TEKS WACANA / STIMULUS BAHASA INDONESIA:`);
  console.log(`================================================================================`);

  const allStimuli = await db
    .select()
    .from(stimulus)
    .where(ilike(stimulus.mapel, "%indonesia%"));

  console.log(`   Total Stimulus Wacana: ${allStimuli.length} wacana\n`);

  const stimByJenjang: Record<string, typeof allStimuli> = {};
  for (const s of allStimuli) {
    const j = s.jenjang || "Lainnya";
    if (!stimByJenjang[j]) stimByJenjang[j] = [];
    stimByJenjang[j].push(s);
  }

  for (const [jenjang, sList] of Object.entries(stimByJenjang)) {
    console.log(`   --- ANALISIS WACANA JENJANG ${jenjang} (${sList.length} wacana) ---`);
    const isSd = jenjang.includes("SD");
    const targetWords = isSd ? "150-200 kata" : "200-250 kata";
    const targetKpk = isSd ? "5.0-7.0 kata/kalimat" : "7.0-10.0 kata/kalimat";

    let totalWords = 0;
    let totalParagraphs = 0;
    let singleParagraphCount = 0;
    let multiParagraphCount = 0;
    let totalKpk = 0;
    let rigidSentenceCount = 0; // std dev < 0.5
    let naturalSentenceCount = 0; // std dev >= 1.0
    let withGlossaryCount = 0;
    let multiTextCount = 0;

    let wordInRange = 0;
    let wordBelow = 0;
    let wordAbove = 0;

    for (const st of sList) {
      const m = analyzeStimulusText(st.konten);
      totalWords += m.wordCount;
      totalParagraphs += m.paragraphCount;
      totalKpk += m.meanWps;

      if (m.paragraphCount === 1) singleParagraphCount++;
      else multiParagraphCount++;

      if (m.stdWps < 0.5) rigidSentenceCount++;
      if (m.stdWps >= 1.0) naturalSentenceCount++;

      if (m.definitionCount > 0) withGlossaryCount++;
      if (m.isMultiText) multiTextCount++;

      if (isSd) {
        if (m.wordCount >= 150 && m.wordCount <= 200) wordInRange++;
        else if (m.wordCount < 150) wordBelow++;
        else wordAbove++;
      } else {
        if (m.wordCount >= 200 && m.wordCount <= 250) wordInRange++;
        else if (m.wordCount < 200) wordBelow++;
        else wordAbove++;
      }
    }

    const avgWords = (totalWords / sList.length).toFixed(1);
    const avgPara = (totalParagraphs / sList.length).toFixed(1);
    const avgKpk = (totalKpk / sList.length).toFixed(2);

    console.log(`   * Rata-rata Panjang Wacana: ${avgWords} kata (Target: ${targetWords})`);
    console.log(`     - Masuk Rentang Target: ${wordInRange} wacana (${((wordInRange / sList.length) * 100).toFixed(1)}%)`);
    console.log(`     - Di Bawah Rentang: ${wordBelow} wacana`);
    console.log(`     - Di Atas Rentang: ${wordAbove} wacana`);
    console.log(`   * Rata-rata Paragraf: ${avgPara} paragraf per wacana`);
    console.log(`     - Multi-Paragraf (2+ paragraf): ${multiParagraphCount} wacana (${((multiParagraphCount / sList.length) * 100).toFixed(1)}%)`);
    console.log(`     - 1 Paragraf Tunggal: ${singleParagraphCount} wacana (${((singleParagraphCount / sList.length) * 100).toFixed(1)}%)`);
    console.log(`   * Rata-rata KPK: ${avgKpk} kata/kalimat (Target: ${targetKpk})`);
    console.log(`   * Variasi Kalimat:`);
    console.log(`     - Alami & Fleksibel (Std Dev >= 1.0): ${naturalSentenceCount} wacana (${((naturalSentenceCount / sList.length) * 100).toFixed(1)}%)`);
    console.log(`     - Kaku Seragam (Std Dev < 0.5): ${rigidSentenceCount} wacana (${((rigidSentenceCount / sList.length) * 100).toFixed(1)}%)`);
    console.log(`   * Format Khusus:`);
    console.log(`     - Memuat Daftar Istilah/Glosarium: ${withGlossaryCount} wacana`);
    console.log(`     - Format Teks Ganda (Komparasi Teks 1 & 2): ${multiTextCount} wacana`);
  }

  // 4. Breakdown Per Paket Spesifik (Identifikasi Paket Mana yang Masih Perlu Perhatian)
  console.log(`\n================================================================================`);
  console.log(`4. STATUS KEPATUHAN PER PAKET (PAKET RESMI DENGAN STATUS):`);
  console.log(`================================================================================`);

  for (const pkg of allPackages) {
    const qList = await db
      .select({ kompetensi: questions.kompetensi })
      .from(questions)
      .where(eq(questions.paketId, pkg.id));

    let bskapCount = 0;
    let pisaCount = 0;

    for (const q of qList) {
      const k = (q.kompetensi || "").trim();
      if (k.startsWith("Pemahaman Tekstual") || k.startsWith("Pemahaman Inferensial") || k.startsWith("Evaluasi dan Apresiasi")) {
        bskapCount++;
      } else {
        pisaCount++;
      }
    }

    const bskapPct = qList.length > 0 ? ((bskapCount / qList.length) * 100).toFixed(0) : "0";
    const statusNote = pisaCount === 0 ? "100% BSKAP OK" : `⚠️ ${pisaCount} butir PISA lama`;
    console.log(`   [${pkg.code}] ${pkg.nama} (${pkg.jenjang}) | Status: ${pkg.status} | Soal: ${qList.length} | Kepatuhan BSKAP: ${bskapPct}% | ${statusNote}`);
  }
}

main().catch(console.error);
