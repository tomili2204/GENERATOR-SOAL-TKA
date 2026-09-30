/**
 * Pembuat file .xlsx template impor Excel untuk Pembuat Soal (soal Human), meniru persis
 * struktur file resmi (sheet "Soal" + "Petunjuk" + "Referensi Kompetensi") yang sudah diterima
 * apa adanya oleh src/lib/validations/excel-import.ts -- fungsi ini TIDAK mengubah perilaku
 * parser tersebut, hanya menghasilkan file yang sudah sesuai formatnya.
 *
 * Memakai exceljs (bukan xlsx/SheetJS community) karena hanya exceljs yang bisa MENULIS
 * data validation dropdown di sini.
 */
import ExcelJS from "exceljs";
import { getReferensiKompetensi, isTemplateAvailable } from "./kompetensi-referensi";
import { PETUNJUK_BARIS } from "./petunjuk-template";

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "00E0E7FF" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true };

const SOAL_COLUMNS = [
  "No",
  "Format",
  "Teks Soal",
  "Kode Kompetensi",
  "Tingkat Kesulitan",
  "Level Kognitif",
  "Bobot",
  "Media Soal",
  "Pembahasan",
  "Opsi A",
  "Opsi B",
  "Opsi C",
  "Opsi D",
  "Opsi E",
  "Opsi F",
  "Opsi G",
  "Opsi H",
  "Kunci Jawaban",
  "Pernyataan 1",
  "Jawaban 1",
  "Pernyataan 2",
  "Jawaban 2",
  "Pernyataan 3",
  "Jawaban 3",
] as const;

// Lebar kolom persis mengikuti template resmi (indeks 0 = kolom A).
const SOAL_COLUMN_WIDTHS = [6, 14, 60, 20, 16, 14, 8, 30, 50, 28, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 14, 40, 12, 40, 12, 40, 12];

interface ContohRow {
  no: string;
  format: string;
  teksSoal: string;
  kodeKompetensi: string;
  tingkatKesulitan: string;
  levelKognitif: string;
  bobot: number;
  pembahasan: string;
  opsi?: [string, string, string, string];
  kunciJawaban?: string;
  pernyataan?: [string, string, string];
  jawaban?: [string, string, string];
}

// 3 baris CONTOH, satu per Format, isinya sama persis dengan template resmi Matematika SMP.
const CONTOH_ROWS: ContohRow[] = [
  {
    no: "CONTOH",
    format: "pg",
    teksSoal: "Hasil dari $\\frac{3}{4} + \\frac{1}{6}$ adalah ....",
    kodeKompetensi: "MTK.BIL.REAL.L1",
    tingkatKesulitan: "mudah",
    levelKognitif: "L1",
    bobot: 1,
    pembahasan: "Samakan penyebut: $\\frac{3}{4} = \\frac{9}{12}$ dan $\\frac{1}{6} = \\frac{2}{12}$.\nJumlahnya $\\frac{9}{12} + \\frac{2}{12} = \\frac{11}{12}$.",
    opsi: ["$\\frac{4}{10}$", "$\\frac{2}{3}$", "$\\frac{11}{12}$", "$\\frac{5}{4}$"],
    kunciJawaban: "C",
  },
  {
    no: "CONTOH",
    format: "pg_kompleks",
    teksSoal: "Perhatikan persamaan $3x - 5 = 10$.\nPernyataan yang benar mengenai persamaan tersebut adalah ....",
    kodeKompetensi: "MTK.ALJ.PPL.L1",
    tingkatKesulitan: "mudah",
    levelKognitif: "L1",
    bobot: 2,
    pembahasan: "Tambahkan $5$ pada kedua ruas: $3x = 15$, lalu bagi $3$: $x = 5$.\nJadi pernyataan A, B, dan C benar, sedangkan D salah.",
    opsi: ["Nilai $x$ adalah $5$.", "Nilai $3x$ adalah $15$.", "Jika kedua ruas ditambah $5$, diperoleh $3x = 15$.", "Nilai $x$ adalah $\\frac{5}{3}$."],
    kunciJawaban: "A,B,C",
  },
  {
    no: "CONTOH",
    format: "pg_kategori",
    teksSoal: "Sebuah toko alat tulis memberi diskon $20\\%$ untuk sebuah tas seharga Rp150.000,00.\nTentukan Benar atau Salah untuk setiap pernyataan berikut!",
    kodeKompetensi: "MTK.BIL.REAL.L2",
    tingkatKesulitan: "sedang",
    levelKognitif: "L2",
    bobot: 2,
    pembahasan: "Diskon $= 20\\% \\times 150.000 = 30.000$, sehingga harga setelah diskon $= 150.000 - 30.000 = 120.000$.\nPernyataan 1 benar, pernyataan 2 salah, pernyataan 3 benar (harga akhir adalah $80\\%$ dari harga awal).",
    pernyataan: ["Besar potongan harga adalah Rp30.000,00.", "Harga tas setelah diskon adalah Rp110.000,00.", "Harga tas setelah diskon sama dengan $80\\%$ dari harga awal."],
    jawaban: ["Benar", "Salah", "Benar"],
  },
];

const MAX_TEMPLATE_ROWS = 500;

function buildSoalSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Soal", {
    views: [{ state: "frozen", xSplit: 3, ySplit: 1 }],
  });

  ws.columns = SOAL_COLUMNS.map((header, i) => ({ header, width: SOAL_COLUMN_WIDTHS[i] }));

  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle", wrapText: true };
  });

  CONTOH_ROWS.forEach((c, idx) => {
    const r = idx + 2;
    const row = ws.getRow(r);
    row.getCell(1).value = c.no;
    row.getCell(2).value = c.format;
    row.getCell(3).value = c.teksSoal;
    row.getCell(4).value = c.kodeKompetensi;
    row.getCell(5).value = c.tingkatKesulitan;
    row.getCell(6).value = c.levelKognitif;
    row.getCell(7).value = c.bobot;
    row.getCell(9).value = c.pembahasan;
    if (c.opsi) {
      row.getCell(10).value = c.opsi[0];
      row.getCell(11).value = c.opsi[1];
      row.getCell(12).value = c.opsi[2];
      row.getCell(13).value = c.opsi[3];
      row.getCell(18).value = c.kunciJawaban || "";
    }
    if (c.pernyataan && c.jawaban) {
      row.getCell(19).value = c.pernyataan[0];
      row.getCell(20).value = c.jawaban[0];
      row.getCell(21).value = c.pernyataan[1];
      row.getCell(22).value = c.jawaban[1];
      row.getCell(23).value = c.pernyataan[2];
      row.getCell(24).value = c.jawaban[2];
    }
    for (let col = 1; col <= 24; col++) {
      row.getCell(col).alignment = { vertical: "top", wrapText: true };
    }
  });

  addListValidation(ws, "B", MAX_TEMPLATE_ROWS, ['"pg,pg_kompleks,pg_kategori"'], "Format harus pg, pg_kompleks, atau pg_kategori.");
  return ws;
}

// Tipe exceljs yang terbundel tidak mendeklarasikan Worksheet.dataValidations meski API-nya
// ada di runtime (dikonfirmasi manual) -- pakai `any` lokal di titik ini saja, bukan di
// seluruh berkas.
function addListValidation(ws: ExcelJS.Worksheet, colLetter: string, lastRow: number, formulae: string[], errorMsg: string) {
  (ws as any).dataValidations.add(`${colLetter}2:${colLetter}${lastRow}`, {
    type: "list",
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: "Nilai tidak valid",
    error: errorMsg,
    formulae,
  });
}

function addKompetensiValidation(ws: ExcelJS.Worksheet, refRowCount: number) {
  // Jumlah baris Referensi Kompetensi bervariasi per jenjang/mapel -- rentang formula
  // dihitung dari data aktual, bukan angka tetap, supaya dropdown selalu pas.
  addListValidation(ws, "D", MAX_TEMPLATE_ROWS, [`'Referensi Kompetensi'!$A$2:$A$${refRowCount + 1}`], "Kode harus persis sama dengan sheet Referensi Kompetensi.");
  addListValidation(ws, "E", MAX_TEMPLATE_ROWS, ['"mudah,sedang,sulit"'], "Pilih nilai dari daftar.");
  addListValidation(ws, "F", MAX_TEMPLATE_ROWS, ['"L1,L2,L3"'], "Pilih nilai dari daftar.");
  for (const col of ["T", "V", "X"]) {
    addListValidation(ws, col, MAX_TEMPLATE_ROWS, ['"Benar,Salah"'], "Isi persis Benar atau Salah.");
  }
}

function buildPetunjukSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Petunjuk");
  ws.columns = [{ width: 150 }];
  PETUNJUK_BARIS.forEach((text, idx) => {
    const cell = ws.getCell(`A${idx + 1}`);
    cell.value = text;
    cell.alignment = { vertical: "top", wrapText: true };
    if (idx === 0) {
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
    }
  });
}

function buildReferensiSheet(wb: ExcelJS.Workbook, jenjang: string, mapel: string) {
  const items = getReferensiKompetensi(jenjang, mapel);
  if (!items) throw new Error(`Referensi kompetensi untuk ${mapel} ${jenjang} belum tersedia.`);

  const ws = wb.addWorksheet("Referensi Kompetensi", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: "Kode Kompetensi", width: 22 },
    { header: "Deskripsi", width: 90 },
    { header: "Level Kognitif", width: 14 },
    { header: "Tingkat", width: 9 },
    { header: "Materi", width: 24 },
    { header: "Sub Materi", width: 34 },
  ];
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
  });

  items.forEach((item, idx) => {
    const row = ws.getRow(idx + 2);
    row.getCell(1).value = item.kode;
    row.getCell(2).value = item.deskripsi;
    row.getCell(3).value = item.levelKognitif;
    row.getCell(4).value = item.tingkat;
    row.getCell(5).value = item.materi;
    row.getCell(6).value = item.subMateri;
  });

  return items.length;
}

/**
 * Menghasilkan file .xlsx template impor untuk kombinasi jenjang+mapel tertentu.
 * Melempar Error bila referensi kompetensinya belum tersedia -- pemanggil (route API)
 * WAJIB mengecek isTemplateAvailable() dahulu agar bisa membalas 404 yang jelas.
 */
export async function generateImportTemplateXlsx(jenjang: string, mapel: string): Promise<Buffer> {
  if (!isTemplateAvailable(jenjang, mapel)) {
    throw new Error(`Referensi kompetensi untuk ${mapel} ${jenjang} belum tersedia.`);
  }
  const refRowCount = getReferensiKompetensi(jenjang, mapel)!.length;

  const wb = new ExcelJS.Workbook();
  wb.creator = "soal.ayotka.id";
  wb.created = new Date();

  // Urutan sheet mengikuti template resmi: Soal, Petunjuk, Referensi Kompetensi.
  const soalSheet = buildSoalSheet(wb);
  addKompetensiValidation(soalSheet, refRowCount);
  buildPetunjukSheet(wb);
  buildReferensiSheet(wb, jenjang, mapel);

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
