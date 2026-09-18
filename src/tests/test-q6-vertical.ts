import { repairLatexString } from "../lib/latex/latex-repair";
import katex from "katex";

function renderLatexPreview(content: string): string {
  if (!content) return "";

  const cleaned = repairLatexString(content);

  const svgPlaceholders: string[] = [];
  let text = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
    const placeholder = `___SVG_BLOCK_${svgPlaceholders.length}___`;
    svgPlaceholders.push(`<div class="my-3 flex justify-center overflow-x-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">${match}</div>`);
    return placeholder;
  });

  text = text.replace(/\\(\$)/g, "___ESCAPED_DOLLAR___");

  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      return `<div class="my-2.5 overflow-x-auto text-center py-1 bg-slate-50 border border-slate-200/60 rounded px-2">${rendered.replace(/\r?\n/g, " ")}</div>`;
    } catch (e: any) {
      return `<span class="text-rose-600 font-mono text-xs bg-rose-50 px-1 py-0.5 rounded border border-rose-200">[KaTeX Error: ${e.message}]</span>`;
    }
  });

  text = text.replace(/\$([^\$\n]+?)\$/g, (_match, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      return rendered.replace(/\r?\n/g, " ");
    } catch (e: any) {
      return `<span class="text-rose-600 font-mono text-xs bg-rose-50 px-1 rounded">[KaTeX Error: ${e.message}]</span>`;
    }
  });

  text = text.replace(/___ESCAPED_DOLLAR___/g, "$");

  // Rasionalkan baris baru agar pernyataan matematika tersusun ke bawah
  text = text.replace(/(\.|\))\s+(?=\d+[\)\.]\s+)/g, "$1\n\n");
  text = text.replace(/(\.|\))\s+(?=[A-D]:\s+|Opsi\s+[A-D]:)/g, "$1\n\n");
  text = text.replace(/(\.|\))\s+(?=(?:Langkah|Pernyataan|Tahap|Kasus)\s+\d+[:\.\s])/gi, "$1\n\n");
  text = text.replace(/(\.|\))\s+(?=(?:Diketahui|Ditanya|Dijawab|Penyelesaian|Rumus|Analisis|Simpulan|Kesimpulan)[:\s])/gi, "$1\n\n");
  text = text.replace(/(\.|\))\s+(?=(?:Selisih|Maka|Sehingga|Jadi|Dengan demikian|Berdasarkan perhitungan)\s+)/gi, "$1\n");
  text = text.replace(/\s+(?=\((?:Koreksi|Catatan):)/gi, "\n");

  const lines = text.split("\n");
  const processedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      processedLines.push(line);
    }
  }

  let result = processedLines
    .map((l) => {
      if (l.startsWith("<div") || l.startsWith("<table") || l.startsWith("___SVG_BLOCK_")) {
        return l;
      }
      return `<p class="min-h-[1.25rem] my-1.5 leading-relaxed">${l}</p>`;
    })
    .join("");

  svgPlaceholders.forEach((svgHtml, idx) => {
    result = result.replace(`___SVG_BLOCK_${idx}___`, svgHtml);
  });

  return result;
}

const inputQ6 = "Pola: $a=15, b=4$. 1) $U_{10} = 15 + (10-1)4 = 15 + 36 = 51$ (Benar). 2) $U_{20} = 15 + (19)4 = 15 + 76 = 91$. Selisih $U_{20} - U_1 = 91 - 15 = 76$ (Benar). 3) $S_{20} = \\frac{20}{2}(2(15) + (19)4) = 10(30 + 76) = 10(106) = 1.060$. (Koreksi: Perhitungan benar, maka pernyataan 3 Benar. Kunci diperbarui).";

const html = renderLatexPreview(inputQ6);
const pTags = html.match(/<p class="min-h-[^"]+">([\s\S]*?)<\/p>/g);
console.log("Total paragraphs:", pTags?.length);
pTags?.forEach((p, idx) => {
  // Strip tags for preview
  const textOnly = p.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  console.log(`\n[Line ${idx + 1}]:`, textOnly);
});
