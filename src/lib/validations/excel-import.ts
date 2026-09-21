import * as XLSX from "xlsx";
import { validateLatexDelimiters } from "./latex";

/**
 * Parser & validator untuk template impor massal soal via Excel (.xlsx).
 * Struktur file WAJIB mengikuti template resmi: sheet "Soal" (data butir soal)
 * dan sheet "Referensi Kompetensi" (kamus kode kompetensi -> elemen/sub elemen/
 * kompetensi/level kognitif). Aturan lengkap ada di sheet "Petunjuk" template.
 */

const MAX_ROWS = 300;

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

const COL = Object.fromEntries(SOAL_COLUMNS.map((name, idx) => [name, idx])) as Record<
  (typeof SOAL_COLUMNS)[number],
  number
>;

const FORMAT_MAP: Record<string, "PG" | "PGK_MCMA" | "PGK_KATEGORI"> = {
  pg: "PG",
  pg_kompleks: "PGK_MCMA",
  pg_kategori: "PGK_KATEGORI",
};

const TINGKAT_MAP: Record<string, "rendah" | "sedang" | "tinggi"> = {
  mudah: "rendah",
  sedang: "sedang",
  sulit: "tinggi",
};

// Pemetaan L1/L2/L3 ke label level kognitif resmi Pusmendik, berbeda per rumpun mapel.
const LEVEL_KOGNITIF_MAP: Record<string, Record<string, string>> = {
  matematika: { L1: "Pengetahuan dan Pemahaman", L2: "Aplikasi", L3: "Penalaran" },
  bahasa: { L1: "Pemahaman Tekstual", L2: "Pemahaman Inferensial", L3: "Evaluasi dan Apresiasi" },
};

const OPSI_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

function cellStr(row: any[], colName: (typeof SOAL_COLUMNS)[number]): string {
  const v = row[COL[colName]];
  return v === undefined || v === null ? "" : String(v).trim();
}

export interface ParsedQuestionRow {
  rowNumber: number; // nomor baris di sheet Excel (untuk pesan error)
  no: string;
  bentukSoal: "PG" | "PGK_MCMA" | "PGK_KATEGORI";
  elemen: string;
  subElemen: string;
  kompetensi: string;
  levelKognitif: string;
  tingkatKesulitan: "rendah" | "sedang" | "tinggi";
  soalText: string;
  pembahasan: string;
  gambar: { tipe: "url"; url: string; deskripsi_alt: string } | null;
  opsi: Array<{ label: string; text: string }> | null;
  kunciJawaban: string[];
  pernyataan: Array<{ no: number; text: string }> | null;
  kategoriRespons: string[] | null;
}

export interface RowError {
  rowNumber: number;
  no: string;
  errors: string[];
}

export interface ExcelImportParseResult {
  ok: boolean;
  rows: ParsedQuestionRow[];
  errors: RowError[];
  fatalError?: string;
}

function getLevelKognitifMap(mapel: string): Record<string, string> {
  const isMat = mapel.toLowerCase().includes("matematika");
  return isMat ? LEVEL_KOGNITIF_MAP.matematika : LEVEL_KOGNITIF_MAP.bahasa;
}

export function parseAndValidateExcelImport(fileBuffer: Buffer, mapel: string): ExcelImportParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fileBuffer, { type: "buffer" });
  } catch (err: any) {
    return { ok: false, rows: [], errors: [], fatalError: `Gagal membaca file Excel: ${err.message}` };
  }

  const soalSheet = workbook.Sheets["Soal"];
  if (!soalSheet) {
    return { ok: false, rows: [], errors: [], fatalError: 'Sheet "Soal" tidak ditemukan di dalam file.' };
  }
  const refSheet = workbook.Sheets["Referensi Kompetensi"];
  if (!refSheet) {
    return {
      ok: false,
      rows: [],
      errors: [],
      fatalError: 'Sheet "Referensi Kompetensi" tidak ditemukan di dalam file.',
    };
  }

  const refRows: any[][] = XLSX.utils.sheet_to_json(refSheet, { header: 1, defval: "" });
  const refMap = new Map<string, { deskripsi: string; levelKognitif: string; materi: string; subMateri: string }>();
  refRows.slice(1).forEach((r) => {
    const kode = String(r[0] ?? "").trim();
    if (!kode) return;
    refMap.set(kode, {
      deskripsi: String(r[1] ?? "").trim(),
      levelKognitif: String(r[2] ?? "").trim(),
      materi: String(r[4] ?? "").trim(),
      subMateri: String(r[5] ?? "").trim(),
    });
  });

  const allRows: any[][] = XLSX.utils.sheet_to_json(soalSheet, { header: 1, defval: "" });
  const dataRows = allRows
    .slice(1)
    .map((row, idx) => ({ row, rowNumber: idx + 2 })) // +2: lewati header, Excel 1-indexed
    .filter(({ row }) => {
      const no = String(row[COL["No"]] ?? "").trim();
      const teks = String(row[COL["Teks Soal"]] ?? "").trim();
      if (no.toUpperCase() === "CONTOH") return false;
      return teks !== "";
    });

  if (dataRows.length === 0) {
    return { ok: false, rows: [], errors: [], fatalError: "Tidak ada baris soal yang terisi di sheet Soal." };
  }
  if (dataRows.length > MAX_ROWS) {
    return {
      ok: false,
      rows: [],
      errors: [],
      fatalError: `File berisi ${dataRows.length} baris soal, melebihi batas maksimal ${MAX_ROWS} soal per file.`,
    };
  }

  const levelMap = getLevelKognitifMap(mapel);
  const parsedRows: ParsedQuestionRow[] = [];
  const rowErrors: RowError[] = [];

  for (const { row, rowNumber } of dataRows) {
    const no = cellStr(row, "No");
    const errors: string[] = [];

    const formatRaw = cellStr(row, "Format").toLowerCase();
    const bentukSoal = FORMAT_MAP[formatRaw];
    if (!bentukSoal) {
      errors.push(`Kolom "Format" tidak valid: "${cellStr(row, "Format")}" (harus pg, pg_kompleks, atau pg_kategori)`);
    }

    const soalText = cellStr(row, "Teks Soal");
    if (!soalText) {
      errors.push('Kolom "Teks Soal" wajib diisi.');
    } else {
      const v = validateLatexDelimiters(soalText, "Teks Soal");
      if (!v.valid && v.error) errors.push(v.error);
    }

    const kodeKompetensi = cellStr(row, "Kode Kompetensi");
    const ref = kodeKompetensi ? refMap.get(kodeKompetensi) : undefined;
    if (!kodeKompetensi) {
      errors.push('Kolom "Kode Kompetensi" wajib diisi.');
    } else if (!ref) {
      errors.push(`Kode Kompetensi "${kodeKompetensi}" tidak ditemukan di sheet Referensi Kompetensi.`);
    }

    const tingkatRaw = cellStr(row, "Tingkat Kesulitan").toLowerCase();
    const tingkatKesulitan = TINGKAT_MAP[tingkatRaw];
    if (!tingkatKesulitan) {
      errors.push(`Kolom "Tingkat Kesulitan" tidak valid: "${cellStr(row, "Tingkat Kesulitan")}" (harus mudah, sedang, atau sulit)`);
    }

    const levelRaw = cellStr(row, "Level Kognitif").toUpperCase();
    const levelKognitif = levelMap[levelRaw];
    if (!levelKognitif) {
      errors.push(`Kolom "Level Kognitif" tidak valid: "${cellStr(row, "Level Kognitif")}" (harus L1, L2, atau L3)`);
    }

    const pembahasan = cellStr(row, "Pembahasan");
    if (pembahasan) {
      const v = validateLatexDelimiters(pembahasan, "Pembahasan");
      if (!v.valid && v.error) errors.push(v.error);
    }

    const mediaUrl = cellStr(row, "Media Soal");
    if (mediaUrl && !/^https:\/\//i.test(mediaUrl)) {
      errors.push('Kolom "Media Soal" harus berupa URL diawali "https://".');
    }

    let opsi: Array<{ label: string; text: string }> | null = null;
    let kunciJawaban: string[] = [];
    let pernyataan: Array<{ no: number; text: string }> | null = null;
    let kategoriRespons: string[] | null = null;

    if (bentukSoal === "PG" || bentukSoal === "PGK_MCMA") {
      const opsiValues = OPSI_LABELS.map((label) => ({
        label,
        text: cellStr(row, `Opsi ${label}` as (typeof SOAL_COLUMNS)[number]),
      }));
      let filledCount = 0;
      while (filledCount < opsiValues.length && opsiValues[filledCount].text !== "") filledCount++;
      const hasGapAfter = opsiValues.slice(filledCount).some((o) => o.text !== "");
      const filled = opsiValues.slice(0, filledCount);
      if (hasGapAfter) {
        errors.push("Opsi jawaban harus diisi berurutan dari Opsi A tanpa celah kosong di tengah.");
      } else if (filled.length < 2) {
        errors.push("Opsi jawaban wajib diisi minimal 2 (Opsi A, Opsi B, dst berurutan tanpa celah).");
      } else {
        opsi = filled;
      }

      const kunciRaw = cellStr(row, "Kunci Jawaban");
      if (!kunciRaw) {
        errors.push('Kolom "Kunci Jawaban" wajib diisi.');
      } else {
        const labels = kunciRaw
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
        const validLabels = new Set((opsi || []).map((o) => o.label));
        const invalid = labels.filter((l) => !validLabels.has(l));
        if (invalid.length > 0) {
          errors.push(`Kunci Jawaban "${invalid.join(", ")}" tidak ada dalam daftar opsi yang diisi.`);
        } else if (bentukSoal === "PG" && labels.length !== 1) {
          errors.push(`Bentuk "pg" wajib memiliki tepat 1 Kunci Jawaban (ditemukan: ${labels.length}).`);
        } else if (bentukSoal === "PGK_MCMA" && labels.length < 1) {
          errors.push('Bentuk "pg_kompleks" wajib memiliki minimal 1 Kunci Jawaban.');
        } else {
          kunciJawaban = labels;
        }
      }
    } else if (bentukSoal === "PGK_KATEGORI") {
      const pairs = [1, 2, 3].map((n) => ({
        text: cellStr(row, `Pernyataan ${n}` as (typeof SOAL_COLUMNS)[number]),
        jawaban: cellStr(row, `Jawaban ${n}` as (typeof SOAL_COLUMNS)[number]),
      }));
      const filled = pairs.filter((p) => p.text !== "");
      if (filled.length === 0) {
        errors.push('Bentuk "pg_kategori" wajib memiliki minimal 1 Pernyataan.');
      } else {
        const invalidJawaban = filled.filter((p) => p.jawaban !== "Benar" && p.jawaban !== "Salah");
        if (invalidJawaban.length > 0) {
          errors.push('Kolom "Jawaban" untuk pg_kategori harus persis "Benar" atau "Salah".');
        } else {
          pernyataan = filled.map((p, idx) => ({ no: idx + 1, text: p.text }));
          kunciJawaban = filled.map((p) => p.jawaban);
          kategoriRespons = ["Benar", "Salah"];
        }
      }
    }

    if (errors.length > 0) {
      rowErrors.push({ rowNumber, no, errors });
      continue;
    }

    parsedRows.push({
      rowNumber,
      no,
      bentukSoal,
      elemen: ref!.materi || "Materi Impor Excel",
      subElemen: ref!.subMateri || "",
      kompetensi: ref!.deskripsi || kodeKompetensi,
      levelKognitif,
      tingkatKesulitan,
      soalText,
      pembahasan,
      gambar: mediaUrl ? { tipe: "url", url: mediaUrl, deskripsi_alt: "" } : null,
      opsi,
      kunciJawaban,
      pernyataan,
      kategoriRespons,
    });
  }

  return { ok: rowErrors.length === 0, rows: parsedRows, errors: rowErrors };
}
