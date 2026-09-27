/**
 * Audit kualitas soal hasil generate (read-only).
 *
 * Pemakaian:
 *   node --env-file=.env.local --import tsx src/tests/audit-generated-quality.ts --packages=A24-SMP-MAT,A18-SD-BIN
 *   node --env-file=.env.local --import tsx src/tests/audit-generated-quality.ts --since-hours=6
 */
import { db } from "../db";
import { questions, questionPackages, stimulus } from "../db/schema";
import { eq, gte, inArray } from "drizzle-orm";
import { validateLatexDelimiters } from "../lib/validations/latex";

const PROFESI_WATCHLIST = ["arkeolog", "teknisi", "bts", "drone", "jagawana", "peneliti", "surveyor", "insinyur", "kurator", "barista", "roastery", "desainer kemasan", "sablon", "vaname"];
const LATIN_NAME = /\*[A-Z][a-z]+\s+[a-z]+\*/;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  })
);

async function loadQuestions() {
  if (args.packages) {
    const codes = args.packages.split(",").map((c: string) => c.trim());
    const pkgs = await db.select().from(questionPackages).where(inArray(questionPackages.code, codes));
    if (pkgs.length === 0) return [];
    return db.select().from(questions).where(inArray(questions.paketId, pkgs.map((p: any) => p.id)));
  }
  const hours = Number(args["since-hours"] || 24);
  const since = new Date(Date.now() - hours * 3600 * 1000);
  return db.select().from(questions).where(gte(questions.createdAt, since));
}

async function main() {
const qs: any[] = await loadQuestions();
console.log(`Soal diaudit: ${qs.length}\n`);
if (qs.length === 0) return;

const stimIds = [...new Set(qs.map((q) => q.stimulusId).filter(Boolean))] as string[];
const stims: any[] = stimIds.length ? await db.select().from(stimulus).where(inArray(stimulus.id, stimIds)) : [];
const stimById = new Map(stims.map((s) => [s.id, s.konten as string]));

const profesiCount: Record<string, number> = {};
const temaCount: Record<string, number> = {};
const problems: string[] = [];

for (const q of qs) {
  const p = q.payload || {};
  const narrative = [p.soal_text, q.stimulusId ? stimById.get(q.stimulusId) : ""].filter(Boolean).join(" ").toLowerCase();

  for (const w of PROFESI_WATCHLIST) if (narrative.includes(w)) profesiCount[w] = (profesiCount[w] || 0) + 1;
  temaCount[q.temaKonteks || "(kosong)"] = (temaCount[q.temaKonteks || "(kosong)"] || 0) + 1;

  const kunci: string[] = Array.isArray(p.kunci_jawaban) ? p.kunci_jawaban : [];
  if (kunci.length === 0) problems.push(`${q.code}: kunci jawaban kosong`);
  if ((q.bentukSoal === "PG" || q.bentukSoal === "PGK_MCMA") && Array.isArray(p.opsi)) {
    const labels = p.opsi.map((o: any) => o.label);
    const invalid = kunci.filter((k) => !labels.includes(k));
    if (invalid.length) problems.push(`${q.code}: kunci ${JSON.stringify(invalid)} tidak ada di opsi ${JSON.stringify(labels)}`);
    if (q.bentukSoal === "PGK_MCMA" && kunci.length === labels.length) problems.push(`${q.code}: PGK_MCMA semua opsi benar`);
  }
  if (q.bentukSoal === "PGK_KATEGORI" && (!Array.isArray(p.pernyataan) || p.pernyataan.length !== kunci.length)) {
    problems.push(`${q.code}: jumlah pernyataan (${p.pernyataan?.length}) != jumlah kunci (${kunci.length})`);
  }
  if (!p.pembahasan || !String(p.pembahasan).trim()) problems.push(`${q.code}: pembahasan kosong`);

  const fields: Array<[string, string]> = [
    ["soal_text", p.soal_text],
    ["pembahasan", p.pembahasan],
    ...(p.opsi || []).map((o: any) => [`opsi ${o.label}`, o.text] as [string, string]),
    ...(p.pernyataan || []).map((x: any) => [`pernyataan ${x.no}`, x.text] as [string, string]),
  ];
  for (const [name, text] of fields) {
    const v = validateLatexDelimiters(text, name);
    if (!v.valid) problems.push(`${q.code}: ${v.error}`);
  }

  const fullText = [p.soal_text, q.stimulusId ? stimById.get(q.stimulusId) : ""].join(" ");
  if (LATIN_NAME.test(fullText)) problems.push(`${q.code}: memuat nama ilmiah Latin`);
}

console.log("=== Profesi/latar dari watchlist (jumlah soal yang memuat) ===");
const profesiEntries = Object.entries(profesiCount).sort((a, b) => b[1] - a[1]);
console.log(profesiEntries.length ? profesiEntries.map(([k, v]) => `  ${k}: ${v}`).join("\n") : "  (bersih)");

console.log("\n=== Sebaran tema_konteks (10 teratas) ===");
Object.entries(temaCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([k, v]) => console.log(`  ${v}x ${k}`));
console.log(`  (${Object.keys(temaCount).length} tema berbeda untuk ${qs.length} soal)`);

console.log(`\n=== Masalah struktural (${problems.length}) ===`);
console.log(problems.length ? problems.map((p) => `  - ${p}`).join("\n") : "  (tidak ada)");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
