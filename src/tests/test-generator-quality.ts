import { BSKAP_SYSTEM_PROMPT, generateMockGeminiBatchResponse } from "../lib/generator/gemini-generator";
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
  assert(BSKAP_SYSTEM_PROMPT.includes("Kementerian Pendidikan Dasar dan Menengah RI"), "Contains official Ministry name");
  assert(BSKAP_SYSTEM_PROMPT.includes("Perkaban BSKAP No. 45/2025"), "Contains BSKAP 45/2025 reference");
  assert(BSKAP_SYSTEM_PROMPT.includes("No. 47/2025"), "Contains BSKAP 47/2025 reference");
  assert(BSKAP_SYSTEM_PROMPT.includes("FORMAT KELUARAN — WAJIB, TIDAK BOLEH DILANGGAR"), "Contains exact format instruction string");
  assert(BSKAP_SYSTEM_PROMPT.includes("PGK_MCMA") && BSKAP_SYSTEM_PROMPT.includes("PGK_KATEGORI"), "Contains all required question types");
  assert(BSKAP_SYSTEM_PROMPT.includes("MATRIKS ASESMEN RESMI PUSMENDIK KEMENDIKDASMEN"), "Contains Pusmendik Assessment Matrix header");
  assert(BSKAP_SYSTEM_PROMPT.includes("Bilangan Rasional") && BSKAP_SYSTEM_PROMPT.includes("Objek Geometri"), "Contains SD Matematika Pusmendik competencies");
  assert(BSKAP_SYSTEM_PROMPT.includes("PLSV, PtLSV, SPLDV") && BSKAP_SYSTEM_PROMPT.includes("Bilangan Real"), "Contains SMP Matematika Pusmendik competencies");
  assert(BSKAP_SYSTEM_PROMPT.includes("Pemahaman Tekstual") && BSKAP_SYSTEM_PROMPT.includes("Pemahaman Inferensial"), "Contains Bahasa Indonesia reading competencies");
  assert(BSKAP_SYSTEM_PROMPT.includes("ANTI-TRIVIAL & WAJIB MULTI-STEP REASONING (HOTS)"), "Contains Anti-Trivial & HOTS quality guidelines");
  assert(BSKAP_SYSTEM_PROMPT.includes("Dilarang keras membuat soal satu langkah sederhana"), "Forbids trivial arithmetic");
  assert(BSKAP_SYSTEM_PROMPT.includes("SINKRONISASI MUTLAK STIMULUS DENGAN BUTIR SOAL"), "Enforces absolute stimulus cohesion");
  assert(BSKAP_SYSTEM_PROMPT.includes("DUKUNGAN REPRESENTASI VISUAL & TABEL DATA"), "Includes Markdown table and SVG visual support");

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
