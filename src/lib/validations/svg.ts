/**
 * Gerbang validasi & perbaikan otomatis untuk kode SVG mandiri (dihasilkan AI maupun diketik manual
 * oleh Pembuat Soal). Dipakai sebelum svg_content disimpan ke database, agar diagram yang rusak
 * (terpotong akibat batas token AI, atau markup tidak valid) atau berpotensi berbahaya (menyisipkan
 * tag/atribut skrip) ditolak/dibersihkan alih-alih tersimpan dan dirender apa adanya.
 */

export interface SvgRepairResult {
  /** false jika svg_content harus ditolak sepenuhnya (butir soal wajib diperbaiki/digenerasi ulang). */
  ok: boolean;
  /** Kode SVG hasil perbaikan (siap disimpan), atau null jika ok === false. */
  content: string | null;
  /** Catatan perbaikan/penolakan untuk audit trail (mis. detailPemeriksaan generation log). */
  issues: string[];
}

const DANGEROUS_TAG_PATTERN =
  /<\s*(script|foreignobject|iframe|embed|object)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|foreignobject|iframe|embed|object)\b[^>]*\/?>/gi;
const EVENT_HANDLER_ATTR_PATTERN = /\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URI_ATTR_PATTERN = /((?:href|xlink:href)\s*=\s*)(["'])\s*javascript:[^"']*\2/gi;

// Elemen SVG yang WAJIB berpasangan buka/tutup; ketidakseimbangan biasanya menandakan
// keluaran AI terpotong di tengah jalan (melewati batas token) sehingga sisa elemen
// setelahnya ikut "tertelan" sebagai anak tag yang belum tertutup saat dirender browser.
const PAIRED_TAGS = ["g", "text", "tspan", "defs", "linearGradient", "radialGradient"];

export function validateAndRepairSvg(rawSvg: unknown): SvgRepairResult {
  const issues: string[] = [];

  if (typeof rawSvg !== "string" || !rawSvg.trim()) {
    return { ok: false, content: null, issues: ["svg_content kosong atau bukan string."] };
  }

  let svg = rawSvg.trim();

  if (!/^<svg[\s>]/i.test(svg)) {
    return { ok: false, content: null, issues: ['svg_content tidak diawali tag "<svg" yang valid.'] };
  }
  if (!/<\/svg\s*>\s*$/i.test(svg)) {
    return {
      ok: false,
      content: null,
      issues: ['svg_content tidak diakhiri tag penutup "</svg>" (indikasi keluaran terpotong).'],
    };
  }

  if (DANGEROUS_TAG_PATTERN.test(svg)) {
    issues.push("Tag berbahaya (script/foreignObject/iframe/embed/object) dibuang dari SVG.");
    svg = svg.replace(DANGEROUS_TAG_PATTERN, "");
  }
  if (EVENT_HANDLER_ATTR_PATTERN.test(svg)) {
    issues.push("Atribut event handler (mis. onload/onclick) dibuang dari SVG.");
    svg = svg.replace(EVENT_HANDLER_ATTR_PATTERN, "");
  }
  if (JS_URI_ATTR_PATTERN.test(svg)) {
    issues.push('Atribut href berskema "javascript:" dibuang dari SVG.');
    svg = svg.replace(JS_URI_ATTR_PATTERN, "");
  }

  if (!/\sviewBox\s*=/i.test(svg)) {
    issues.push('Atribut "viewBox" hilang, ditambahkan otomatis dengan default "0 0 480 300".');
    svg = svg.replace(/^<svg/i, '<svg viewBox="0 0 480 300"');
  }
  if (!/\sxmlns\s*=/i.test(svg)) {
    issues.push('Atribut "xmlns" hilang, ditambahkan otomatis.');
    svg = svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/\swidth\s*=/i.test(svg)) {
    svg = svg.replace(/^<svg/i, '<svg width="100%"');
  }

  for (const tag of PAIRED_TAGS) {
    const openCount = (svg.match(new RegExp(`<${tag}(?=[\\s>])[^>]*(?<!/)>`, "gi")) || []).length;
    const closeCount = (svg.match(new RegExp(`<\\/${tag}\\s*>`, "gi")) || []).length;
    if (openCount !== closeCount) {
      return {
        ok: false,
        content: null,
        issues: [
          ...issues,
          `Struktur tag "<${tag}>" tidak seimbang (${openCount} pembuka vs ${closeCount} penutup) — kemungkinan keluaran terpotong.`,
        ],
      };
    }
  }

  return { ok: true, content: svg, issues };
}
