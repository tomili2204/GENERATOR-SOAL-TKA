import fs from "fs";
import { Pool } from "pg";

export interface TextMetrics {
  paragraphCount: number;
  sentenceCount: number;
  wordCount: number;
  meanWps: number;
  stdWps: number;
  minWps: number;
  maxWps: number;
  countGt12: number;
  pctGt12: number;
  countGt20: number;
  pctGt20: number;
  definitionCount: number;
  definitions: string[];
  conjCounts: Record<string, number>;
  ttr: number;
  openers: string[];
  openerFreq: Record<string, number>;
  genre: string;
  isDualText: boolean;
  subTextParagraphs: number[];
}

export const TARGET_CONJUNCTIONS = [
  "namun",
  "tetapi",
  "karena",
  "sehingga",
  "meskipun",
  "walaupun",
  "oleh karena itu",
  "akibatnya",
  "sementara itu",
  "selain itu",
  "bahkan",
  "padahal",
];

// Helper to strip glossaries/headers before measuring body words & sentences
export function stripGlossaryAndHeadings(text: string): { bodyText: string; glossaryText: string } {
  if (!text) return { bodyText: "", glossaryText: "" };

  // Separate "Daftar Istilah:" or "Glosarium:" if present at the end
  const glossaryMatch = text.match(/(?:\n\s*|\r\n\s*)(?:Daftar Istilah|Glosarium)\s*:\s*([\s\S]*)$/i);
  let bodyText = text;
  let glossaryText = "";

  if (glossaryMatch && glossaryMatch.index !== undefined) {
    bodyText = text.substring(0, glossaryMatch.index).trim();
    glossaryText = glossaryMatch[1].trim();
  }

  return { bodyText, glossaryText };
}

// Stricter definition detector: only counts sentences defining a term with a noun phrase
// Excludes numerical predicates ("Bagi hasil setahun adalah tiga persen", "Jangka waktunya adalah enam bulan")
export function isTrueDefinitionSentence(sentence: string): boolean {
  const clean = sentence.trim();
  const lower = clean.toLowerCase();

  // Exclude numerical/currency/duration assertions
  if (
    /(adalah|merupakan|ialah)\s+(\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|dua belas|nol)\s+(persen|rupiah|bulan|tahun|hari|jam|menit|detik|butir|orang|kg|cm|meter)/i.test(
      lower
    )
  ) {
    return false;
  }
  if (/(adalah|merupakan|ialah)\s+sebesar\b/i.test(lower)) {
    return false;
  }
  if (/(adalah|merupakan|ialah)\s+karena\b/i.test(lower)) {
    return false;
  }

  // Look for "X adalah/merupakan/ialah/disebut <frasa benda/penjelas konsep>"
  // Typically: "X adalah sebutan...", "X adalah jenis...", "X adalah wadah...", "X adalah belahan...", "X adalah alat...", "Kelulut adalah jenis..."
  const defRegex =
    /\b([A-Z][a-zA-Z0-9_-]*(?:\s+[a-zA-Z0-9_-]+){0,3})\s+(adalah|merupakan|ialah)\s+(sebutan|jenis|wadah|belahan|alat|tempat|pusat|cairan|tanaman|tumbuhan|hewan|binatang|serangga|organisme|senyawa|zat|istilah|proses|bagian|sebuah|suatu|salah satu|kelompok|orang|kumpulan|kegiatan)\b/i;
  const disebutRegex =
    /(?:sering\s+)?disebut\s+(?:dengan\s+)?(?:istilah\s+)?["']?[a-zA-Z0-9_-]+["']?/i;

  if (defRegex.test(clean) || disebutRegex.test(clean)) {
    return true;
  }

  // Generic fallback: check if subject followed by "adalah/merupakan" + noun
  const genericDef =
    /^[A-Z][\w\s-]{1,35}\s+(adalah|merupakan)\s+[a-z]{3,20}\s+[a-z]{3,20}/i;
  if (genericDef.test(clean) && !/(persen|rupiah|bulan|tahun|jam)/i.test(lower)) {
    // Verify it is not a statistical fact
    if (!/(jumlah|hasil|biaya|target|penalti|waktu|anggaran|total)/i.test(lower)) {
      return true;
    }
  }

  return false;
}

export function analyzeStimulusText(fullText: string): TextMetrics {
  const { bodyText } = stripGlossaryAndHeadings(fullText);

  // Check if dual text
  const isDualText = /(?:\*\*Teks 1:|\bTeks 1\b)[\s\S]*(?:\*\*Teks 2:|\bTeks 2\b)/i.test(bodyText);

  // Count paragraphs per sub-text or single text
  let paragraphCount = 0;
  const subTextParagraphs: number[] = [];

  if (isDualText) {
    const parts = bodyText.split(/(?:\*\*Teks 2:|\bTeks 2\b)/i);
    for (const part of parts) {
      const paras = part
        .replace(/^\s*\*\*Teks 1:[^\n]*\n?/i, "")
        .replace(/^\s*#+\s.*$/gm, "")
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && !/^(\*\*Teks \d|Teks \d)/i.test(p));
      subTextParagraphs.push(paras.length);
      paragraphCount += paras.length;
    }
  } else {
    const paras = bodyText
      .replace(/^#+\s.*$/gm, "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    paragraphCount = Math.max(1, paras.length);
    subTextParagraphs.push(paragraphCount);
  }

  // Sentences from body text
  const cleanForSentences = bodyText
    .replace(/^#+\s.*$/gm, "")
    .replace(/^\s*\*\*Teks \d:[^\n]*\n?/gim, "")
    .trim();

  const rawSentences = cleanForSentences
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = Math.max(1, rawSentences.length);

  // Words from body text
  const cleanWords = cleanForSentences
    .replace(/[^\w\s-]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const wordCount = cleanWords.length;

  // Sentence lengths
  const sentenceLengths = rawSentences.map((s) => {
    return s.replace(/[^\w\s-]/g, " ").split(/\s+/).filter(Boolean).length;
  });

  const meanWps = wordCount / sentenceCount;
  const variance =
    sentenceLengths.reduce((acc, len) => acc + Math.pow(len - meanWps, 2), 0) /
    sentenceCount;
  const stdWps = Math.sqrt(variance);
  const minWps = sentenceLengths.length > 0 ? Math.min(...sentenceLengths) : 0;
  const maxWps = sentenceLengths.length > 0 ? Math.max(...sentenceLengths) : 0;

  const countGt12 = sentenceLengths.filter((l) => l > 12).length;
  const pctGt12 = (countGt12 / sentenceCount) * 100;
  const countGt20 = sentenceLengths.filter((l) => l > 20).length;
  const pctGt20 = (countGt20 / sentenceCount) * 100;

  // Definitions
  const definitions: string[] = [];
  rawSentences.forEach((s) => {
    if (isTrueDefinitionSentence(s)) {
      definitions.push(s);
    }
  });

  // Conjunction counts
  const conjCounts: Record<string, number> = {};
  TARGET_CONJUNCTIONS.forEach((c) => {
    conjCounts[c] = 0;
  });
  const lowerBody = bodyText.toLowerCase();
  TARGET_CONJUNCTIONS.forEach((c) => {
    const reg = new RegExp(`\\b${c}\\b`, "gi");
    const m = lowerBody.match(reg);
    conjCounts[c] = m ? m.length : 0;
  });

  // TTR
  const uniqueWords = new Set(cleanWords);
  const ttr = wordCount > 0 ? uniqueWords.size / wordCount : 0;

  // Openers
  const openers = rawSentences
    .map((s) => {
      const first = s.replace(/^[^\w]+/, "").split(/\s+/)[0]?.toLowerCase() || "";
      return first;
    })
    .filter(Boolean);
  const openerFreq: Record<string, number> = {};
  openers.forEach((w) => {
    openerFreq[w] = (openerFreq[w] || 0) + 1;
  });

  // Genre detection
  let genre = "eksposisi/informasi";
  if (isDualText) {
    genre = "teks ganda antarteks";
  } else if (
    /(\bcerita\b|\bdanu\b|\brian\b|\bpagi itu\b|\btiba-tiba\b|\bberkata\b|\btersenyum\b|\bmenatap\b|\bterkejut\b)/i.test(
      bodyText
    ) &&
    !/berita|posyandu|panen/i.test(bodyText)
  ) {
    genre = "narasi/cerpen";
  } else if (
    /(\blangkah\b|\bcara\b|\bpetunjuk\b|\bpembuatan\b)/i.test(bodyText) &&
    /pertama|kedua|selanjutnya/i.test(bodyText)
  ) {
    genre = "prosedur";
  } else if (/(\bberita\b|\bdilaporkan\b|\bperistiwa\b|\bkejadian\b)/i.test(bodyText)) {
    genre = "berita";
  } else if (/(\blaporan\b|\bhasil observasi\b|\bpengamatan\b)/i.test(bodyText)) {
    genre = "laporan observasi";
  } else if (/(\bpendapat\b|\bopini\b|\bmenurut saya\b|\bseharusnya\b)/i.test(bodyText)) {
    genre = "argumentasi/opini";
  }

  return {
    paragraphCount,
    sentenceCount,
    wordCount,
    meanWps,
    stdWps,
    minWps,
    maxWps,
    countGt12,
    pctGt12,
    countGt20,
    pctGt20,
    definitionCount: definitions.length,
    definitions,
    conjCounts,
    ttr,
    openers,
    openerFreq,
    genre,
    isDualText,
    subTextParagraphs,
  };
}

export interface BatchSummary {
  n: number;
  wordsAvg: number;
  wordsMin: number;
  wordsMax: number;
  sentencesAvg: number;
  paragraphsAvg: number;
  wpsMean: number;
  wpsStdAvg: number;
  minWpsMin: number;
  maxWpsMax: number;
  pctGt12Avg: number;
  pctGt20Avg: number;
  definitionsAvg: number;
  totalDefinitions: number;
  ttrAvg: number;
  top5Openers: [string, number][];
  totalConjunctions: Record<string, number>;
  genreDist: Record<string, number>;
}

export function aggregateMetrics(metricsList: TextMetrics[]): BatchSummary {
  const n = metricsList.length;
  if (n === 0) {
    return {
      n: 0,
      wordsAvg: 0,
      wordsMin: 0,
      wordsMax: 0,
      sentencesAvg: 0,
      paragraphsAvg: 0,
      wpsMean: 0,
      wpsStdAvg: 0,
      minWpsMin: 0,
      maxWpsMax: 0,
      pctGt12Avg: 0,
      pctGt20Avg: 0,
      definitionsAvg: 0,
      totalDefinitions: 0,
      ttrAvg: 0,
      top5Openers: [],
      totalConjunctions: {},
      genreDist: {},
    };
  }

  const avg = (fn: (m: TextMetrics) => number) =>
    metricsList.reduce((acc, m) => acc + fn(m), 0) / n;
  const min = (fn: (m: TextMetrics) => number) => Math.min(...metricsList.map(fn));
  const max = (fn: (m: TextMetrics) => number) => Math.max(...metricsList.map(fn));

  const totalConjs: Record<string, number> = {};
  TARGET_CONJUNCTIONS.forEach((c) => {
    totalConjs[c] = 0;
  });
  metricsList.forEach((m) => {
    Object.entries(m.conjCounts).forEach(([k, v]) => {
      totalConjs[k] = (totalConjs[k] || 0) + v;
    });
  });

  const totalOpeners: Record<string, number> = {};
  metricsList.forEach((m) => {
    Object.entries(m.openerFreq).forEach(([k, v]) => {
      totalOpeners[k] = (totalOpeners[k] || 0) + v;
    });
  });
  const top5Openers = Object.entries(totalOpeners)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as [string, number][];

  const genreDist: Record<string, number> = {};
  metricsList.forEach((m) => {
    genreDist[m.genre] = (genreDist[m.genre] || 0) + 1;
  });

  return {
    n,
    wordsAvg: Math.round(avg((m) => m.wordCount) * 10) / 10,
    wordsMin: min((m) => m.wordCount),
    wordsMax: max((m) => m.wordCount),
    sentencesAvg: Math.round(avg((m) => m.sentenceCount) * 10) / 10,
    paragraphsAvg: Math.round(avg((m) => m.paragraphCount) * 100) / 100,
    wpsMean: Math.round(avg((m) => m.meanWps) * 100) / 100,
    wpsStdAvg: Math.round(avg((m) => m.stdWps) * 100) / 100,
    minWpsMin: min((m) => m.minWps),
    maxWpsMax: max((m) => m.maxWps),
    pctGt12Avg: Math.round(avg((m) => m.pctGt12) * 10) / 10,
    pctGt20Avg: Math.round(avg((m) => m.pctGt20) * 10) / 10,
    definitionsAvg: Math.round(avg((m) => m.definitionCount) * 100) / 100,
    totalDefinitions: metricsList.reduce((acc, m) => acc + m.definitionCount, 0),
    ttrAvg: Math.round(avg((m) => m.ttr) * 1000) / 10,
    top5Openers,
    totalConjunctions: totalConjs,
    genreDist,
  };
}

// Standalone execution: measure current database stimuli
async function main() {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const dbUrlMatch = envContent.match(/DATABASE_URL=([^\r\n]+)/);
  if (!dbUrlMatch) {
    console.error("DATABASE_URL not found in .env.local");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: dbUrlMatch[1], ssl: { rejectUnauthorized: false } });

  console.log("=== MENGUKUR POPULASI STIMULUS BAHASA INDONESIA (scripts/measure-stimulus-bin.ts) ===");

  const smpQuery = await pool.query(`
    SELECT DISTINCT ON (s.id)
      s.id, s.judul, s.konten, s.created_at, p.code as paket_code
    FROM soal.stimulus s
    JOIN soal.questions q ON q.stimulus_id = s.id
    JOIN soal.question_packages p ON q.paket_id = p.id
    WHERE (s.jenjang ILIKE '%smp%' OR s.jenjang = 'SMP')
      AND s.mapel ILIKE '%indonesia%'
      AND s.konten IS NOT NULL AND length(s.konten) > 100
    ORDER BY s.id, s.created_at DESC
  `);

  const smpMetrics = smpQuery.rows.map((r) => analyzeStimulusText(r.konten));
  const smpSummary = aggregateMetrics(smpMetrics);

  console.log("\n--- POPULASI AKTUAL: SMP/MTs (N = " + smpSummary.n + ") ---");
  console.log(`Kata rata-rata: ${smpSummary.wordsAvg} (rentang ${smpSummary.wordsMin}-${smpSummary.wordsMax})`);
  console.log(`Kalimat rata-rata: ${smpSummary.sentencesAvg}`);
  console.log(`Paragraf rata-rata: ${smpSummary.paragraphsAvg}`);
  console.log(`Kata per kalimat (KPK): mean ${smpSummary.wpsMean}, std ${smpSummary.wpsStdAvg}`);
  console.log(`Kalimat >12 kata: ${smpSummary.pctGt12Avg}%, >20 kata: ${smpSummary.pctGt20Avg}%`);
  console.log(`Kalimat definisi (strict): ${smpSummary.definitionsAvg} per stimulus (total ${smpSummary.totalDefinitions})`);
  console.log(`TTR: ${smpSummary.ttrAvg}%`);
  console.log("Top 5 pembuka kalimat:", smpSummary.top5Openers);
  console.log("Frekuensi konjungsi:", smpSummary.totalConjunctions);
  console.log("Distribusi genre:", smpSummary.genreDist);

  // Pengukuran Populasi SD/MI
  const sdQuery = await pool.query(`
    SELECT DISTINCT ON (s.id)
      s.id, s.judul, s.konten, s.created_at, p.code as paket_code
    FROM soal.stimulus s
    JOIN soal.questions q ON q.stimulus_id = s.id
    JOIN soal.question_packages p ON q.paket_id = p.id
    WHERE (s.jenjang ILIKE '%sd%' OR s.jenjang = 'SD')
      AND s.mapel ILIKE '%indonesia%'
      AND s.konten IS NOT NULL AND length(s.konten) > 100
    ORDER BY s.id, s.created_at DESC
  `);

  const sdMetrics = sdQuery.rows.map((r) => analyzeStimulusText(r.konten));
  const sdSummary = aggregateMetrics(sdMetrics);

  console.log("\n--- BASELINE SD/MI SAAT INI (N = " + sdSummary.n + ") ---");
  console.log(`Kata rata-rata: ${sdSummary.wordsAvg} (rentang ${sdSummary.wordsMin}-${sdSummary.wordsMax})`);
  console.log(`Kalimat rata-rata: ${sdSummary.sentencesAvg}`);
  console.log(`Paragraf rata-rata: ${sdSummary.paragraphsAvg}`);
  console.log(`Kata per kalimat (KPK): mean ${sdSummary.wpsMean}, std ${sdSummary.wpsStdAvg}`);
  console.log(`Kalimat >12 kata: ${sdSummary.pctGt12Avg}%, >20 kata: ${sdSummary.pctGt20Avg}%`);
  console.log(`Kalimat definisi (strict): ${sdSummary.definitionsAvg} per stimulus (total ${sdSummary.totalDefinitions})`);
  console.log(`TTR: ${sdSummary.ttrAvg}%`);
  console.log("Top 5 pembuka kalimat:", sdSummary.top5Openers);
  console.log("Frekuensi konjungsi:", sdSummary.totalConjunctions);
  console.log("Distribusi genre:", sdSummary.genreDist);

  await pool.end();
}

if (require.main === module || process.argv[1]?.includes("measure-stimulus-bin")) {
  main().catch(console.error);
}
