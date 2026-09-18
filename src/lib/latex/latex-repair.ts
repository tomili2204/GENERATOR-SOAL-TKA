/**
 * Utility komprehensif untuk normalisasi dan perbaikan teks rumus LaTeX / KaTeX.
 * Menangani bug escaping JSON di mana backslash LaTeX di-decode menjadi control character:
 * - \f (Form Feed, ASCII 12) + "rac" -> \frac
 * - \t (Tab, ASCII 9) + "imes" -> \times
 * - \t + "ext" -> \text
 * - \t + "heta" -> \theta
 * - \t + "an" -> \tan
 * - \t + "au" -> \tau
 * - \t + "o" -> \to
 * - \b (Backspace, ASCII 8) + "eta" -> \beta
 * - \b + "ar" -> \bar
 * - \b + "egin" -> \begin
 * - \b + "ullet" -> \bullet
 * - \r (Carriage Return, ASCII 13) + "ho" -> \rho
 * - \r + "ight" -> \right
 * - \n (Newline, ASCII 10) + "abla" -> \nabla
 * - \n + "e" (dalam konteks matematika) -> \ne
 */

export function repairLatexString(content: string): string {
  if (!content || typeof content !== "string") return content;

  let text = content;

  // 1. Perbaiki Form Feed (\x0c) yang berasal dari \frac
  text = text.replace(/\x0crac/g, "\\frac");
  text = text.replace(/\x0c/g, "\\f"); // sisa standalone form feed
  text = text.replace(/\^rac\{/g, "\\frac{"); // artefak simbol KaTeX error
  text = text.replace(/(\d+)\s*rac\{/g, "$1 \\frac{");
  text = text.replace(/(^|[^\\])\brac\{/g, "$1\\frac{");

  // 2. Perbaiki Tab (\x09) yang berasal dari \times, \text, \theta, \tan, \tau, \to
  text = text.replace(/\x09imes/g, "\\times");
  text = text.replace(/\x09ext/g, "\\text");
  text = text.replace(/\x09heta/g, "\\theta");
  text = text.replace(/\x09an/g, "\\tan");
  text = text.replace(/\x09au/g, "\\tau");
  text = text.replace(/\x09o\b/g, "\\to");

  // Perbaiki kasus "imes" yang kehilangan backslash dan t (misal: "2imes", "pimesl", "15imes10")
  // Pastikan TIDAK mengenai "times" atau "\times" (dengan negative lookbehind (?<!t))
  text = text.replace(/([0-9a-zA-Z\)])\s*(?<!t)imes\b/g, "$1 \\times ");
  text = text.replace(/([a-zA-Z0-9\)])imes([a-zA-Z0-9\(\\])/g, "$1 \\times $2");
  text = text.replace(/(?<![a-zA-Z\\])imes\s*([0-9a-zA-Z\(\\])/g, "\\times $1");

  // Perbaiki kasus "times" yang kehilangan backslash (misal: "2 times 3")
  text = text.replace(/(?<!\\)\btimes\b/g, "\\times");

  // Perbaiki kasus literal "\t \times" atau "\t\times" atau stray "\t" sebelum operator/angka di dalam teks/rumus
  text = text.replace(/\\t\s*\\times\b/g, "\\times");
  text = text.replace(/\\t(?![a-zA-Z])/g, " ");
  text = text.replace(/\\r\s*\\rho\b/g, "\\rho");
  text = text.replace(/\\r(?![a-zA-Z])/g, " ");
  text = text.replace(/\\n\s*\\nabla\b/g, "\\nabla");
  text = text.replace(/\\n(?![a-zA-Z])/g, " ");
  text = text.replace(/\\f\s*\\frac\b/g, "\\frac");

  // 3. Perbaiki Backspace (\x08) yang berasal dari \beta, \bar, \begin, \bullet
  text = text.replace(/\x08eta/g, "\\beta");
  text = text.replace(/\x08ar/g, "\\bar");
  text = text.replace(/\x08egin/g, "\\begin");
  text = text.replace(/\x08ullet/g, "\\bullet");

  // 4. Perbaiki Carriage Return (\x0d) yang berasal dari \rho, \right
  text = text.replace(/\x0dho/g, "\\rho");
  text = text.replace(/\x0dight/g, "\\right");

  // 5. Perbaiki Newline (\x0a) yang berasal dari \nabla atau \ne di dalam rumus
  text = text.replace(/\x0aabla/g, "\\nabla");

  // 6. Normalisasi pembatas LaTeX alternatif \( ... \) dan \[ ... \]
  // \[ ... \] -> $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_m, math) => `$$${math.trim()}$$`);
  // \( ... \) -> $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_m, math) => `$${math.trim()}$`);

  // 6a. Normalisasi $$ yang salah dipakai inline (misal: "10 $$\times$$ 42.000") menjadi inline math $ ... $
  text = text.replace(/\$\$\s*(\\times|\\cdot|\\div|\\pm|[+\-=\/]|\\ne|\\approx|\\le|\\ge|<|>)\s*\$\$/g, (_m, op) => `$${op}$`);

  text = text
    .split("\n")
    .map((line) => {
      if (line.includes("$$")) {
        const trimmed = line.trim();
        const isStandaloneBlock =
          trimmed.startsWith("$$") &&
          trimmed.endsWith("$$") &&
          trimmed.indexOf("$$") === 0 &&
          trimmed.indexOf("$$", 2) === trimmed.length - 2;
        if (!isStandaloneBlock) {
          return line.replace(/\$\$([\s\S]*?)\$\$/g, (_m, math) => `$${math.trim()}$`);
        }
      }
      return line;
    })
    .join("\n");

  // 6b. Normalisasi simbol kesimpulan \therefore atau ∴ menjadi frasa bahasa Indonesia standar "Jadi, "
  text = text.replace(/\\?\$\s*\\therefore\s*\\?\$\s*(\.)?\s*/gi, "Jadi, ");
  text = text.replace(/(?:\\therefore|∴)\s*(\.)?\s*/gi, "Jadi, ");
  text = text.replace(/(?:Jadi,\s*){2,}/gi, "Jadi, ");
  text = text.replace(/Jadi,\s*([A-Z])/g, (_m, char) => `Jadi, ${char.toLowerCase()}`);

  // 6c. Unpack mata uang Rupiah dari math block agar font seragam dan tanda koma desimal tidak berjarak
  text = text.replace(/\$\s*\\text\{Rp\s*\}\s*([0-9\.\,\{\}]+)\s*\$/gi, (_m, val) => `Rp ${val.replace(/[\{\}]/g, "")}`);
  text = text.replace(/\$\s*\\text\{Rp\}\s*([0-9\.\,\{\}]+)\s*\$/gi, (_m, val) => `Rp ${val.replace(/[\{\}]/g, "")}`);
  text = text.replace(/\bRp\s*\$([0-9\.\,\{\}]+)\$/gi, (_m, val) => `Rp ${val.replace(/[\{\}]/g, "")}`);
  text = text.replace(/=\s*\\text\{Rp\s*\}\s*([0-9\.\,\{\}]+)\s*\$/gi, (_m, val) => `=$ Rp ${val.replace(/[\{\}]/g, "")}`);

  // 7. Auto-wrap ekspresi LaTeX telanjang di luar delimiter $
  // Pisahkan string berdasarkan delimiter math yang valid ($$...$$ atau $...$)
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
  text = parts
    .map((part, idx) => {
      // Jika indeks ganjil, berarti berada di dalam math block $...$ atau $$...$$
      if (idx % 2 === 1) return part;

      let s = part;
      // Normalisasi persen di luar math mode agar tidak muncul literal backslash misal (20\%) -> (20%)
      s = s.replace(/\\%/g, "%");

      // Auto-wrap pecahan campuran misal "1 \frac{3}{4}" atau pecahan biasa "\frac{1}{2}"
      s = s.replace(/((?:\d+\s+)?\\frac\{[^{}]+\}\{[^{}]+\})/g, (_m, f) => `$${f.trim()}$`);
      // Auto-wrap akar "\sqrt{...}"
      s = s.replace(/(\\sqrt\{[^{}]+\})/g, (_m, sq) => `$${sq.trim()}$`);
      // Auto-wrap operator perkalian telanjang
      s = s.replace(/([0-9a-zA-Z\)])\s*\\times\s*([0-9a-zA-Z\(])/g, "$1 $\\times$ $2");
      s = s.replace(/\\times\b/g, "$\\times$");
      // Auto-wrap operator relasi & implikasi telanjang
      s = s.replace(/\\implies\b/g, "$\\implies$");
      s = s.replace(/\\approx\b/g, "$\\approx$");
      s = s.replace(/\\le\b/g, "$\\le$");
      s = s.replace(/\\ge\b/g, "$\\ge$");
      s = s.replace(/\^\\circ\b/g, "$^\\circ$");
      s = s.replace(/\\degree\b/g, "$^\\circ$");

      return s;
    })
    .join("");

  // 8. Perbaiki ekspresi dalam blok matematika ($...$ atau $$...$$)
  text = text.replace(/\$([^\$\n]+?)\$/g, (_match, math) => {
    let repairedMath = math;

    // Di dalam math mode:
    // Perbaiki \ne jika berubah jadi newline
    repairedMath = repairedMath.replace(/\n+e\b/g, " \\ne ");
    // Perbaiki sisa tab
    repairedMath = repairedMath.replace(/\t+/g, " ");
    // Perbaiki operator perkalian jika belum ada backslash
    repairedMath = repairedMath.replace(/(?<!\\)\btimes\b/g, "\\times");
    // Perbaiki pecahan yang hilang backslash
    repairedMath = repairedMath.replace(/(^|[^\\])frac\{/g, "$1\\frac{");
    // Perbaiki akar yang hilang backslash
    repairedMath = repairedMath.replace(/(^|[^\\])sqrt\{/g, "$1\\sqrt{");
    // Perbaiki text yang hilang backslash
    repairedMath = repairedMath.replace(/(^|[^\\])text\{/g, "$1\\text{");
    // Perbaiki cdot yang hilang backslash
    repairedMath = repairedMath.replace(/(^|[^\\])cdot\b/g, "$1\\cdot");

    // Hilangkan spasi berlebih pada koma desimal Indonesia di dalam KaTeX: misal 310.000,00 -> 310.000{,}00
    repairedMath = repairedMath.replace(/(\d+),(\d+)/g, "$1{,}$2");
    // Pastikan spasi setelah \text{Rp} jika masih tersisa di dalam math mode
    repairedMath = repairedMath.replace(/\\text\{Rp\}(?!\s)/g, "\\text{Rp }");

    return `$${repairedMath}$`;
  });

  // 9. Lepaskan teks narasi bahasa Indonesia yang keliru dibungkus dalam math block $\text{...}$
  // Contoh: "$\text{Langkah 1: Hitung volume balok: } V = p \times l \times t$"
  // -> "Langkah 1: Hitung volume balok: $V = p \times l \times t$"

  // (a) Unpack standalone $\text{...}$ atau $$\text{...}$$ tanpa matematika lain
  text = text.replace(/\$\$\s*\\text\{([^{}]+)\}\s*\$\$/g, "$1");
  text = text.replace(/\$\s*\\text\{([^{}]+)\}\s*\$/g, "$1");

  // (b) Unpack $\therefore \text{...}$ -> $\therefore$ ...
  text = text.replace(/\$\s*\\therefore\s*\\text\{([^{}]+)\}\s*\$/g, "$\\therefore$ $1");

  // (c) Unpack leading \text{...} dari math block jika berupa frasa narasi
  text = text.replace(/\$\s*\\text\{([^{}]+)\}\s*([^\$]+?)\$/g, (_match, prefix, math) => {
    return `${prefix.trim()} $${math.trim()}$`;
  });

  // (d) Unpack trailing \text{...} jika berupa kalimat penjelas (bukan satuan pendek)
  text = text.replace(/\$([^\$]+?)\s*\\text\{([^{}]+)\}\s*\$/g, (match, math, suffix) => {
    if (suffix.length > 5 || /[\s\(\)\:\.\,]/.test(suffix) || /^(benar|salah|kali|buah|orang|butir|hari)/i.test(suffix.trim())) {
      return `$${math.trim()}$ ${suffix.trim()}`;
    }
    return match;
  });

  return text;
}

/**
 * Rekursif memperbaiki semua string dalam objek / array JSON
 */
export function deepRepairLatex<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === "string") {
    return repairLatexString(input) as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => deepRepairLatex(item)) as unknown as T;
  }

  if (typeof input === "object") {
    const result: any = {};
    for (const key of Object.keys(input)) {
      result[key] = deepRepairLatex((input as any)[key]);
    }
    return result as T;
  }

  return input;
}

/**
 * Preprocessor untuk raw JSON string dari output Gemini API sebelum dipanggil JSON.parse().
 * Mencegah escape control characters (seperti \frac menjadi Form Feed, \times menjadi Tab, dll).
 */
export function preprocessJsonForLatex(rawText: string): string {
  let cleanJson = rawText.trim();

  // Bersihkan code fence markdown jika ada
  if (cleanJson.startsWith("```json")) {
    cleanJson = cleanJson.replace(/^```json/, "").replace(/```$/, "").trim();
  } else if (cleanJson.startsWith("```")) {
    cleanJson = cleanJson.replace(/^```/, "").replace(/```$/, "").trim();
  }

  // Cari semua backslash yang diikuti oleh perintah LaTeX di dalam raw JSON string
  // Daftar perintah LaTeX matematika umum:
  const latexCommands = [
    "frac",
    "times",
    "text",
    "theta",
    "tan",
    "tau",
    "to",
    "beta",
    "bar",
    "begin",
    "bullet",
    "rho",
    "right",
    "left",
    "nabla",
    "ne",
    "sqrt",
    "cdot",
    "pm",
    "approx",
    "le",
    "ge",
    "div",
    "alpha",
    "gamma",
    "delta",
    "pi",
    "lambda",
    "sigma",
    "omega",
    "sin",
    "cos",
    "log",
    "ln",
    "lim",
    "sum",
    "int",
    "infty",
    "degree",
    "circ",
    "therefore",
    "implies",
  ];

  // Buat regex untuk menangkap single backslash sebelum perintah LaTeX
  // Pattern: (?<!\\)\\(command)\b
  // Di JavaScript regex: kita tangkap backslash yang bukan ganda
  const commandPattern = new RegExp(`(?<!\\\\)\\\\(${latexCommands.join("|")})\\b`, "g");
  cleanJson = cleanJson.replace(commandPattern, "\\\\$1");

  // Tangkap juga \[ dan \] serta \( dan \) yang belum di-double escape
  cleanJson = cleanJson.replace(/(?<!\\)\\\[/g, "\\\\[");
  cleanJson = cleanJson.replace(/(?<!\\)\\\]/g, "\\\\]");
  cleanJson = cleanJson.replace(/(?<!\\)\\\(/g, "\\\\(");
  cleanJson = cleanJson.replace(/(?<!\\)\\\)/g, "\\\\)");

  // Tangkap \% yang belum di-escape
  cleanJson = cleanJson.replace(/(?<!\\)\\%/g, "\\\\%");

  return cleanJson;
}
