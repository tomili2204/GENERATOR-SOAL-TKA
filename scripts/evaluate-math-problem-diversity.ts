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
import { questionPackages, questions } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function evaluateMathPackage(pkgCode: string) {
  const [pkg] = await db
    .select()
    .from(questionPackages)
    .where(eq(questionPackages.code, pkgCode));

  if (!pkg) {
    console.log(`Paket ${pkgCode} tidak ditemukan!`);
    return null;
  }

  const qList = await db
    .select()
    .from(questions)
    .where(eq(questions.paketId, pkg.id))
    .orderBy(questions.nomorUrut);

  return { pkg, qList };
}

async function main() {
  console.log("=== EVALUASI MENDALAM VARIASI MASALAH MATEMATIS PADA HASIL GENERATOR ===\n");

  const packagesToEvaluate = ["A27-SD-MAT", "A33-SMP-MAT"];

  for (const code of packagesToEvaluate) {
    const res = await evaluateMathPackage(code);
    if (!res) continue;
    const { pkg, qList } = res;

    console.log(`================================================================================`);
    console.log(`ANALISIS PAKET: [${pkg.code}] ${pkg.nama} (${pkg.jenjang})`);
    console.log(`Total Soal: ${qList.length} butir`);
    console.log(`================================================================================`);

    // 1. Distribusi Elemen Materi
    const elemenCounts: Record<string, number> = {};
    const subElemenCounts: Record<string, number> = {};
    const kognitifCounts: Record<string, number> = {};
    const kesulitanCounts: Record<string, number> = {};
    const bentukCounts: Record<string, number> = {};

    // 2. Analisis Arketipe Masalah Matematis (Mathematical Core Problem)
    const taskArchetypes: Record<string, number> = {
      "Aritmetika Sosial & Transaksi (harga, diskon, untung-rugi)": 0,
      "Operasi Pecahan & Rasio (perbandingan, porsi, skala)": 0,
      "Pengukuran & Konversi Satuan (jarak, kecepatan, debit, waktu, berat)": 0,
      "Geometri Datar (keliling, luas gabungan, sudut)": 0,
      "Geometri Ruang (volume, kubus satuan, jaring-jaring)": 0,
      "Aljabar & Persamaan (SPLDV, pemodelan linier, fungsi)": 0,
      "Pola Bilangan, Deret & Barisan": 0,
      "Statistika & Analisis Data (diagram, mean, median, modus)": 0,
      "Peluang & Kombinatorika": 0,
      "Konteks Matematika Murni (tanpa narasi cerita dunia nyata)": 0,
    };

    // Deteksi Tindakan / Pertanyaan Matematis
    const cognitiveActionPatterns: Record<string, number> = {
      "Menghitung Nilai Tunggal Langsung ('Berapa...')": 0,
      "Memilih Pernyataan Benar/Salah (PGK Kategori)": 0,
      "Memilih Multi-Opsi yang Benar (PGK MCMA)": 0,
      "Optimasi / Nilai Ekstrem (maksimum, minimum, paling sedikit/banyak)": 0,
      "Inversi / Aljabar Mundur (mencari nilai asal dari hasil akhir)": 0,
      "Estimasi / Penaksiran": 0,
      "Pemodelan Matematis (membuat rumus / persamaan)": 0,
      "Klasifikasi Sifat / Bentuk Geometri": 0,
    };

    const questionSummaries: string[] = [];

    qList.forEach((q, idx) => {
      elemenCounts[q.elemen] = (elemenCounts[q.elemen] || 0) + 1;
      const sub = q.subElemen || "umum";
      subElemenCounts[sub] = (subElemenCounts[sub] || 0) + 1;
      kognitifCounts[q.levelKognitif || ""] = (kognitifCounts[q.levelKognitif || ""] || 0) + 1;
      kesulitanCounts[q.tingkatKesulitan || ""] = (kesulitanCounts[q.tingkatKesulitan || ""] || 0) + 1;
      bentukCounts[q.bentukSoal] = (bentukCounts[q.bentukSoal] || 0) + 1;

      const payload = typeof q.payload === "string" ? JSON.parse(q.payload) : q.payload || {};
      const txt = (payload.soal_text || "").toLowerCase();
      const rawText = payload.soal_text || "";
      const fokus = (q.kompetensi || "").toLowerCase();

      // Deteksi Konteks Matematika Murni (tanpa cerita dunia nyata)
      const hasRealWorldStory =
        /toko|warung|koperasi|bazar|siswa|anak|kakek|ibu|ayah|bibi|paman|petani|lapangan|taman|kebun|sekolah|posyandu|desa|kota|lomba|sepeda|mobil|panggung|kolam|kain|pita/i.test(
          txt
        );

      if (!hasRealWorldStory) {
        taskArchetypes["Konteks Matematika Murni (tanpa narasi cerita dunia nyata)"]++;
      }

      // Deteksi Arketipe Masalah
      if (/diskon|harga|untung|rugi|jual|beli|koperasi|bazar|iuran|rupiah|rp/i.test(txt) || /aritmetika sosial/i.test(fokus)) {
        taskArchetypes["Aritmetika Sosial & Transaksi (harga, diskon, untung-rugi)"]++;
      }
      if (/pecahan|rasio|skala|perbandingan|bagian kue|bagian lahan|0,\d+/i.test(txt) || /pecahan|rasio/i.test(fokus)) {
        taskArchetypes["Operasi Pecahan & Rasio (perbandingan, porsi, skala)"]++;
      }
      if (/kecepatan|jarak|waktu tempuh|debit|liter|kg|gram|menit|jam|meter|km/i.test(txt) || /satuan|kecepatan|waktu/i.test(fokus)) {
        taskArchetypes["Pengukuran & Konversi Satuan (jarak, kecepatan, debit, waktu, berat)"]++;
      }
      if (/keliling|luas|persegi|segitiga|lingkaran|sudut|garis transversal|kesebangunan/i.test(txt) || /geometri|sudut/i.test(fokus)) {
        taskArchetypes["Geometri Datar (keliling, luas gabungan, sudut)"]++;
      }
      if (/volume|kubus|balok|prisma|limas|tabung|wadah|kemasan/i.test(txt) || /volume/i.test(fokus)) {
        taskArchetypes["Geometri Ruang (volume, kubus satuan, jaring-jaring)"]++;
      }
      if (/persamaan|variabel|aljabar|fungsi|spldv|x\s*=|y\s*=/i.test(txt) || /aljabar|fungsi|persamaan/i.test(fokus)) {
        taskArchetypes["Aljabar & Persamaan (SPLDV, pemodelan linier, fungsi)"]++;
      }
      if (/pola|barisan|deret|berurutan|ke-\d+/i.test(txt) || /pola|barisan|deret/i.test(fokus)) {
        taskArchetypes["Pola Bilangan, Deret & Barisan"]++;
      }
      if (/diagram|tabel|rata-rata|mean|median|modus|frekuensi|piktogram/i.test(txt) || /data|diagram|rata-rata/i.test(fokus)) {
        taskArchetypes["Statistika & Analisis Data (diagram, mean, median, modus)"]++;
      }
      if (/peluang|kemungkinan|terpilih|dadu|koin/i.test(txt) || /peluang/i.test(fokus)) {
        taskArchetypes["Peluang & Kombinatorika"]++;
      }

      // Tindakan Kognitif
      if (/paling banyak|paling sedikit|maksimum|minimum|terbanyak|tersedikit|maksimal|minimal/i.test(txt)) {
        cognitiveActionPatterns["Optimasi / Nilai Ekstrem (maksimum, minimum, paling sedikit/banyak)"]++;
      }
      if (/taksiran|kira-kira|perkiraan|mendekati|sekitar/i.test(txt) || /estimasi/i.test(fokus)) {
        cognitiveActionPatterns["Estimasi / Penaksiran"]++;
      }
      if (/model matematika|persamaan yang menyatakan|hubungan antara/i.test(txt)) {
        cognitiveActionPatterns["Pemodelan Matematis (membuat rumus / persamaan)"]++;
      }
      if (/sifat|ciri-ciri|nama bangun|bangun datar berikut/i.test(txt)) {
        cognitiveActionPatterns["Klasifikasi Sifat / Bentuk Geometri"]++;
      }
      if (q.bentukSoal === "PGK_KATEGORI") {
        cognitiveActionPatterns["Memilih Pernyataan Benar/Salah (PGK Kategori)"]++;
      } else if (q.bentukSoal === "PGK_MCMA") {
        cognitiveActionPatterns["Memilih Multi-Opsi yang Benar (PGK MCMA)"]++;
      } else if (q.bentukSoal === "PG") {
        cognitiveActionPatterns["Menghitung Nilai Tunggal Langsung ('Berapa...')"]++;
      }

      questionSummaries.push(
        `#${q.nomorUrut} [${q.bentukSoal} | ${q.elemen} | ${q.tingkatKesulitan}]: ${rawText.replace(/\n/g, " ").slice(0, 110)}...`
      );
    });

    console.log("\n1. SEBARAN ELEMEN MATERI:");
    for (const [k, v] of Object.entries(elemenCounts)) {
      console.log(`   - ${k}: ${v} butir (${((v / qList.length) * 100).toFixed(0)}%)`);
    }

    console.log("\n2. SEBARAN LEVEL KOGNITIF:");
    for (const [k, v] of Object.entries(kognitifCounts)) {
      console.log(`   - ${k}: ${v} butir (${((v / qList.length) * 100).toFixed(0)}%)`);
    }

    console.log("\n3. SEBARAN BENTUK SOAL:");
    for (const [k, v] of Object.entries(bentukCounts)) {
      console.log(`   - ${k}: ${v} butir`);
    }

    console.log("\n4. SEBARAN DOMAIN / TIPE MASALAH MATEMATIS:");
    for (const [k, v] of Object.entries(taskArchetypes)) {
      if (v > 0) {
        console.log(`   - ${k}: ${v} butir`);
      }
    }

    console.log("\n5. VARIASI TINDAKAN KOGNITIF (TIPE PERTANYAAN):");
    for (const [k, v] of Object.entries(cognitiveActionPatterns)) {
      if (v > 0) {
        console.log(`   - ${k}: ${v} butir`);
      }
    }

    console.log("\n6. DAFTAR RINGKAS SELURUH SOAL (30 Butir):");
    questionSummaries.forEach((s) => console.log(`   ${s}`));
    console.log("\n");
  }
}

main().catch(console.error);
