/**
 * Rencana cakupan kompetensi Matematika per butir soal, mengikuti matriks asesmen resmi
 * Pusmendik (Perkaban BSKAP No. 45/2025 & No. 47/2025).
 *
 * Sengaja HANYA menentukan elemen + fokus kompetensi yang diuji. Konteks cerita, tokoh,
 * dan angka dibebaskan ke model agar mengikuti gaya soal resmi — pengalaman sebelumnya
 * menunjukkan mewajibkan skenario/profesi per slot justru menghasilkan cerita tempelan
 * dan klise baru.
 *
 * Tabel di bawah juga menjadi SATU-SATUNYA sumber daftar elemen Matematika yang ditampilkan
 * di Studio Generator (getMathCurriculumElements), agar nama elemen yang dipilih admin selalu
 * cocok persis dengan tabel ini. Nama elemen mengikuti kerangka asesmen resmi TKA
 * (mis. SD/MI: Bilangan, Geometri dan Pengukuran, Data — tanpa Aljabar).
 */

export interface SlotPlan {
  slotIndex: number;
  elemen: string;
  fokus: string;
}

interface ElementFocus {
  elemen: string;
  bobot: number;
  deskripsi: string;
  fokus: string[];
}

const FOKUS_SD: ElementFocus[] = [
  {
    elemen: "Bilangan",
    bobot: 0.35,
    deskripsi: "Pecahan, desimal, persen, operasi hitung bilangan cacah, serta kelipatan, faktor, KPK, dan FPB.",
    fokus: [
      "operasi hitung pecahan (penjumlahan, pengurangan, perkalian, pembagian)",
      "operasi pecahan dengan bilangan asli",
      "membandingkan dan mengurutkan pecahan",
      "pecahan senilai dengan representasi gambar",
      "hubungan pecahan, desimal, dan persen",
      "operasi hitung campuran bilangan cacah",
      "estimasi hasil operasi hitung",
      "kelipatan, faktor, KPK, dan FPB",
    ],
  },
  {
    elemen: "Geometri dan Pengukuran",
    bobot: 0.5,
    deskripsi: "Sifat bangun datar dan bangun ruang, keliling, luas, volume, satuan baku, waktu, kecepatan, dan sudut.",
    fokus: [
      "sifat-sifat bangun datar",
      "visualisasi bangun ruang (tampak depan/atas/samping, jaring-jaring, kubus satuan)",
      "keliling dan luas bangun datar, termasuk bangun gabungan",
      "volume kubus dan balok",
      "hubungan antarsatuan baku panjang",
      "hubungan antarsatuan baku berat",
      "hubungan antarsatuan baku volume",
      "satuan waktu dan durasi kegiatan",
      "kecepatan, jarak, dan waktu tempuh",
      "penaksiran ukuran benda",
      "besar sudut",
    ],
  },
  {
    elemen: "Data",
    bobot: 0.15,
    deskripsi: "Membaca dan menyajikan data dalam tabel, diagram batang, atau piktogram, serta rata-rata dan modus.",
    fokus: [
      "membaca informasi dari diagram batang atau piktogram",
      "menyajikan data dalam tabel atau diagram",
      "rata-rata dan modus",
    ],
  },
];

const FOKUS_SMP: ElementFocus[] = [
  {
    elemen: "Bilangan",
    bobot: 0.35,
    deskripsi: "Bilangan bulat dan real, perbandingan, rasio dan skala, bilangan berpangkat, bentuk akar, notasi ilmiah, dan aritmetika sosial.",
    fokus: [
      "operasi bilangan bulat dengan urutan operasi",
      "estimasi hasil operasi bilangan real",
      "faktorisasi prima, FPB, dan KPK",
      "perbandingan senilai",
      "perbandingan berbalik nilai",
      "rasio, skala, dan laju perubahan",
      "bilangan berpangkat dan bentuk akar",
      "notasi ilmiah",
      "aritmetika sosial (harga, diskon, untung-rugi, bunga tunggal)",
    ],
  },
  {
    elemen: "Aljabar",
    bobot: 0.2,
    deskripsi: "Bentuk aljabar, persamaan dan pertidaksamaan linear, SPLDV, relasi dan fungsi, serta pola dan barisan.",
    fokus: [
      "penyederhanaan bentuk aljabar (sifat komutatif, asosiatif, distributif)",
      "persamaan linear satu variabel",
      "pertidaksamaan linear satu variabel",
      "sistem persamaan linear dua variabel",
      "relasi dan fungsi (domain, kodomain, range, nilai fungsi)",
      "pola bilangan dan barisan aritmetika",
      "deret aritmetika",
    ],
  },
  {
    elemen: "Geometri dan Pengukuran",
    bobot: 0.3,
    deskripsi: "Sudut dan garis sejajar, teorema Pythagoras, kesebangunan, luas bangun datar, bangun ruang, dan transformasi.",
    fokus: [
      "sudut pada dua garis sejajar yang dipotong garis transversal",
      "teorema Pythagoras",
      "kekongruenan dan kesebangunan",
      "keliling dan luas bangun datar gabungan termasuk lingkaran",
      "jaring-jaring dan luas permukaan bangun ruang",
      "volume prisma, limas, tabung, kerucut, atau bola",
      "transformasi geometri (translasi, refleksi, rotasi, dilatasi)",
    ],
  },
  {
    elemen: "Data dan Peluang",
    bobot: 0.15,
    deskripsi: "Membaca diagram, ukuran pemusatan dan jangkauan data, serta peluang empiris dan teoretis.",
    fokus: [
      "membaca dan menafsirkan diagram batang, garis, atau lingkaran",
      "mean, median, modus, dan jangkauan",
      "perubahan nilai rata-rata ketika data bertambah atau berubah",
      "peluang empiris (frekuensi relatif)",
      "peluang teoretis kejadian sederhana",
    ],
  },
];

const FOKUS_SMA: ElementFocus[] = [
  {
    elemen: "Aljabar",
    bobot: 0.4,
    deskripsi: "SPLTV, program linear, fungsi kuadrat, eksponen dan logaritma, barisan dan deret, serta komposisi dan invers fungsi.",
    fokus: [
      "sistem persamaan linear tiga variabel",
      "program linear",
      "fungsi kuadrat",
      "fungsi eksponen dan logaritma sederhana",
      "barisan dan deret geometri (termasuk bunga majemuk)",
      "komposisi dan invers fungsi",
    ],
  },
  {
    elemen: "Geometri dan Pengukuran",
    bobot: 0.3,
    deskripsi: "Trigonometri, aturan sinus dan cosinus, jarak pada bangun ruang, serta luas permukaan dan volume.",
    fokus: [
      "trigonometri pada segitiga siku-siku",
      "aturan sinus dan aturan cosinus",
      "jarak titik, garis, dan bidang pada bangun ruang",
      "luas permukaan dan volume bangun ruang",
    ],
  },
  {
    elemen: "Data dan Peluang",
    bobot: 0.3,
    deskripsi: "Ukuran pemusatan dan penyebaran data, data berkelompok, kaidah pencacahan, dan peluang kejadian majemuk.",
    fokus: [
      "ukuran pemusatan dan penyebaran data",
      "penyajian dan interpretasi data berkelompok",
      "kaidah pencacahan (permutasi dan kombinasi)",
      "peluang kejadian majemuk",
    ],
  },
];

function focusTableFor(jenjang: string): ElementFocus[] {
  if (jenjang.includes("SD")) return FOKUS_SD;
  if (jenjang.includes("SMP")) return FOKUS_SMP;
  return FOKUS_SMA;
}

function shuffled<T>(list: T[]): T[] {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** "Geometri & Pengukuran" dan "geometri dan pengukuran" dianggap nama elemen yang sama. */
export function normalizeElemenName(name: string): string {
  return name.toLowerCase().replace(/&/g, " dan ").replace(/\s+/g, " ").trim();
}

/**
 * Nama elemen Matematika resmi menurut Kerangka Asesmen TKA (Perkaban BSKAP 047/H/AN/2025):
 *   SD/MI  : Bilangan, Geometri dan Pengukuran, Data
 *   SMP/SMA: Bilangan, Aljabar, Geometri dan Pengukuran, Data dan Peluang
 * Varian yang sering muncul dari AI atau input manual (mis. "Data dan Ketidakpastian", "Geometri",
 * "Pengukuran", "Analisis Data dan Peluang") dipetakan ke nama resmi jenjang bersangkutan.
 * Nama tak dikenal dikembalikan apa adanya.
 */
export function canonicalMathElemen(jenjang: string, raw: unknown): string {
  const name = typeof raw === "string" ? raw.trim() : "";
  const n = normalizeElemenName(name).replace(/^analisis\s+/, "");
  if (!n) return name;
  if (/^(geometri|pengukuran|geometri dan pengukuran)$/.test(n)) return "Geometri dan Pengukuran";
  if (n === "bilangan") return "Bilangan";
  if (n.startsWith("aljabar")) return "Aljabar";
  if (/^(data|pengolahan data|data dan ketidakpastian|data dan peluang)$/.test(n)) {
    return jenjang.includes("SD") ? "Data" : "Data dan Peluang";
  }
  return name;
}

export interface MathCurriculumElement {
  name: string;
  description: string;
  subElements: string[];
}

/** Daftar elemen Matematika resmi per jenjang untuk ditampilkan di Studio Generator. */
export function getMathCurriculumElements(jenjang: string): MathCurriculumElement[] {
  return focusTableFor(jenjang).map((el) => ({
    name: el.elemen,
    description: el.deskripsi,
    subElements: el.fokus,
  }));
}

/**
 * Membagi totalSoal ke elemen sesuai bobot (metode sisa terbesar), lalu memberi tiap butir
 * satu fokus kompetensi yang digilir dari daftar teracak — agar satu paket tidak menguji
 * kompetensi yang sama berulang kali. Urutan butir dikelompokkan per elemen seperti soal resmi.
 */
export function generateCompetencySlotPlan(
  totalSoal: number,
  jenjang: string,
  mapel: string,
  selectedElements?: string[]
): SlotPlan[] {
  if (!mapel.toLowerCase().includes("matematika")) return [];

  const table = focusTableFor(jenjang);
  const elements: ElementFocus[] =
    selectedElements && selectedElements.length > 0
      ? selectedElements.map((name) => {
          const match = table.find((t) => normalizeElemenName(t.elemen) === normalizeElemenName(name));
          return {
            elemen: match ? match.elemen : name,
            bobot: 1 / selectedElements.length,
            deskripsi: match ? match.deskripsi : "",
            fokus: match ? match.fokus : [`kompetensi pada elemen ${name}`],
          };
        })
      : table;

  const totalBobot = elements.reduce((sum, e) => sum + e.bobot, 0);
  const raw = elements.map((e) => (totalSoal * e.bobot) / totalBobot);
  const counts = raw.map(Math.floor);
  let remaining = totalSoal - counts.reduce((a, b) => a + b, 0);
  const byRemainder = raw
    .map((value, idx) => ({ idx, rem: value - Math.floor(value) }))
    .sort((a, b) => b.rem - a.rem);
  for (let k = 0; remaining > 0; k++, remaining--) {
    counts[byRemainder[k % byRemainder.length].idx]++;
  }

  const plan: SlotPlan[] = [];
  elements.forEach((el, idx) => {
    const pool = shuffled(el.fokus);
    for (let n = 0; n < counts[idx]; n++) {
      plan.push({ slotIndex: plan.length + 1, elemen: el.elemen, fokus: pool[n % pool.length] });
    }
  });
  return plan;
}

export function formatCompetencyPlanPrompt(slots: SlotPlan[]): string {
  if (slots.length === 0) return "";

  const lines = slots.map((s, idx) => `${idx + 1}. ${s.elemen} — ${s.fokus}`).join("\n");

  return `\n\nRENCANA CAKUPAN KOMPETENSI PER BUTIR (satu baris = satu butir soal, ikuti urutannya):
${lines}

ATURAN KETAT CAKUPAN KOMPETENSI:
- Anda WAJIB mengikuti urutan fokus kompetensi di atas persis sesuai nomor butir soalnya (butir #1 wajib menguji fokus pada baris 1, butir #2 baris 2, dst)!
- JANGAN PERNAH berasumsi bahwa nomor 1 harus selalu topik tertentu (misalnya FPB/KPK). Jika baris 1 meminta operasi pecahan atau rasio, maka butir #1 WAJIB menguji topik tersebut!
- Konteks cerita, tokoh, dan angka sepenuhnya kreasi Anda mengikuti gaya soal resmi. Isi field "elemen" dan "kompetensi" sesuai rencana di atas. Butir berurutan dengan kompetensi berdekatan boleh berbagi satu stimulus grup.`;
}
