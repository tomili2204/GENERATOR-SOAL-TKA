import { generateMockGeminiBatchResponse } from "../lib/generator/gemini-generator";
import { buildSystemPrompt } from "../lib/generator/prompt-builder";
import { validateLatexDelimiters } from "../lib/validations/latex";

async function runQualityTests() {
  console.log("==================================================================");
  console.log("TESTING TKA GENERATOR QUALITY & PUSMENDIK/DEFANTRI COMPLIANCE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // ------------------------------------------------------------------
  // 1. System Prompt Compliance Tests
  // ------------------------------------------------------------------
  console.log("--- 1. BSKAP & Pusmendik System Prompt Compliance ---");
  const matSmp = buildSystemPrompt("SMP/MTs", "Matematika");
  const binSmp = buildSystemPrompt("SMP/MTs", "Bahasa Indonesia");
  const binSma = buildSystemPrompt("SMA/MA", "Bahasa Indonesia");
  for (const [label, prompt] of [["MAT SMP", matSmp], ["BIN SMP", binSmp]] as const) {
    assert(prompt.includes("Kementerian Pendidikan Dasar dan Menengah RI"), `${label}: contains official Ministry name`);
    assert(prompt.includes("Perkaban BSKAP No. 45/2025") && prompt.includes("No. 47/2025"), `${label}: contains BSKAP 45/2025 & 47/2025 references`);
    assert(prompt.includes("FORMAT KELUARAN — WAJIB, TIDAK BOLEH DILANGGAR"), `${label}: contains exact format instruction string`);
    assert(prompt.includes("PGK_MCMA") && prompt.includes("PGK_KATEGORI"), `${label}: contains all required question types`);
    assert(prompt.includes("CONTOH ACUAN GAYA SOAL TKA RESMI"), `${label}: contains Pusmendik-style few-shot exemplars`);
    assert(prompt.includes("Satu persamaan utuh berada di dalam SATU pasangan $...$"), `${label}: contains single-equation LaTeX rule`);
    assert(!/arkeolog|pilot drone|teknisi menara/i.test(prompt), `${label}: does not name specific banned professions (anchoring)`);
  }
  assert(matSmp.includes("KETENTUAN MATEMATIKA") && !matSmp.includes("KETENTUAN BAHASA"), "MAT prompt carries only math rules");
  assert(binSmp.includes("KETENTUAN BAHASA") && !binSmp.includes("KETENTUAN MATEMATIKA"), "BIN prompt carries only language rules");
  assert(binSmp.includes("Pemahaman Tekstual") && binSmp.includes("Mengakses dan Menemukan Informasi"), "BIN prompt contains both domestic and PISA taxonomies");
  assert(binSmp.includes("200-250 kata"), "SMP BIN prompt uses SMP text length");
  assert(binSma.includes("250-300 kata") && !binSma.includes("200-250 kata"), "SMA BIN prompt uses SMA text length (not SMP)");

  // ------------------------------------------------------------------
  // 2. Mock Generator Quality (Matematika SD/MI & SMP)
  // ------------------------------------------------------------------
  console.log("\n--- 2. Mock Data Quality & Non-Trivial Checks (Matematika) ---");
  const rawMathJson = generateMockGeminiBatchResponse("SD/MI", "Matematika", 30);
  let mathItems: any[] = [];
  try {
    mathItems = JSON.parse(rawMathJson);
    assert(Array.isArray(mathItems), "Math mock generator returns valid JSON array");
  } catch (err: any) {
    assert(false, `Math mock generator JSON parse error: ${err.message}`);
  }

  const stimuli = mathItems.filter((it) => it.stimulus_id_sementara && it.konten);
  const questions = mathItems.filter((it) => it.soal_text);

  assert(stimuli.length >= 1, `Contains at least 1 stimulus (found ${stimuli.length})`);
  assert(stimuli[0]?.konten?.includes("| Hari | Buku Tulis"), "Stimulus contains Markdown table with authentic sales data");
  assert(stimuli[0]?.konten?.includes("Koperasi Siswa Mandiri"), "Stimulus contains authentic context (Koperasi Siswa Mandiri)");
  assert(questions.length === 30, `Generates exactly 30 questions (found ${questions.length})`);

  // Check that NO questions have trivial arithmetic
  let trivialCount = 0;
  for (const q of questions) {
    const text = q.soal_text || "";
    if (text.includes("Berapakah nilai dari $x =") || text.includes("\\times 2$?")) {
      trivialCount++;
    }
  }
  assert(trivialCount === 0, `Zero questions contain trivial 'x = i * 2' arithmetic (found ${trivialCount})`);

  // Check group questions cohesion
  const groupQuestions = questions.filter((q) => q.jenis_soal === "grup");
  assert(groupQuestions.length >= 2, `Group questions present (found ${groupQuestions.length})`);
  for (const gq of groupQuestions) {
    assert(gq.stimulus_id_sementara === "stim-01", `Group question ${gq.soal_text.slice(0, 30)}... is linked to stim-01`);
    const refersToTable = gq.soal_text.includes("koperasi") || gq.soal_text.includes("Koperasi") || gq.soal_text.includes("tabel") || gq.soal_text.includes("Buku Tulis") || gq.soal_text.includes("Dana Sosial");
    assert(refersToTable, `Group question text is synchronized with stimulus table context`);
  }

  // Check question shapes (PG, PGK_MCMA, PGK_KATEGORI)
  const pgCount = questions.filter((q) => q.bentuk_soal === "PG").length;
  const mcmaCount = questions.filter((q) => q.bentuk_soal === "PGK_MCMA").length;
  const kategoriCount = questions.filter((q) => q.bentuk_soal === "PGK_KATEGORI").length;
  assert(pgCount > 0, `Contains PG questions (${pgCount})`);
  assert(mcmaCount > 0, `Contains PGK_MCMA questions (${mcmaCount})`);
  assert(kategoriCount > 0, `Contains PGK_KATEGORI questions (${kategoriCount})`);

  // Check cognitive levels and elements
  const hasAplikasi = questions.some((q) => q.level_kognitif === "Aplikasi");
  const hasPenalaran = questions.some((q) => q.level_kognitif === "Penalaran");
  assert(hasAplikasi && hasPenalaran, "Contains both 'Aplikasi' and 'Penalaran' cognitive levels");

  // Check SVG Visual diagram support
  const svgQuestions = questions.filter(
    (q) => q.gambar && (typeof q.gambar === "string" ? q.gambar.includes("<svg") : q.gambar?.svg_content?.includes("<svg"))
  );
  assert(svgQuestions.length >= 1, `Contains questions with clean inline SVG diagram (found ${svgQuestions.length})`);

  // ------------------------------------------------------------------
  // 3. LaTeX Delimiter & Formatting Integrity
  // ------------------------------------------------------------------
  console.log("\n--- 3. LaTeX Delimiter & Formatting Integrity ---");
  let latexErrors = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const valText = validateLatexDelimiters(q.soal_text);
    if (!valText.valid) {
      console.error(`Latex error in Q${i + 1} soal_text:`, valText.error);
      latexErrors++;
    }
    const valPem = validateLatexDelimiters(q.pembahasan);
    if (!valPem.valid) {
      console.error(`Latex error in Q${i + 1} pembahasan:`, valPem.error);
      latexErrors++;
    }
    if (Array.isArray(q.opsi)) {
      for (const op of q.opsi) {
        const valOp = validateLatexDelimiters(op.text);
        if (!valOp.valid) {
          console.error(`Latex error in Q${i + 1} opsi ${op.label}:`, valOp.error);
          latexErrors++;
        }
      }
    }
  }
  assert(latexErrors === 0, `All LaTeX formulas have valid balanced delimiters (errors: ${latexErrors})`);

  // ------------------------------------------------------------------
  // 4. Mock Generator (Bahasa Indonesia)
  // ------------------------------------------------------------------
  console.log("\n--- 4. Mock Data Quality (Bahasa Indonesia) ---");
  const rawIndoJson = generateMockGeminiBatchResponse("SMP/MTs", "Bahasa Indonesia", 30);
  const indoItems = JSON.parse(rawIndoJson);
  const indoStim = indoItems.find((it: any) => it.stimulus_id_sementara && it.konten);
  const indoQuestions = indoItems.filter((it: any) => it.soal_text);

  assert(Boolean(indoStim), "Bahasa Indonesia has reading stimulus");
  assert(indoStim?.konten?.includes("Hutan mangrove"), "Bahasa Indonesia stimulus is a contextual reading text on mangrove conservation");
  assert(indoQuestions.length === 30, `Generates 30 Bahasa Indonesia questions (found ${indoQuestions.length})`);
  assert(indoQuestions.some((q: any) => q.level_kognitif === "Pemahaman Inferensial"), "Contains Pemahaman Inferensial level");
  assert(indoQuestions.some((q: any) => q.level_kognitif === "Evaluasi dan Apresiasi"), "Contains Evaluasi dan Apresiasi level");

  // Summary
  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runQualityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
