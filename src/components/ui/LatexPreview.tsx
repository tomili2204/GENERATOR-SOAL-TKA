"use client";

import React, { useMemo } from "react";
import katex from "katex";
import { repairLatexString } from "@/lib/latex/latex-repair";

interface LatexPreviewProps {
  content: string;
  className?: string;
  isPembahasan?: boolean;
}

/**
 * Komponen Utilitarian untuk me-render teks campuran Markdown sederhana dan rumus KaTeX:
 * - Blok matematika ($$ ... $$)
 * - Matematika inline ($ ... $)
 * - Tabel Markdown sederhana (| ... |)
 * - Format khusus pembahasan dan solusi hanya aktif jika isPembahasan={true}
 */
export const LatexPreview: React.FC<LatexPreviewProps> = ({
  content,
  className = "",
  isPembahasan = false,
}) => {
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

      // 1b. Ekstrak gambar bertanda Markdown ![alt](url) sebelum proses teks lain (mis. impor Excel
      // yang menyisipkan gambar langsung di dalam teks soal/opsi, bukan lewat field "gambar" terpisah).
      const imgPlaceholders: string[] = [];
      text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_match, alt, url) => {
        const placeholder = `___IMG_BLOCK_${imgPlaceholders.length}___`;
        const safeAlt = String(alt || "Ilustrasi").replace(/"/g, "&quot;");
        imgPlaceholders.push(
          `<img src="${url}" alt="${safeAlt}" class="max-w-full max-h-72 mx-auto my-2 rounded-lg border border-slate-200 object-contain block" />`
        );
        return placeholder;
      });

      // 1c. Buang tag BBCode sisa dari sumber lain (mis. [center]...[/center]) yang tidak didukung di sini
      text = text.replace(/\[\/?(?:center|b|i|u)\]/gi, "");

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

      // Format khusus pembahasan dan solusi HANYA aktif jika isPembahasan={true}
      // Teks soal, stimulus, dan opsi jawaban (op.text) TIDAK akan tersentuh oleh aturan penataan pembahasan!
      if (isPembahasan) {
        const badgeBenar = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80 align-middle select-none">✓ Benar</span>';
        const badgeSalah = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11.5px] font-bold bg-rose-100 text-rose-800 border border-rose-300/80 align-middle select-none">✗ Salah</span>';

        // (a) Normalisasi butir nomor yang memuat evaluasi pernyataan di ujungnya
        // Contoh: "1. Jangkauan ... (homogen). Pernyataan 1 BENAR."
        // Diubah menjadi satu kesatuan rapi: "Pernyataan 1: Jangkauan ... (homogen). [✓ Benar]"
        text = text.replace(/(^|\n+)\s*(\d+)[\.\)]\s*(.*?)(?:[\.\,\;]?\s*(?:maka|sehingga|berarti)?\s*Pernyataan\s+\2\s+(?:adalah\s+)?(BENAR|SALAH|Benar|Salah)\.?\s*)$/gim,
          (_match, prefix, num, content, verdict) => {
            const isBenar = /benar/i.test(verdict);
            const badge = isBenar ? badgeBenar : badgeSalah;
            return `${prefix}Pernyataan ${num}: ${content.trim()}. ${badge}`;
          }
        );

        // (b) Rasionalkan baris baru agar narasi pembahasan tersusun rapi ke bawah
        text = text.replace(/(?<!\b[A-Ea-e]\b|\b\d{1,2}\b)([\.\)\;\!\?]|benar|salah|tepat)\s+(?=(?:Pernyataan\s+|Langkah\s+)?(?:\d+[\)\.\-]\s+|\(\d+\)\s+|\[\d+\]\s+))/gi, "$1\n\n");
        text = text.replace(/(?<!\b[A-Ea-e]\b|\b\d{1,2}\b)([\.\)\;\!\?]|benar|salah|tepat|\d)\s+(?=(?:Opsi\s+|Pilihan\s+|Pernyataan\s+)?[A-E][\)\.\:\-]\s+|\([A-E]\)\s+|\[[A-E]\]\s+)/gi, "$1\n\n");
        text = text.replace(/(?<!\b[A-Ea-e]\b|\b\d{1,2}\b)([\.\)\;\!\?]|benar|salah|tepat|___KATEX_INLINE_\d+___)\s+(?=(?:Langkah|Tahap|Kasus)\s+\d+[:\.\s]|Pernyataan\s+\d+[:\.\s](?!(?:adalah\s+)?(?:BENAR|SALAH|Benar|Salah)\b))/gi, "$1\n\n");
        text = text.replace(/(?<!\b[A-Ea-e]\b|\b\d{1,2}\b)([\.\)\;\!\?]|benar|salah|tepat|___KATEX_INLINE_\d+___)\s+(?=(?:Diketahui|Ditanya|Dijawab|Penyelesaian|Rumus|Analisis|Simpulan|Kesimpulan)[:\s])/gi, "$1\n\n");
        text = text.replace(/(?<!\b[A-Ea-e]\b|\b\d{1,2}\b)(\.|\))\s+(?=(?:Luas|Keliling|Volume|Panjang|Lebar|Tinggi|Jari-jari|Diameter)\s+[^.]+?=)/gi, "$1\n");
        text = text.replace(/(?<!\b[A-Ea-e]\b|\b\d{1,2}\b)([\.\)\;\!\?]|benar|salah|tepat)\s+(?=(?:Jadi[:,\s]+(?:pernyataan|jawaban|opsi|pilihan|kunci)|Kesimpulan|Simpulan)[:\s])/gi, "$1\n\n");
        text = text.replace(/\s+(?=\((?:Koreksi|Catatan):)/gi, "\n");

        // (c) Bersihkan penomoran ganda redundan (misal: "1. Opsi A:" -> "Opsi A:")
        text = text.replace(/(^|\n+)\s*\d+[\.\)]\s*(?=(?:Opsi|Pilihan|Pernyataan)\s+[A-E0-9]+[:\.\)\-]|Opsi\s+\d+|Pilihan\s+\d+)/gi, "$1");
        text = text.replace(/(^|\n+)\s*\d+[\.\)]\s*(?=[A-E][\.\)][\s:])/g, "$1");

        // Format umum Pernyataan X: BENAR / SALAH yang berdiri sendiri
        text = text.replace(/Pernyataan\s+(\d+)[:\s]+(BENAR|SALAH)\.?/gi, (_m, num, verdict) => {
          const isBenar = /benar/i.test(verdict);
          const badge = isBenar ? badgeBenar : badgeSalah;
          return `Pernyataan ${num}: ${badge}`;
        });

        // (d) Beri badge visual modern untuk penanda validitas Benar dan Salah
        text = text.replace(/[\(\[](?:Benar|Tepat|BENAR)[\)\]]/g, badgeBenar);
        text = text.replace(/[\(\[](?:Salah|Tidak Tepat|Keliru|SALAH)[\)\]]/g, badgeSalah);
        text = text.replace(/(?<![-a-zA-Z])(?<=\.|\))\s*\b(BENAR)\b\.?(?!\-)(?=\s*(?:$|\n|<))/g, ` ${badgeBenar}`);
        text = text.replace(/(?<![-a-zA-Z])(?<=\.|\))\s*\b(SALAH)\b\.?(?!\-)(?=\s*(?:$|\n|<))/g, ` ${badgeSalah}`);
        text = text.replace(/(?<![-a-zA-Z])(?<=\:|\-\>|\—|\–)\s*\b(Benar|Tepat|BENAR)\b\.?(?!\-)(?=\s*(?:$|\n|<))/g, ` ${badgeBenar}`);
        text = text.replace(/(?<![-a-zA-Z])(?<=\:|\-\>|\—|\–)\s*\b(Salah|Tidak Tepat|Keliru|SALAH)\b\.?(?!\-)(?=\s*(?:$|\n|<))/g, ` ${badgeSalah}`);
        text = text.replace(/(?<![-a-zA-Z])(?<=\.\s*)\b(Benar|Salah)\b\.?(?!\-)(?=\s*(?:$|\n|<))/g, (_m, word) => word.toLowerCase() === 'benar' ? ` ${badgeBenar}` : ` ${badgeSalah}`);
      }

      // Dukungan Markdown tebal (**teks**) dan miring (*teks*)
      text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");

      // 7. Parse Markdown Tables sederhana jika ada baris bertanda pipe (|)
      const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      const processedLines: string[] = [];
      let inTable = false;
      let tableRows: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isLastLine = i === lines.length - 1;

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
            } else if (isPembahasan) {
              // Aturan khusus hanya untuk komponen PEMBAHASAN:
              // Butir opsi jawaban / analisis pernyataan
              // WAJIB ada pemisah tanda baca titik/kurung setelah huruf opsi (contoh: "A. " atau "Opsi A:")
              // Tidak akan mencocokkan kata biasa seperti "Bulux" atau "Berdasarkan"
              const optionMatch = line.match(/^(?:<strong>)?(?:(Opsi|Pilihan|Pernyataan)\s+([A-E0-9]+)[:\.\)\-]?|([A-E])[\.\)])(?:<\/strong>)?\s+(.*)$/i);
              if (optionMatch) {
                const label = optionMatch[1] && optionMatch[2]
                  ? `${optionMatch[1]} ${optionMatch[2]}`
                  : `Opsi ${optionMatch[3]}`;
                const body = optionMatch[4].replace(/^<\/strong>[:\s]*/, "");
                processedLines.push(
                  `<div class="flex items-start gap-2.5 my-2.5 pl-0.5 group">` +
                    `<span class="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/90 shrink-0 mt-0.5 select-none shadow-xs group-hover:bg-slate-200/70 transition-colors">${label}</span>` +
                    `<div class="flex-1 leading-relaxed min-w-0">${body}</div>` +
                  `</div>`
                );
                continue;
              }

              // Butir langkah berurutan (1. ..., 2. ...)
              const numberedMatch = line.match(/^(?:<strong>)?(\d{1,2})[\.\)](?:<\/strong>)?\s+(.*)$/);
              if (numberedMatch) {
                const num = numberedMatch[1];
                const body = numberedMatch[2].replace(/^<\/strong>[:\s]*/, "");
                processedLines.push(
                  `<div class="flex items-start gap-2.5 my-1.5 pl-0.5">` +
                    `<span class="font-bold text-slate-600 shrink-0 min-w-[1.25rem] text-right select-none pt-px">${num}.</span>` +
                    `<div class="flex-1 leading-relaxed min-w-0">${body}</div>` +
                  `</div>`
                );
                continue;
              }

              // Kesimpulan hanya untuk penutup akhir atau format resmi kesimpulan
              const isConclusion = (
                isLastLine && /^(?:Jadi|Dengan demikian)[:\s,]/i.test(line)
              ) || /^(?:Jadi[:,\s]+(?:pernyataan|jawaban|opsi|pilihan|kunci)|Kesimpulan|Simpulan)[:\s]/i.test(line);

              if (isConclusion) {
                processedLines.push(
                  `<div class="my-3 p-3 bg-indigo-50/60 border-l-4 border-indigo-500 rounded-r-lg text-slate-800 text-[13px] leading-relaxed font-medium shadow-xs">` +
                    line +
                  `</div>`
                );
                continue;
              }

              processedLines.push(line);
            } else {
              // Jika BUKAN pembahasan (soal, opsi, stimulus):
              // Tampilkan baris biasa secara murni tanpa penataan butir
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
            l.startsWith("___IMG_BLOCK_") ||
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

      imgPlaceholders.forEach((imgHtml, idx) => {
        result = result.replace(new RegExp(`___IMG_BLOCK_${idx}___`, "g"), () => imgHtml);
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
