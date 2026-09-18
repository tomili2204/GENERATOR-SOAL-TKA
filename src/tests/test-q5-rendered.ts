import { repairLatexString } from "../lib/latex/latex-repair";
import katex from "katex";

function renderLatexPreview(content: string): string {
  if (!content) return "";

  const cleaned = repairLatexString(content);

  // 1. Ekstrak diagram SVG pengguna LEBIH DULU
  const svgPlaceholders: string[] = [];
  let text = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
    const placeholder = `___SVG_BLOCK_${svgPlaceholders.length}___`;
    svgPlaceholders.push(`<div class="my-3 flex justify-center overflow-x-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">${match}</div>`);
    return placeholder;
  });

  // 2. Ganti escaped dollar lebih dulu
  text = text.replace(/\\(\$)/g, "___ESCAPED_DOLLAR___");

  // 3. Render Blok Rumus: $$ ... $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      return `<div class="my-2.5 overflow-x-auto text-center py-1 bg-slate-50 border border-slate-200/60 rounded px-2">${rendered.replace(/\r?\n/g, " ")}</div>`;
    } catch (e: any) {
      return `<span class="text-rose-600 font-mono text-xs bg-rose-50 px-1 py-0.5 rounded border border-rose-200">[KaTeX Error: ${e.message}]</span>`;
    }
  });

  // 4. Render Inline Rumus: $ ... $
  text = text.replace(/\$([^\$\n]+?)\$/g, (_match, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
      // KRUSIAL: Hapus seluruh newline di dalam output KaTeX agar tidak terpecah oleh parser baris!
      return rendered.replace(/\r?\n/g, " ");
    } catch (e: any) {
      return `<span class="text-rose-600 font-mono text-xs bg-rose-50 px-1 rounded">[KaTeX Error: ${e.message}]</span>`;
    }
  });

  // 5. Kembalikan escaped dollar
  text = text.replace(/___ESCAPED_DOLLAR___/g, "$");

  // 6. Rasionalkan baris baru untuk penjelasan butir/langkah jika menyatu dalam satu kalimat
  text = text.replace(/(\.\s+|\)\s+)([A-D]:\s+|Opsi\s+[A-D]:|Langkah\s+\d+:)/g, "$1\n$2");

  // 7. Parse baris & bungkus <p>
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
      return `<p class="min-h-[1.25rem] my-1.5">${l}</p>`;
    })
    .join("");

  svgPlaceholders.forEach((svgHtml, idx) => {
    result = result.replace(`___SVG_BLOCK_${idx}___`, svgHtml);
  });

  return result;
}

const q5Input = "A: Jarak AC = $\\sqrt{120^2 + 90^2} = \\sqrt{14400 + 8100} = \\sqrt{22500} = 150$ km (Benar). B: Arah Utara dan Timur saling tegak lurus, membentuk sudut $90^\\circ$ (Benar). C: Waktu = Jarak / Kecepatan = $150 / 50 = 3$ jam (Benar). D: Jarak total = $120 + 90 = 210$ km (Benar).";

const html = renderLatexPreview(q5Input);
console.log("Total <p> tags:", (html.match(/<p /g) || []).length);
console.log("Does any <p> tag start with raw SVG path data?", html.includes("<p class=\"min-h-[1.25rem] my-1.5\">c0,-2"));
const pMatches = html.match(/<p class="min-h-[^"]+">([\s\S]*?)<\/p>/g);
console.log("\nPARAGRAPHS CREATED:");
pMatches?.forEach((p, idx) => {
  console.log(`\n--- P${idx + 1} ---`);
  console.log(p.slice(0, 80) + "... [length: " + p.length + "]");
});
