/**
 * Template diagram deterministik untuk 4 kategori visual yang paling sering menuntut presisi
 * matematis: diagram batang, diagram lingkaran, model pecahan, dan garis bilangan. AI cukup
 * mengisi parameter angka/label (archetype + data); fungsi di sini yang menghitung seluruh
 * koordinat SVG-nya. Ini menghilangkan akar masalah SVG bebas tulisan AI: LLM sering salah
 * menghitung geometri presisi (proporsi, posisi label) sendiri, sedangkan mengisi parameter
 * numerik jauh lebih andal bagi LLM.
 */

export interface DiagramBatangSpec {
  archetype: "diagram_batang";
  judul?: string;
  satuan_y?: string;
  kategori: string[];
  nilai: number[];
}

export interface DiagramLingkaranSpec {
  archetype: "diagram_lingkaran";
  judul?: string;
  segmen: Array<{ label: string; nilai: number }>;
}

export interface ModelPecahanSpec {
  archetype: "model_pecahan";
  bentuk: "lingkaran" | "persegi_panjang";
  penyebut: number;
  pembilang: number;
  label?: string;
}

export interface GarisBilanganSpec {
  archetype: "garis_bilangan";
  min: number;
  max: number;
  step?: number;
  tanda?: Array<{ nilai: number; label?: string }>;
}

export type DiagramSpec = DiagramBatangSpec | DiagramLingkaranSpec | ModelPecahanSpec | GarisBilanganSpec;

export interface DiagramRenderResult {
  svg: string | null;
  error: string | null;
}

const PALETTE = ["#4f46e5", "#059669", "#d97706", "#e11d48", "#0284c7", "#7c3aed", "#65a30d", "#db2777"];
const INK = "#1e293b";
const GRID = "#cbd5e1";
const BG = "#f8fafc";
const FONT = "system-ui,sans-serif";

function escXml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function wedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const startPt = polarToCartesian(cx, cy, r, startAngle);
  const endPt = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${startPt.x.toFixed(2)} ${startPt.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x.toFixed(2)} ${endPt.y.toFixed(2)} Z`;
}

function wrapSvg(w: number, h: number, inner: string): string {
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${w}" height="${h}" fill="${BG}"/>${inner}</svg>`;
}

function renderDiagramBatang(spec: any): DiagramRenderResult {
  const kategori = spec.kategori;
  const nilai = spec.nilai;
  if (!Array.isArray(kategori) || !Array.isArray(nilai) || kategori.length === 0) {
    return { svg: null, error: "diagram_batang wajib memiliki array kategori dan nilai yang tidak kosong." };
  }
  if (kategori.length !== nilai.length) {
    return {
      svg: null,
      error: `Panjang kategori (${kategori.length}) tidak sama dengan panjang nilai (${nilai.length}) pada diagram_batang.`,
    };
  }
  if (kategori.length > 8) {
    return { svg: null, error: "diagram_batang mendukung maksimal 8 kategori agar tetap terbaca." };
  }
  if (nilai.some((n: any) => typeof n !== "number" || !isFinite(n) || n < 0)) {
    return { svg: null, error: "Seluruh nilai pada diagram_batang wajib berupa angka >= 0." };
  }

  const W = 480;
  const H = 300;
  const left = 55;
  const right = 20;
  const top = spec.judul ? 46 : 24;
  const bottom = 56;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const niceMax = niceCeil(Math.max(...nilai, 0) || 1);
  const n = kategori.length;
  const slot = plotW / n;
  const barW = slot * 0.55;

  const gridLines: string[] = [];
  const yLabels: string[] = [];
  for (let i = 0; i <= 4; i++) {
    const frac = i / 4;
    const y = top + plotH - frac * plotH;
    gridLines.push(`<line x1="${left}" y1="${y.toFixed(1)}" x2="${W - right}" y2="${y.toFixed(1)}" stroke="${GRID}" stroke-width="1"/>`);
    yLabels.push(
      `<text x="${left - 8}" y="${(y + 4).toFixed(1)}" font-size="11" text-anchor="end" fill="${INK}" font-family="${FONT}">${Math.round(niceMax * frac)}</text>`
    );
  }

  const bars: string[] = [];
  const xLabels: string[] = [];
  const valueLabels: string[] = [];
  nilai.forEach((val: number, i: number) => {
    const barH = (val / niceMax) * plotH;
    const x = left + i * slot + (slot - barW) / 2;
    const y = top + plotH - barH;
    const color = PALETTE[i % PALETTE.length];
    bars.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${color}" rx="3"/>`);
    valueLabels.push(
      `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="11" text-anchor="middle" fill="${INK}" font-weight="600" font-family="${FONT}">${val}</text>`
    );
    xLabels.push(
      `<text x="${(x + barW / 2).toFixed(1)}" y="${(top + plotH + 18).toFixed(1)}" font-size="11" text-anchor="middle" fill="${INK}" font-family="${FONT}">${escXml(kategori[i])}</text>`
    );
  });

  const titleSvg = spec.judul
    ? `<text x="${W / 2}" y="20" font-size="13" font-weight="700" text-anchor="middle" fill="${INK}" font-family="${FONT}">${escXml(spec.judul)}</text>`
    : "";
  const yUnitSvg = spec.satuan_y
    ? `<text x="8" y="14" font-size="10" fill="${INK}" font-family="${FONT}">${escXml(spec.satuan_y)}</text>`
    : "";
  const axisSvg = `<line x1="${left}" y1="${top + plotH}" x2="${W - right}" y2="${top + plotH}" stroke="${INK}" stroke-width="1.5"/>`;

  return {
    svg: wrapSvg(W, H, `${titleSvg}${yUnitSvg}${gridLines.join("")}${yLabels.join("")}${axisSvg}${bars.join("")}${valueLabels.join("")}${xLabels.join("")}`),
    error: null,
  };
}

function renderDiagramLingkaran(spec: any): DiagramRenderResult {
  const segmen = spec.segmen;
  if (!Array.isArray(segmen) || segmen.length < 2) {
    return { svg: null, error: "diagram_lingkaran wajib memiliki minimal 2 segmen." };
  }
  if (segmen.length > 8) {
    return { svg: null, error: "diagram_lingkaran mendukung maksimal 8 segmen agar tetap terbaca." };
  }
  for (const s of segmen) {
    if (!s || typeof s.label !== "string" || !s.label.trim() || typeof s.nilai !== "number" || !isFinite(s.nilai) || s.nilai <= 0) {
      return { svg: null, error: "Setiap segmen diagram_lingkaran wajib memiliki label dan nilai > 0." };
    }
  }

  const total = segmen.reduce((sum: number, s: any) => sum + s.nilai, 0);
  const W = 480;
  const H = 300;
  const cx = 150;
  const cy = spec.judul ? 165 : 150;
  const r = 100;

  let angle = 0;
  const slices: string[] = [];
  const legend: string[] = [];
  segmen.forEach((s: any, i: number) => {
    const sweep = (s.nilai / total) * 360;
    const color = PALETTE[i % PALETTE.length];
    if (sweep >= 359.999) {
      slices.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" stroke="${BG}" stroke-width="2"/>`);
    } else {
      slices.push(`<path d="${wedgePath(cx, cy, r, angle, angle + sweep)}" fill="${color}" stroke="${BG}" stroke-width="2"/>`);
    }
    const pct = Math.round((s.nilai / total) * 100);
    if (sweep > 25) {
      const labelPt = polarToCartesian(cx, cy, r * 0.62, angle + sweep / 2);
      slices.push(
        `<text x="${labelPt.x.toFixed(1)}" y="${labelPt.y.toFixed(1)}" font-size="11" font-weight="700" text-anchor="middle" fill="#ffffff" font-family="${FONT}">${pct}%</text>`
      );
    }
    const legendY = 50 + i * 22;
    legend.push(
      `<rect x="290" y="${legendY - 10}" width="12" height="12" fill="${color}" rx="2"/><text x="308" y="${legendY}" font-size="11" fill="${INK}" font-family="${FONT}">${escXml(s.label)} (${pct}%)</text>`
    );
    angle += sweep;
  });

  const titleSvg = spec.judul
    ? `<text x="${W / 2}" y="24" font-size="13" font-weight="700" text-anchor="middle" fill="${INK}" font-family="${FONT}">${escXml(spec.judul)}</text>`
    : "";

  return { svg: wrapSvg(W, H, `${titleSvg}${slices.join("")}${legend.join("")}`), error: null };
}

function renderModelPecahan(spec: any): DiagramRenderResult {
  const { penyebut, pembilang, bentuk } = spec;
  if (bentuk !== "lingkaran" && bentuk !== "persegi_panjang") {
    return { svg: null, error: 'model_pecahan wajib memiliki bentuk "lingkaran" atau "persegi_panjang".' };
  }
  if (!Number.isInteger(penyebut) || penyebut < 1 || penyebut > 12) {
    return { svg: null, error: "model_pecahan.penyebut wajib bilangan bulat antara 1 dan 12." };
  }
  if (!Number.isInteger(pembilang) || pembilang < 0 || pembilang > penyebut) {
    return { svg: null, error: "model_pecahan.pembilang wajib bilangan bulat antara 0 dan penyebut." };
  }

  const W = 480;
  const H = 260;
  const shaded = "#f59e0b";
  const unshaded = "#ffffff";
  const stroke = "#334155";

  let shapeSvg = "";
  if (bentuk === "lingkaran") {
    const cx = 160;
    const cy = 130;
    const r = 100;
    const sliceAngle = 360 / penyebut;
    const wedges: string[] = [];
    for (let i = 0; i < penyebut; i++) {
      const fill = i < pembilang ? shaded : unshaded;
      wedges.push(`<path d="${wedgePath(cx, cy, r, i * sliceAngle, (i + 1) * sliceAngle)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
    }
    shapeSvg = wedges.join("");
  } else {
    const x0 = 40;
    const y0 = 70;
    const totalW = 400;
    const h = 120;
    const stripW = totalW / penyebut;
    const strips: string[] = [];
    for (let i = 0; i < penyebut; i++) {
      const fill = i < pembilang ? shaded : unshaded;
      strips.push(`<rect x="${(x0 + i * stripW).toFixed(1)}" y="${y0}" width="${stripW.toFixed(1)}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
    }
    shapeSvg = strips.join("");
  }

  const labelSvg = `<text x="${W / 2}" y="${H - 22}" font-size="20" font-weight="700" text-anchor="middle" fill="${INK}" font-family="${FONT}">${pembilang}/${penyebut}</text>`;
  const captionSvg = spec.label
    ? `<text x="${W / 2}" y="24" font-size="13" text-anchor="middle" fill="${INK}" font-family="${FONT}">${escXml(spec.label)}</text>`
    : "";

  return { svg: wrapSvg(W, H, `${captionSvg}${shapeSvg}${labelSvg}`), error: null };
}

function renderGarisBilangan(spec: any): DiagramRenderResult {
  const { min, max } = spec;
  const step = typeof spec.step === "number" && spec.step > 0 ? spec.step : 1;
  if (typeof min !== "number" || typeof max !== "number" || !isFinite(min) || !isFinite(max) || min >= max) {
    return { svg: null, error: "garis_bilangan wajib memiliki min < max berupa angka." };
  }
  const tickCount = (max - min) / step;
  if (!isFinite(tickCount) || tickCount > 40) {
    return { svg: null, error: "garis_bilangan memiliki terlalu banyak tanda; perbesar step atau perkecil rentang min-max." };
  }

  const W = 480;
  const H = 140;
  const x0 = 40;
  const x1 = 440;
  const lineY = 75;
  const scaleX = (v: number) => x0 + ((v - min) / (max - min)) * (x1 - x0);

  const ticks: string[] = [];
  for (let v = min; v <= max + 1e-9; v += step) {
    const x = scaleX(v);
    ticks.push(`<line x1="${x.toFixed(1)}" y1="${lineY - 6}" x2="${x.toFixed(1)}" y2="${lineY + 6}" stroke="${INK}" stroke-width="1.5"/>`);
    ticks.push(
      `<text x="${x.toFixed(1)}" y="${lineY + 24}" font-size="11" text-anchor="middle" fill="${INK}" font-family="${FONT}">${Number(v.toFixed(6))}</text>`
    );
  }

  const marks: string[] = [];
  if (Array.isArray(spec.tanda)) {
    for (const t of spec.tanda) {
      if (!t || typeof t.nilai !== "number" || t.nilai < min || t.nilai > max) continue;
      const x = scaleX(t.nilai);
      marks.push(`<circle cx="${x.toFixed(1)}" cy="${lineY}" r="5.5" fill="#e11d48" stroke="#ffffff" stroke-width="1.5"/>`);
      if (t.label) {
        marks.push(
          `<text x="${x.toFixed(1)}" y="${lineY - 16}" font-size="11" font-weight="700" text-anchor="middle" fill="#e11d48" font-family="${FONT}">${escXml(t.label)}</text>`
        );
      }
    }
  }

  const arrowRight = `<polygon points="${(x1 + 10).toFixed(1)},${lineY} ${x1.toFixed(1)},${(lineY - 5).toFixed(1)} ${x1.toFixed(1)},${(lineY + 5).toFixed(1)}" fill="${INK}"/>`;
  const arrowLeft = `<polygon points="${(x0 - 10).toFixed(1)},${lineY} ${x0.toFixed(1)},${(lineY - 5).toFixed(1)} ${x0.toFixed(1)},${(lineY + 5).toFixed(1)}" fill="${INK}"/>`;
  const mainLine = `<line x1="${x0 - 10}" y1="${lineY}" x2="${x1 + 10}" y2="${lineY}" stroke="${INK}" stroke-width="2"/>`;

  return { svg: wrapSvg(W, H, `${mainLine}${arrowLeft}${arrowRight}${ticks.join("")}${marks.join("")}`), error: null };
}

export function renderDiagramTemplate(spec: any): DiagramRenderResult {
  if (!spec || typeof spec !== "object") {
    return { svg: null, error: "Spesifikasi diagram kosong atau bukan objek." };
  }
  switch (spec.archetype) {
    case "diagram_batang":
      return renderDiagramBatang(spec);
    case "diagram_lingkaran":
      return renderDiagramLingkaran(spec);
    case "model_pecahan":
      return renderModelPecahan(spec);
    case "garis_bilangan":
      return renderGarisBilangan(spec);
    default:
      return {
        svg: null,
        error: `Archetype diagram "${spec.archetype}" tidak dikenali. Gunakan salah satu: diagram_batang, diagram_lingkaran, model_pecahan, garis_bilangan.`,
      };
  }
}
