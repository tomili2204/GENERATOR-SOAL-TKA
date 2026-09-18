"use client";

import React, { useMemo } from "react";
import katex from "katex";
import { repairLatexString } from "@/lib/latex/latex-repair";

interface LatexPreviewProps {
  content: string;
  className?: string;
}

/**
 * Komponen Utilitarian untuk me-render teks campuran Markdown sederhana dan rumus KaTeX:
 * - Blok matematika ($$ ... $$)
 * - Matematika inline ($ ... $)
 * - Tabel Markdown sederhana (| ... |)
 */
export const LatexPreview: React.FC<LatexPreviewProps> = ({ content, className = "" }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return "";

    try {
      // 0. Bersihkan dan perbaiki karakter control / LaTeX rusak
      const cleaned = repairLatexString(content);

      // 1. Ekstrak diagram SVG pengguna LEBIH DULU sebelum KaTeX me-render rumus!
      // KaTeX menggunakan tag <svg> internal untuk simbol akar (\sqrt), aksen, dan panah.
      // Jika KaTeX di-render lebih dulu, tag SVG internal KaTeX akan ikut terpecah menjadi kotak diagram terpisah.
      const svgPlaceholders: string[] = [];
      let text = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
        const placeholder = `___SVG_BLOCK_${svgPlaceholders.length}___`;
        svgPlaceholders.push(`<div class="my-3 flex justify-center overflow-x-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">${match}</div>`);
        return placeholder;
      });

      // 2. Ganti escaped dollar lebih dulu
      text = text.replace(/\\(\$)/g, "___ESCAPED_DOLLAR___");

      // 3. Render Blok Rumus: $$ ... $$ dan lindungi dengan placeholder agar tidak terpecah regex
      const displayMathPlaceholders: string[] = [];
      const inlineMathPlaceholders: string[] = [];

      text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => {
        const cleanMath = math.trim();
        // Jika math hanya berupa simbol tunggal / operator sederhana, jadikan inline agar tidak memecah baris
        if (/^(\\times|\\cdot|\\div|\\pm|[+\-=\/]|\\ne|\\approx|\\le|\\ge|<|>)$/.test(cleanMath)) {
          const placeholder = `___KATEX_INLINE_${inlineMathPlaceholders.length}___`;
          try {
            const rendered = katex.renderToString(cleanMath, {
              displayMode: false,
              throwOnError: false,
            });
            inlineMathPlaceholders.push(rendered.replace(/\r?\n/g, " "));
          } catch (e: any) {
            inlineMathPlaceholders.push(`<span class="text-rose-600 font-mono text-xs bg-rose-50 px-1 rounded">[KaTeX Error]</span>`);
          }
          return placeholder;
        }

        const placeholder = `___KATEX_DISPLAY_${displayMathPlaceholders.length}___`;
        try {
          const rendered = katex.renderToString(cleanMath, {
            displayMode: true,
            throwOnError: false,
          });
          displayMathPlaceholders.push(`<div class="my-2.5 overflow-x-auto text-center py-1 bg-slate-50 border border-slate-200/60 rounded px-2">${rendered.replace(/\r?\n/g, " ")}</div>`);
        } catch (e: any) {
          displayMathPlaceholders.push(`<span class="text-rose-600 font-mono text-xs bg-rose-50 px-1 py-0.5 rounded border border-rose-200">[KaTeX Error: ${e.message}]</span>`);
        }
        return placeholder;
      });

      // 4. Render Inline Rumus: $ ... $ dan lindungi dengan placeholder agar tidak terpecah regex
      text = text.replace(/\$([^\$\n]+?)\$/g, (_match, math) => {
        const placeholder = `___KATEX_INLINE_${inlineMathPlaceholders.length}___`;
        try {
          const rendered = katex.renderToString(math.trim(), {
            displayMode: false,
            throwOnError: false,
          });
          inlineMathPlaceholders.push(rendered.replace(/\r?\n/g, " "));
        } catch (e: any) {
          inlineMathPlaceholders.push(`<span class="text-rose-600 font-mono text-xs bg-rose-50 px-1 rounded">[KaTeX Error: ${e.message}]</span>`);
        }
        return placeholder;
      });

      // 5. Kembalikan escaped dollar
      text = text.replace(/___ESCAPED_DOLLAR___/g, "$");

      // 6. Rasionalkan baris baru agar simbol dan narasi penjelasan tersusun rapi ke bawah
      // (a) Pecah baris sebelum penomoran butir: 1) ..., 2) ... atau 1. ..., 2. ... atau (1) ...
      // Perhatian: Simbol ':' TIDAK dimasukkan sebagai pemecah agar rasio/waktu seperti (40 : 10) atau 08:30 tidak terpecah
      text = text.replace(/([\.\)\;\!\?]|benar|salah|tepat)\s+(?=(?:Pernyataan\s+|Langkah\s+)?(?:\d+[\)\.\-]\s+|\(\d+\)\s+|\[\d+\]\s+))/gi, "$1\n\n");

      // (b) Pecah baris sebelum label opsi: A), B), C), D) / A., B. / A: / (A) / [A] / Opsi A / Pilihan A
      text = text.replace(/([\.\)\;\!\?]|benar|salah|tepat|\d)\s+(?=(?:Opsi\s+|Pilihan\s+|Pernyataan\s+)?[A-E][\)\.\:\-]\s+|\([A-E]\)\s+|\[[A-E]\]\s+)/gi, "$1\n\n");

      // (c) Pecah baris sebelum tahapan/langkah: Langkah 1:, Pernyataan 1:, Tahap 1:, Kasus 1:
      text = text.replace(/([\.\)\;\!\?]|benar|salah|tepat|___KATEX_INLINE_\d+___)\s+(?=(?:Langkah|Pernyataan|Tahap|Kasus)\s+\d+[:\.\s])/gi, "$1\n\n");

      // (d) Pecah baris sebelum kata kunci struktur: Diketahui, Ditanya, Jawab, Penyelesaian, Rumus, Simpulan
      text = text.replace(/([\.\)\;\!\?]|benar|salah|tepat|___KATEX_INLINE_\d+___)\s+(?=(?:Diketahui|Ditanya|Dijawab|Penyelesaian|Rumus|Analisis|Simpulan|Kesimpulan)[:\s])/gi, "$1\n\n");

      // (e) Pecah baris sebelum perhitungan matematis utama (asalkan bukan label opsi seperti A. atau 1.)
      text = text.replace(/(?<!\b[A-Ea-e]\b|\b\d{1,2}\b)(\.|\))\s+(?=(?:Luas|Keliling|Volume|Panjang|Lebar|Tinggi|Jari-jari|Diameter)\s+[^.]+?=)/gi, "$1\n");

      // (f) Pecah baris untuk kalimat deduksi lanjutan: Selisih ..., Maka ..., Sehingga ..., Jadi ...
      text = text.replace(/([\.\)\;\!\?]|benar|salah|tepat)\s+(?=(?:Selisih|Maka|Sehingga|Jadi|Dengan demikian|Berdasarkan perhitungan)\s+)/gi, "$1\n");

      // (g) Pecah baris sebelum catatan dalam kurung: (Koreksi: ...), (Catatan: ...)
      text = text.replace(/\s+(?=\((?:Koreksi|Catatan):)/gi, "\n");

      // (h) Dukungan Markdown tebal (**teks**) dan miring (*teks*)
      text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");

      // (i) Beri highlight lembut untuk penanda validitas (Benar) dan (Salah) jika ada
      text = text.replace(/\((?:Benar|Tepat)\)/gi, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 ml-1 font-sans">Benar</span>');
      text = text.replace(/\((?:Salah|Tidak Tepat|Keliru)\)/gi, '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 ml-1 font-sans">Salah</span>');

      // (j) Tebalkan label opsi di awal baris agar mudah dibedakan (misal: A), B) atau 1), 2))
      text = text.replace(/(^|\n+)((?:Opsi\s+|Pilihan\s+|Pernyataan\s+)?[A-E][\)\.\:\-]\s*|\([A-E]\)\s*|\[[A-E]\]\s*)/gi, "$1<strong>$2</strong>");

      // 7. Parse Markdown Tables sederhana jika ada baris bertanda pipe (|)
      const lines = text.split("\n");
      const processedLines: string[] = [];
      let inTable = false;
      let tableRows: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("|") && line.endsWith("|")) {
          inTable = true;
          tableRows.push(line);
        } else {
          if (inTable) {
            processedLines.push(convertMarkdownTable(tableRows));
            tableRows = [];
            inTable = false;
          }
          if (line.length > 0) {
            const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (headingMatch) {
              const level = headingMatch[1].length;
              const headingText = headingMatch[2];
              const headingClasses: Record<number, string> = {
                1: "text-base font-bold text-slate-900 mt-2 mb-1.5",
                2: "text-[14px] font-bold text-slate-900 mt-2 mb-1",
                3: "text-[13.5px] font-bold text-slate-800 mt-1.5 mb-1",
                4: "text-xs font-bold text-slate-800 mt-1 mb-0.5",
                5: "text-xs font-semibold text-slate-700 mt-0.5",
                6: "text-xs font-semibold text-slate-600 mt-0.5",
              };
              const cls = headingClasses[level] || headingClasses[3];
              processedLines.push(`<div class="${cls}">${headingText}</div>`);
            } else if (/^[-*_]{3,}$/.test(line)) {
              processedLines.push('<hr class="my-3 border-slate-200" />');
            } else if (/^[-*•]\s+(.*)$/.test(line)) {
              const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
              processedLines.push(`<div class="flex items-start gap-2 ml-1 my-0.5"><span class="text-slate-400 select-none leading-relaxed">•</span><span class="flex-1">${bulletMatch ? bulletMatch[1] : line}</span></div>`);
            } else {
              processedLines.push(line);
            }
          }
        }
      }
      if (inTable && tableRows.length > 0) {
        processedLines.push(convertMarkdownTable(tableRows));
      }

      // 8. Gabungkan baris paragraf
      let result = processedLines
        .map((l) => {
          if (
            l.startsWith("<div") ||
            l.startsWith("<table") ||
            l.startsWith("<hr") ||
            l.startsWith("___SVG_BLOCK_") ||
            l.startsWith("___KATEX_DISPLAY_")
          ) {
            return l;
          }
          return `<p class="min-h-[1.25rem] my-1.5 leading-relaxed">${l}</p>`;
        })
        .join("");

      // 9. Pulihkan placeholder dengan aman menggunakan replacer callback
      inlineMathPlaceholders.forEach((html, idx) => {
        result = result.replace(new RegExp(`___KATEX_INLINE_${idx}___`, "g"), () => html);
      });

      displayMathPlaceholders.forEach((html, idx) => {
        result = result.replace(new RegExp(`___KATEX_DISPLAY_${idx}___`, "g"), () => html);
      });

      svgPlaceholders.forEach((svgHtml, idx) => {
        result = result.replace(new RegExp(`___SVG_BLOCK_${idx}___`, "g"), () => svgHtml);
      });

      return result;
    } catch (err: any) {
      return `<p class="text-rose-500 text-xs">Gagal me-render pratinjau: ${err.message}</p>`;
    }
  }, [content]);

  return (
    <div
      className={`prose prose-sm max-w-none text-slate-800 text-[13.5px] leading-relaxed select-text font-sans ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

function convertMarkdownTable(rows: string[]): string {
  if (rows.length === 0) return "";
  let html = `<div class="my-3 overflow-x-auto border border-slate-200 rounded"><table class="w-full text-left text-xs border-collapse">`;

  const isDivider = (str: string) => /^\|(\s*:?-+:?\s*\|)+$/.test(str.trim());

  let headerRendered = false;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx].trim();
    if (isDivider(row)) {
      continue;
    }

    const cells = row
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    if (!headerRendered && idx === 0) {
      html += `<thead class="bg-slate-100/80 font-medium text-slate-700 border-b border-slate-200"><tr>`;
      cells.forEach((c) => {
        html += `<th class="py-2 px-3">${c}</th>`;
      });
      html += `</tr></thead><tbody>`;
      headerRendered = true;
    } else {
      if (!headerRendered) {
        html += `<tbody>`;
        headerRendered = true;
      }
      const bg = idx % 2 === 0 ? "bg-white" : "bg-slate-50/50";
      html += `<tr class="${bg} border-b border-slate-100 last:border-b-0">`;
      cells.forEach((c) => {
        html += `<td class="py-1.5 px-3 text-slate-600">${c}</td>`;
      });
      html += `</tr>`;
    }
  }

  html += `</tbody></table></div>`;
  return html;
}
