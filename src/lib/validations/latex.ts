/**
 * Validasi Delimiter KaTeX / LaTeX
 * Memastikan delimiter inline ($) dan block ($$) selalu berpasangan (berjumlah genap).
 * Delimiter yang escaped seperti \$ diabaikan dari perhitungan.
 */

import { repairLatexString } from "@/lib/latex/latex-repair";

export interface LatexValidationResult {
  valid: boolean;
  error?: string;
}

export function validateLatexDelimiters(
  text: string | undefined | null,
  fieldName: string = "Teks"
): LatexValidationResult {
  if (!text || typeof text !== "string") {
    return { valid: true };
  }

  // Bersihkan dan normalkan pembatas LaTeX sebelum validasi
  const normalized = repairLatexString(text);

  // 1. Abaikan escaped dollar signs: \$
  const unescaped = normalized.replace(/\\(\$)/g, "__ESCAPED_DOLLAR__");

  // 2. Hitung jumlah $$ (blok matematika)
  const doubleMatches = unescaped.match(/\$\$/g);
  const doubleCount = doubleMatches ? doubleMatches.length : 0;
  if (doubleCount % 2 !== 0) {
    return {
      valid: false,
      error: `Delimiter LaTeX blok ($$) pada ${fieldName} tidak berpasangan (ditemukan ${doubleCount} buah '$$'). Setiap '$$' pembuka wajib memiliki '$$' penutup.`,
    };
  }

  // 3. Hilangkan semua $$ yang sudah berpasangan untuk mengisolasi inline $
  const withoutDoubles = unescaped.replace(/\$\$/g, "");

  // 4. Hitung jumlah $ (inline matematika)
  const singleMatches = withoutDoubles.match(/\$/g);
  const singleCount = singleMatches ? singleMatches.length : 0;
  if (singleCount % 2 !== 0) {
    return {
      valid: false,
      error: `Delimiter LaTeX inline ($) pada ${fieldName} tidak berpasangan (ditemukan ${singleCount} buah '$'). Setiap '$' pembuka wajib memiliki '$' penutup.`,
    };
  }

  return { valid: true };
}
