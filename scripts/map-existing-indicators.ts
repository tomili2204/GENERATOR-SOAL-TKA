import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { FlattenedIndicator } from "./extract-all-official-taxonomies";

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[match[1].trim()] = val;
    }
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const officialPath = path.resolve(__dirname, "../src/lib/taxonomy/kemendikdasmen-official.json");
const officialData: FlattenedIndicator[] = JSON.parse(fs.readFileSync(officialPath, "utf-8"));

function normalizeMapel(m: string): string {
  if (/matematika/i.test(m)) return "Matematika";
  if (/indonesia/i.test(m)) return "Bahasa Indonesia";
  return m;
}

function normalizeJenjangCode(j: string): string {
  if (/sd/i.test(j)) return "SD";
  if (/smp/i.test(j)) return "SMP";
  return "SMA";
}

function cleanTokens(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["dan", "atau", "pada", "yang", "dari", "untuk", "dalam", "dengan", "ke"].includes(w));
}

function calculateScore(qText: string, ind: FlattenedIndicator): number {
  let score = 0;
  const qTokens = cleanTokens(qText);
  const indTokens = cleanTokens(`${ind.elemen} ${ind.subelemen} ${ind.kompetensi} ${ind.indikator}`);

  for (const t of qTokens) {
    if (indTokens.includes(t)) {
      score += 1;
    }
  }
  return score;
}

async function dryRunMath() {
  const questionsRes = await pool.query(`
    SELECT id, jenjang, mapel, elemen, sub_elemen, kompetensi, level_kognitif,
           payload->>'soal_text' as soal_text,
           payload->>'target_arketipe' as target_arketipe
    FROM soal.questions
    WHERE mapel ILIKE '%matematika%'
    ORDER BY id
    LIMIT 10
  `);

  console.log(`=== DRY RUN SAMPLE MATEMATIKA (10 soal) ===`);
  for (const q of questionsRes.rows) {
    const jNorm = normalizeJenjangCode(q.jenjang);
    const mNorm = normalizeMapel(q.mapel);

    const candidates = officialData.filter(
      (ind) => ind.jenjang === jNorm && ind.nama_mapel === mNorm
    );

    let bestScore = -1;
    let bestInd = candidates[0];

    const qSearchText = `${q.elemen} ${q.sub_elemen || ""} ${q.kompetensi || ""} ${q.level_kognitif || ""} ${q.target_arketipe || ""} ${q.soal_text?.slice(0, 150) || ""}`;

    for (const cand of candidates) {
      let score = calculateScore(qSearchText, cand);
      if (q.elemen && cand.elemen.toLowerCase().includes(q.elemen.toLowerCase())) {
        score += 8;
      }
      if (q.sub_elemen && cand.subelemen.toLowerCase().includes(q.sub_elemen.toLowerCase())) {
        score += 8;
      }
      if (score > bestScore) {
        bestScore = score;
        bestInd = cand;
      }
    }

    console.log(`\n[${q.id}] ${q.jenjang} - ${q.mapel} | Elemen: ${q.elemen} / ${q.sub_elemen}`);
    console.log(`  Soal: ${q.soal_text?.slice(0, 80)}...`);
    console.log(`  -> MATCHED: [${bestInd.urutan}] ${bestInd.indikator}`);
    console.log(`  -> Elemen: ${bestInd.elemen} | Subelemen: ${bestInd.subelemen} (Score: ${bestScore})`);
  }

  await pool.end();
}

dryRunMath().catch(console.error);
