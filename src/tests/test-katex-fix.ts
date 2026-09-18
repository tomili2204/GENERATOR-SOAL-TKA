import { repairLatexString } from "../lib/latex/latex-repair";
import katex from "katex";

function renderLatexPreview(content: string): string {
  if (!content) return "";

  const cleaned = repairLatexString(content);

  // 1. Ekstrak diagram SVG pengguna LEBIH DULU sebelum KaTeX me-render rumus!
  // KaTeX menggunakan tag <svg> internal untuk akar (\sqrt), wide hat, dsb.
  const svgPlaceholders: string[] = [];
  let text = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
    const placeholder = `___SVG_BLOCK_${svgPlaceholders.length}___`;
    svgPlaceholders.push(`<div class="my-3 flex justify-center overflow-x-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">${match}</div>`);
    return placeholder;
  });

  // 2. Ganti escaped dollar
  text = text.replace(/\\(\$)/g, "___ESCAPED_DOLLAR___");

  // 3. Render Blok Rumus: $$ ... $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => {
    try {
      return `<div class="my-2.5 overflow-x-auto text-center py-1 bg-slate-50 border border-slate-200/60 rounded px-2">${katex.renderToString(
        math.trim(),
        { displayMode: true, throwOnError: false }
      )}</div>`;
    } catch (e: any) {
      return `<span class="text-rose-600 font-mono text-xs bg-rose-50 px-1 py-0.5 rounded border border-rose-200">[KaTeX Error: ${e.message}]</span>`;
    }
  });

  // 4. Render Inline Rumus: $ ... $
  text = text.replace(/\$([^\$\n]+?)\$/g, (_match, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch (e: any) {
      return `<span class="text-rose-600 font-mono text-xs bg-rose-50 px-1 rounded">[KaTeX Error: ${e.message}]</span>`;
    }
  });

  // 5. Kembalikan escaped dollar
  text = text.replace(/___ESCAPED_DOLLAR___/g, "$");

  // 6. Parse baris & kembalikan SVG
  const lines = text.split("\n");
  let result = lines.map((l) => `<p>${l || "&nbsp;"}</p>`).join("");
  svgPlaceholders.forEach((svgHtml, idx) => {
    result = result.replace(`___SVG_BLOCK_${idx}___`, svgHtml);
  });

  return result;
}

const q5Input = "A: Jarak AC = $\\sqrt{120^2 + 90^2} = \\sqrt{14400 + 8100} = \\sqrt{22500} = 150$ km (Benar). B: Arah Utara dan Timur saling tegak lurus, membentuk sudut $90^\\circ$ (Benar). C: Waktu = Jarak / Kecepatan = $150 / 50 = 3$ jam (Benar). D: Jarak total = $120 + 90 = 210$ km (Benar).";

const rendered = renderLatexPreview(q5Input);
console.log("Rendered length:", rendered.length);
console.log("Contains ___SVG_BLOCK:", rendered.includes("___SVG_BLOCK"));
console.log("Contains <div class=\"my-3 flex justify-center:", rendered.includes("my-3 flex justify-center"));
console.log("Contains class=\"sqrt\":", rendered.includes("class=\"sqrt\""));
console.log("Total <p> tags:", (rendered.match(/<p>/g) || []).length);
