import { repairLatexString } from "../lib/latex/latex-repair";
import { validateLatexDelimiters } from "../lib/validations/latex";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}${detail ? `\n       ${detail}` : ""}`);
    failed++;
  }
}

const BROKEN_FRAGMENT = /\$[A-Za-z][A-Za-z\s\-]*\s\$\s*[=<>+]/;

// Output AI yang BENAR, sebelumnya dirusak repair menjadi "$Total $= ... = 900$ kg$"
const displayWithLabelAndUnit = "Langkah 1:\n$$\\text{Total} = 140 + 180 + 160 + 220 + 200 = 900\\text{ kg}$$";
const r1 = repairLatexString(displayWithLabelAndUnit);
assert(!BROKEN_FRAGMENT.test(r1), "Blok $$ berlabel \\text{} + satuan tidak dipecah jadi fragmen", r1);
assert(r1.includes("$$") && r1.trim().endsWith("$$"), "Blok $$ tetap utuh sebagai blok display", r1);

const displayWithUnitOnly = "$$s \\approx 2{,}7 + 0{,}038 = 2{,}7386\\text{ m}$$";
const r2 = repairLatexString(displayWithUnitOnly);
assert(!/\$ m\$/.test(r2), "Satuan di akhir blok $$ tidak ditarik keluar", r2);
assert(r2.startsWith("$$") && r2.endsWith("$$"), "Blok $$ satuan-akhir tetap utuh", r2);

// Perilaku lama yang memang diinginkan harus tetap berjalan
const inlineNarrative = "$\\text{Langkah 1: Hitung volume balok: } V = p \\times l \\times t$";
const r3 = repairLatexString(inlineNarrative);
assert(r3 === "Langkah 1: Hitung volume balok: $V = p \\times l \\times t$", "Narasi \\text{} di inline $...$ tetap dikeluarkan", r3);

const unitAfterInline = "Panjangnya $0{,}2$ m.";
const r4 = repairLatexString(unitAfterInline);
assert(r4 === "Panjangnya $0{,}2\\text{ m}$.", "Satuan setelah $...$ dirapikan ke dalam \\text{}", r4);

const unitHari = "Lama pengerjaan $12$ hari.";
const r5 = repairLatexString(unitHari);
assert(r5 === "Lama pengerjaan $12\\text{ hari}$.", "Satuan 'hari' tidak bolak-balik dikeluarkan lagi", r5);

// Idempoten: repair dijalankan saat simpan DAN saat render (LatexPreview)
const samples = [
  displayWithLabelAndUnit,
  displayWithUnitOnly,
  inlineNarrative,
  unitAfterInline,
  unitHari,
  "Harga $\\frac{3}{4}$ bagian adalah Rp12.000,00 dan $5 \\times 3 = 15$ buah.",
  "Diketahui:\nTinggi ($t_1$) = $1{,}8$ m.\n$$\\frac{T}{1{,}8} = \\frac{9{,}6}{2{,}4}$$\nSimpulan: B.",
];
for (const s of samples) {
  const once = repairLatexString(s);
  const twice = repairLatexString(once);
  assert(once === twice, `Idempoten: ${s.slice(0, 40).replace(/\n/g, " ")}...`, `once=${once}\ntwice=${twice}`);
}

// Validator struktural: teks yang sudah terlanjur rusak di database harus ditolak
const alreadyBroken = "Langkah 1:\n$Total $= 140 + 180 + 160 + 220 + 200 = 900$ kg$";
assert(!validateLatexDelimiters(alreadyBroken, "Pembahasan").valid, "Validator menolak pola fragmen $Kata $= ... $ satuan$");

const bareCommand = "Hasilnya adalah \\frac{900}{5} = 180 kg.";
const bareRepaired = repairLatexString(bareCommand);
assert(validateLatexDelimiters(bareCommand, "Pembahasan").valid, "Perintah LaTeX telanjang yang bisa dibungkus otomatis tetap lolos", bareRepaired);

assert(validateLatexDelimiters(displayWithLabelAndUnit, "Pembahasan").valid, "Validator menerima blok $$ yang benar");
assert(validateLatexDelimiters("Tanpa rumus sama sekali.", "Soal").valid, "Validator menerima teks tanpa rumus");

console.log(`\nHASIL: ${passed} Passed, ${failed} Failed.`);
process.exit(failed > 0 ? 1 : 0);
