import { validateLatexDelimiters } from "./latex";
import { validateAndRepairSvg } from "./svg";
import {
  JenjangType,
  BentukSoalType,
  JenisSoalType,
  TingkatKesulitanType,
} from "@/db/schema";
import { normalizeJenjang } from "@/lib/jenjang-utils";

export const ALLOWED_JENJANG: string[] = ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"];
export const ALLOWED_BENTUK_SOAL: BentukSoalType[] = ["PG", "PGK_MCMA", "PGK_KATEGORI"];
export const ALLOWED_JENIS_SOAL: JenisSoalType[] = ["tunggal", "grup"];
export const ALLOWED_TINGKAT_KESULITAN: TingkatKesulitanType[] = ["rendah", "sedang", "tinggi"];

export const LEVEL_KOGNITIF_MATEMATIKA = [
  "Pengetahuan dan Pemahaman",
  "Aplikasi",
  "Penalaran",
] as const;

export const LEVEL_KOGNITIF_BAHASA = [
  "Pemahaman Tekstual",
  "Pemahaman Inferensial",
  "Evaluasi dan Apresiasi",
] as const;

export interface ValidateQuestionInput {
  jenjang: string;
  mapel: string;
  elemen: string;
  sub_elemen?: string;
  kompetensi: string;
  level_kognitif: string;
  tingkat_kesulitan: string;
  bentuk_soal: string;
  jenis_soal: string;
  stimulus_id?: string | null;
  soal_text: string;
  pembahasan: string;
  gambar?: {
    tipe: "svg" | "url" | "perlu_ilustrasi";
    svg_content?: string;
    url?: string;
    deskripsi_alt: string;
  } | null;
  opsi?: Array<{ label: string; text: string }>;
  pernyataan?: Array<{ no: number; text: string }>;
  kategori_respons?: string[];
  kunci_jawaban: string[];
}

export interface ValidationOutput {
  valid: boolean;
  errors: string[];
}

/**
 * Validasi Komprehensif Backend untuk Pembuatan & Pembaruan Objek Soal
 */
export function validateQuestionData(data: Partial<ValidateQuestionInput>): ValidationOutput {
  const errors: string[] = [];

  // 1. Validasi & Normalisasi Jenjang
  if (data.jenjang) {
    data.jenjang = normalizeJenjang(data.jenjang) as any;
  }
  if (!data.jenjang || !ALLOWED_JENJANG.includes(data.jenjang)) {
    errors.push(`Jenjang wajib dipilih dari: ${ALLOWED_JENJANG.join(", ")}.`);
  }

  // 2. Validasi Mapel
  if (!data.mapel || typeof data.mapel !== "string" || data.mapel.trim() === "") {
    errors.push("Mata pelajaran (mapel) wajib diisi.");
  }

  // 3. Validasi Elemen, Sub Elemen, Kompetensi
  if (!data.elemen || data.elemen.trim() === "") {
    errors.push("Elemen materi wajib diisi.");
  }
  if (!data.sub_elemen || data.sub_elemen.trim() === "") {
    errors.push("Sub elemen wajib diisi.");
  }
  if (!data.kompetensi || data.kompetensi.trim() === "") {
    errors.push("Redaksi kompetensi dari kisi-kisi wajib diisi.");
  }

  // 4. Validasi Level Kognitif sesuai Mapel
  if (!data.level_kognitif || data.level_kognitif.trim() === "") {
    errors.push("Level kognitif wajib dipilih.");
  } else {
    const isMatematika = data.mapel?.toLowerCase().includes("matematika");
    const isBahasa = data.mapel?.toLowerCase().includes("bahasa");

    if (isMatematika && !LEVEL_KOGNITIF_MATEMATIKA.includes(data.level_kognitif as any)) {
      errors.push(
        `Untuk mata pelajaran Matematika, level kognitif harus salah satu dari: ${LEVEL_KOGNITIF_MATEMATIKA.join(", ")}.`
      );
    } else if (isBahasa && !LEVEL_KOGNITIF_BAHASA.includes(data.level_kognitif as any)) {
      errors.push(
        `Untuk mata pelajaran Bahasa Indonesia, level kognitif harus salah satu dari: ${LEVEL_KOGNITIF_BAHASA.join(", ")}.`
      );
    }
  }

  // 5. Validasi Tingkat Kesulitan
  if (!data.tingkat_kesulitan || !ALLOWED_TINGKAT_KESULITAN.includes(data.tingkat_kesulitan as any)) {
    errors.push(`Tingkat kesulitan wajib dipilih dari: ${ALLOWED_TINGKAT_KESULITAN.join(", ")}.`);
  }

  // 6. Validasi Bentuk Soal
  if (!data.bentuk_soal || !ALLOWED_BENTUK_SOAL.includes(data.bentuk_soal as any)) {
    errors.push(`Bentuk soal wajib dipilih dari: ${ALLOWED_BENTUK_SOAL.join(", ")}.`);
  }

  // 7. Validasi Jenis Soal & Stimulus ID
  if (!data.jenis_soal || !ALLOWED_JENIS_SOAL.includes(data.jenis_soal as any)) {
    errors.push(`Jenis soal wajib dipilih dari: ${ALLOWED_JENIS_SOAL.join(", ")}.`);
  } else {
    if (data.jenis_soal === "grup") {
      if (!data.stimulus_id || data.stimulus_id.trim() === "") {
        errors.push("Untuk soal bertipe 'grup', stimulus_id wajib diisi / dipilih.");
      }
    } else if (data.jenis_soal === "tunggal") {
      if (data.stimulus_id && data.stimulus_id.trim() !== "") {
        errors.push("Untuk soal bertipe 'tunggal', stimulus_id harus bernilai null / tidak diisi.");
      }
    }
  }

  // 8. Validasi Teks Soal & LaTeX
  if (!data.soal_text || data.soal_text.trim() === "") {
    errors.push("Teks soal wajib diisi.");
  } else {
    const latexCheck = validateLatexDelimiters(data.soal_text, "Teks Soal");
    if (!latexCheck.valid && latexCheck.error) {
      errors.push(latexCheck.error);
    }
  }

  // 9. Validasi Pembahasan & LaTeX
  if (!data.pembahasan || data.pembahasan.trim() === "") {
    errors.push("Pembahasan soal wajib diisi.");
  } else {
    const latexCheck = validateLatexDelimiters(data.pembahasan, "Pembahasan");
    if (!latexCheck.valid && latexCheck.error) {
      errors.push(latexCheck.error);
    }
  }

  // 10. Validasi Struktur Spesifik Berdasarkan Bentuk Soal
  const bentuk = data.bentuk_soal as BentukSoalType;
  const kunciJawaban = Array.isArray(data.kunci_jawaban) ? data.kunci_jawaban : [];

  if (bentuk === "PG" || bentuk === "PGK_MCMA") {
    if (!Array.isArray(data.opsi) || data.opsi.length < 2) {
      errors.push("Pilihan opsi jawaban wajib diisi minimal 2 opsi (disarankan 4 atau 5).");
    } else {
      const labels = new Set<string>();
      data.opsi.forEach((op, idx) => {
        if (!op.label || op.label.trim() === "") {
          errors.push(`Label opsi ke-${idx + 1} tidak boleh kosong.`);
        } else {
          labels.add(op.label.trim());
        }

        if (!op.text || op.text.trim() === "") {
          errors.push(`Teks pada opsi ${op.label || idx + 1} tidak boleh kosong.`);
        } else {
          const check = validateLatexDelimiters(op.text, `Opsi ${op.label || idx + 1}`);
          if (!check.valid && check.error) {
            errors.push(check.error);
          }
        }
      });

      if (bentuk === "PG") {
        if (kunciJawaban.length !== 1) {
          errors.push(`Untuk soal Pilihan Ganda (PG), kunci_jawaban harus berisi tepat 1 label (ditemukan: ${kunciJawaban.length}).`);
        } else if (!labels.has(kunciJawaban[0])) {
          errors.push(`Kunci jawaban "${kunciJawaban[0]}" tidak ditemukan di dalam daftar label opsi.`);
        }
      } else if (bentuk === "PGK_MCMA") {
        if (kunciJawaban.length < 1) {
          errors.push("Untuk soal PGK MCMA (Pilihan Ganda Kompleks Multi-Jawaban), kunci_jawaban harus berisi minimal 1 label.");
        } else {
          for (const ans of kunciJawaban) {
            if (!labels.has(ans)) {
              errors.push(`Kunci jawaban "${ans}" tidak ditemukan di dalam daftar label opsi.`);
            }
          }
        }
      }
    }
  } else if (bentuk === "PGK_KATEGORI") {
    const pernyataan = Array.isArray(data.pernyataan) ? data.pernyataan : [];
    const kategori = Array.isArray(data.kategori_respons) ? data.kategori_respons : [];

    if (pernyataan.length === 0) {
      errors.push("Untuk soal PGK Kategori, daftar pernyataan wajib diisi minimal 1 baris.");
    }
    if (kategori.length < 2) {
      errors.push("Untuk soal PGK Kategori, kategori respons wajib diisi minimal 2 pilihan (contoh: Benar / Salah).");
    }

    pernyataan.forEach((item, idx) => {
      if (!item.text || item.text.trim() === "") {
        errors.push(`Pernyataan nomor ${item.no || idx + 1} tidak boleh kosong.`);
      } else {
        const check = validateLatexDelimiters(item.text, `Pernyataan No. ${item.no || idx + 1}`);
        if (!check.valid && check.error) {
          errors.push(check.error);
        }
      }
    });

    // Aturan wajib backend:
    // 1. Panjang kunci_jawaban pada PGK_KATEGORI harus sama dengan panjang pernyataan.
    if (kunciJawaban.length !== pernyataan.length) {
      errors.push(
        `Panjang kunci_jawaban pada PGK_KATEGORI (${kunciJawaban.length}) harus sama dengan panjang pernyataan (${pernyataan.length}).`
      );
    }

    // 2. Tiap elemen kunci_jawaban pada PGK_KATEGORI harus salah satu nilai di kategori_respons.
    const validKategoriSet = new Set(kategori.map((k) => k.trim()));
    kunciJawaban.forEach((ans, idx) => {
      if (!validKategoriSet.has(ans?.trim())) {
        errors.push(
          `Kunci jawaban baris ke-${idx + 1} ("${ans}") tidak valid. Harus salah satu dari kategori: [${kategori.join(", ")}].`
        );
      }
    });
  }

  // 11. Validasi & Perbaikan Otomatis Ilustrasi SVG (anti-tag berbahaya & anti-markup rusak)
  if (data.gambar && data.gambar.tipe === "svg") {
    const svgResult = validateAndRepairSvg(data.gambar.svg_content);
    if (!svgResult.content) {
      errors.push(`Ilustrasi SVG tidak valid: ${svgResult.issues.join("; ")}`);
    } else {
      data.gambar.svg_content = svgResult.content;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
