import { generateMockGeminiBatchResponse } from "../lib/generator/gemini-generator";
import { buildSystemPrompt } from "../lib/generator/prompt-builder";
import { validateLatexDelimiters } from "../lib/validations/latex";
import { generateCompetencySlotPlan, getMathCurriculumElements } from "../lib/generator/competency-plan";
import { renderDiagramTemplate } from "../lib/generator/diagram-templates";
// (import digabung dengan pemakaian di atas untuk uji sudut_transversal di bagian 7)

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

  // ------------------------------------------------------------------
  // 5. Elemen Kurikulum Matematika: UI Studio & rencana kompetensi satu sumber
  // ------------------------------------------------------------------
  console.log("\n--- 5. Math Curriculum Elements (UI <-> Competency Plan) ---");
  const sdElements = getMathCurriculumElements("SD/MI").map((e) => e.name);
  assert(
    JSON.stringify(sdElements) === JSON.stringify(["Bilangan", "Geometri dan Pengukuran", "Data"]),
    `SD/MI math elements follow official framework without Aljabar (found ${sdElements.join(", ")})`
  );
  for (const jenjang of ["SD/MI", "SMP/MTs", "SMA/MA"]) {
    const names = getMathCurriculumElements(jenjang).map((e) => e.name);
    const plan = generateCompetencySlotPlan(30, jenjang, "Matematika", names);
    assert(
      plan.length === 30 && plan.every((s) => !s.fokus.startsWith("kompetensi pada elemen")),
      `${jenjang}: every element selectable in Studio maps to a curated competency focus`
    );
  }
  const legacyPlan = generateCompetencySlotPlan(10, "SMP/MTs", "Matematika", ["Geometri & Pengukuran", "Data & Peluang"]);
  assert(
    legacyPlan.every((s) => !s.fokus.startsWith("kompetensi pada elemen") && !s.elemen.includes("&")),
    "Legacy '&' element names still resolve to curated focus with official names"
  );

  // ------------------------------------------------------------------
  // 6. Diagram garis_bilangan: label titik berdekatan tidak boleh bertumpuk
  // ------------------------------------------------------------------
  console.log("\n--- 6. Diagram garis_bilangan: Label Anti-Tumpuk ---");
  const glResult = renderDiagramTemplate({
    archetype: "garis_bilangan",
    min: 0,
    max: 1,
    step: 0.25,
    tanda: [
      { nilai: 0.25, label: "Tika (1/4 m)" },
      { nilai: 0.5, label: "Rafi (1/2 m)" },
      { nilai: 0.75, label: "Galih (3/4 m)" },
      { nilai: 0.8, label: "Sita (4/5 m)" },
    ],
  });
  assert(Boolean(glResult.svg) && !glResult.error, "garis_bilangan dengan 2 titik berdekatan berhasil dirender");
  const yPositions = [...(glResult.svg || "").matchAll(/<text x="[\d.]+" y="(-?[\d.]+)" font-size="11" font-weight="700"/g)].map((m) =>
    Number(m[1])
  );
  assert(yPositions.length === 4, `Keempat label titik ter-render (found ${yPositions.length})`);
  const galihIdx = 2;
  const sitaIdx = 3;
  assert(
    yPositions[galihIdx] !== yPositions[sitaIdx],
    "Label titik yang berdekatan (3/4 dan 4/5) digeser ke baris berbeda, tidak bertumpuk"
  );

  // ------------------------------------------------------------------
  // 7. Diagram sudut_transversal: geometri presisi (bukan digambar bebas oleh AI)
  // ------------------------------------------------------------------
  console.log("\n--- 7. Diagram sudut_transversal: Presisi Geometris ---");

  // Kasus nyata yang dilaporkan pengguna: A28-SMP-MAT-09. Sudut A = 115 derajat di kuadran
  // atas_kanan garis 1; sudut B sehadap (kuadran sama, garis 2) seharusnya PERSIS 115 derajat.
  const sudutCase1 = renderDiagramTemplate({
    archetype: "sudut_transversal",
    labelGaris1: "p",
    labelGaris2: "q",
    sudutDiketahui: { diGaris: 1, posisi: "atas_kanan", label: "∠A", nilaiDerajat: 115 },
    sudutLain: [{ diGaris: 2, posisi: "atas_kanan", label: "∠B", tampilkanNilai: true }],
  });
  assert(Boolean(sudutCase1.svg) && !sudutCase1.error, "sudut_transversal kasus sehadap berhasil dirender");
  assert(
    (sudutCase1.svg || "").includes("∠B = 115°"),
    "Sudut sehadap (kuadran sama di garis lain) dihitung TEPAT sama besar dengan sudut diketahui, bukan digambar bebas"
  );

  // Sudut berpelurus (kuadran "lawan" di garis yang SAMA) harus 180 - 115 = 65 derajat.
  const sudutCase2 = renderDiagramTemplate({
    archetype: "sudut_transversal",
    sudutDiketahui: { diGaris: 1, posisi: "atas_kanan", label: "∠A", nilaiDerajat: 115 },
    sudutLain: [{ diGaris: 1, posisi: "atas_kiri", label: "∠C", tampilkanNilai: true }],
  });
  assert(
    (sudutCase2.svg || "").includes("∠C = 65°"),
    "Sudut berpelurus (kuadran bersebelahan, garis sama) dihitung TEPAT 180 - sudut diketahui"
  );

  // Sudut yang ditanyakan (tampilkanNilai: false) tidak boleh membocorkan angka jawabannya.
  const sudutCase3 = renderDiagramTemplate({
    archetype: "sudut_transversal",
    sudutDiketahui: { diGaris: 1, posisi: "atas_kanan", label: "∠A", nilaiDerajat: 115 },
    sudutLain: [{ diGaris: 2, posisi: "atas_kanan", label: "∠B", tampilkanNilai: false }],
  });
  assert(
    (sudutCase3.svg || "").includes(">∠B<") && !(sudutCase3.svg || "").includes("∠B = 115"),
    "Sudut yang ditanyakan (tampilkanNilai: false) hanya menampilkan nama sudut, tidak nilainya"
  );

  // Validasi: posisi tidak dikenal, nilai derajat di luar rentang, dan sudut transversal terlalu
  // ekstrem (nyaris berimpit dengan garis sejajar) wajib ditolak dengan pesan error, bukan diam-diam
  // menggambar sesuatu yang tidak masuk akal.
  const sudutInvalidPos = renderDiagramTemplate({
    archetype: "sudut_transversal",
    sudutDiketahui: { diGaris: 1, posisi: "tengah", label: "∠A", nilaiDerajat: 90 },
  });
  assert(!sudutInvalidPos.svg && Boolean(sudutInvalidPos.error), "sudut_transversal menolak posisi kuadran yang tidak dikenal");

  const sudutExtreme = renderDiagramTemplate({
    archetype: "sudut_transversal",
    sudutDiketahui: { diGaris: 1, posisi: "atas_kanan", label: "∠A", nilaiDerajat: 5 },
  });
  assert(!sudutExtreme.svg && Boolean(sudutExtreme.error), "sudut_transversal menolak sudut transversal yang terlalu landai/ekstrem untuk digambar terbaca");

  // ------------------------------------------------------------------
  // 8. Diagram pola_baris: titik tidak boleh menabrak label
  // ------------------------------------------------------------------
  console.log("\n--- 8. Diagram pola_baris: Anti-Tabrak Label ---");

  // Kasus nyata yang dilaporkan pengguna: A24-SMP-MAT-20, barisan pot bibit 6/10/14.
  const polaCase = renderDiagramTemplate({
    archetype: "pola_baris",
    judul: "Formasi Tiga Baris Pertama Pot Bibit",
    baris: [
      { label: "Baris 1 (6 pot):", jumlah: 6 },
      { label: "Baris 2 (10 pot):", jumlah: 10 },
      { label: "Baris 3 (14 pot):", jumlah: 14 },
    ],
    catatan: "Pola berlanjut dengan beda tetap tiap baris (+4 pot)",
  });
  assert(Boolean(polaCase.svg) && !polaCase.error, "pola_baris kasus nyata berhasil dirender");

  // Verifikasi geometris: titik pertama tiap baris tidak boleh berada di rentang x label mana pun.
  const svg = polaCase.svg || "";
  const labelXs = [...svg.matchAll(/<text x="20" y="[\d.]+"[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]);
  const CHAR_W = 13 * 0.55;
  const maxLabelEnd = 20 + Math.max(...labelXs.map((l) => l.length * CHAR_W));
  const circleXs = [...svg.matchAll(/<circle cx="([\d.]+)"/g)].map((m) => Number(m[1]));
  const minCircleX = Math.min(...circleXs);
  assert(
    minCircleX - 8 > maxLabelEnd,
    `Titik paling kiri (x=${minCircleX.toFixed(1)}) tidak menabrak label terpanjang (berakhir ~x=${maxLabelEnd.toFixed(1)})`
  );
  assert(circleXs.length === 6 + 10 + 14, `Total titik sesuai jumlah baris (found ${circleXs.length}, expected 30)`);

  // Baris yang terlalu panjang untuk satu baris kanvas harus melipat ke baris kedua, bukan
  // meluber keluar viewBox.
  const wrapCase = renderDiagramTemplate({
    archetype: "pola_baris",
    baris: [{ label: "Baris besar:", jumlah: 40 }],
  });
  const wrapCircleXs = [...(wrapCase.svg || "").matchAll(/<circle cx="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert(
    Boolean(wrapCase.svg) && Math.max(...wrapCircleXs) <= 480,
    "Baris dengan banyak titik melipat ke baris berikutnya, tidak meluber keluar kanvas"
  );

  // Validasi: baris kosong / jumlah tidak valid ditolak.
  const polaInvalid = renderDiagramTemplate({ archetype: "pola_baris", baris: [] });
  assert(!polaInvalid.svg && Boolean(polaInvalid.error), "pola_baris menolak array baris kosong");

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
