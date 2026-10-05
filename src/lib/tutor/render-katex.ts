import katex from "katex";

/**
 * Render teks yang memadukan rumus LaTeX ($...$ / $$...$$) dan Markdown (**bold**, `code`, list, dll) menjadi HTML rapi.
 */
export function renderLatexInText(text: string): string {
  if (!text) return "";

  const mathPlaceholders: string[] = [];

  // 1. Simpan rumus $$...$$ display math ke dalam placeholder
  let processed = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
      mathPlaceholders.push(rendered);
      return `___MATH_BLOCK_${mathPlaceholders.length - 1}___`;
    } catch {
      mathPlaceholders.push(`$$${math}$$`);
      return `___MATH_BLOCK_${mathPlaceholders.length - 1}___`;
    }
  });

  // 2. Simpan rumus $...$ inline math ke dalam placeholder
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    try {
      const rendered = katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
      mathPlaceholders.push(rendered);
      return `___MATH_INLINE_${mathPlaceholders.length - 1}___`;
    } catch {
      mathPlaceholders.push(`$${math}$`);
      return `___MATH_INLINE_${mathPlaceholders.length - 1}___`;
    }
  });

  // 3. Render elemen Markdown standar

  // Blockquote: > Teks
  processed = processed.replace(/^>\s*(.+)$/gm, '<blockquote class="border-l-4 border-blue-400 dark:border-blue-500 pl-3 py-1 my-2 bg-blue-50/50 dark:bg-slate-800/40 rounded-r text-slate-600 dark:text-slate-300 italic text-xs">$1</blockquote>');

  // Headings: ### Header
  processed = processed.replace(/^###\s+(.+)$/gm, '<h4 class="font-bold text-sm text-slate-800 dark:text-slate-100 mt-3 mb-1">$1</h4>');
  processed = processed.replace(/^##\s+(.+)$/gm, '<h3 class="font-bold text-base text-slate-900 dark:text-slate-50 mt-3 mb-1.5">$1</h3>');

  // Horizontal Rule: ---
  processed = processed.replace(/^---+$/gm, '<hr class="my-2.5 border-slate-200 dark:border-slate-700"/>');

  // Bold: **teks**
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>');

  // Italic: *teks* (hanya jika bukan peluru list)
  processed = processed.replace(/(^|[^\*])\*([^\*\n]+?)\*([^\*]|$)/g, '$1<em>$2</em>$3');

  // Inline Code / Backticks: `12` atau `12 + 8`
  // Diubah menjadi badge angka/teks yang rapi dan elegan
  processed = processed.replace(/`([^`\n]+?)`/g, '<code class="font-mono bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[13px] font-semibold border border-blue-200/60 dark:border-blue-800/50">$1</code>');

  // Line breaks to <br/>
  processed = processed.replace(/\n/g, "<br/>");

  // 4. Kembalikan placeholder rumus KaTeX
  processed = processed.replace(/___MATH_BLOCK_(\d+)___/g, (_, index) => {
    return `<div class="my-2 overflow-x-auto text-center">${mathPlaceholders[Number(index)]}</div>`;
  });

  processed = processed.replace(/___MATH_INLINE_(\d+)___/g, (_, index) => {
    return `<span class="inline-math px-0.5">${mathPlaceholders[Number(index)]}</span>`;
  });

  return processed;
}

export const renderKatexWithMarkdown = renderLatexInText;
