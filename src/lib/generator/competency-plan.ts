/**
 * Rencana cakupan kompetensi Matematika per butir soal, mengikuti matriks asesmen resmi
 * Pusmendik (Perkaban BSKAP No. 45/2025 & No. 47/2025).
 *
 * Sengaja HANYA menentukan elemen + fokus kompetensi yang diuji. Konteks cerita, tokoh,
 * dan angka dibebaskan ke model agar mengikuti gaya soal resmi — pengalaman sebelumnya
 * menunjukkan mewajibkan skenario/profesi per slot justru menghasilkan cerita tempelan
 * dan klise baru.
 */

export interface SlotPlan {
  slotIndex: number;
  elemen: string;
  fokus: string;
}

interface ElementFocus {
  elemen: string;
  bobot: number;
  fokus: string[];
}

const FOKUS_SD: ElementFocus[] = [
  {
    elemen: "Bilangan",
    bobot: 0.35,
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
  return [...list].sort(() => 0.5 - Math.random());
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
          const match = table.find((t) => t.elemen.toLowerCase() === name.toLowerCase());
          return {
            elemen: name,
            bobot: 1 / selectedElements.length,
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

  return `\n\nRENCANA CAKUPAN KOMPETENSI (satu baris = satu butir soal, ikuti urutannya):
${lines}

Rencana ini hanya menentukan kompetensi yang diuji tiap butir. Konteks cerita, tokoh, dan angka sepenuhnya kreasi Anda mengikuti gaya soal resmi. Isi field "elemen" sesuai rencana. Butir berurutan dengan kompetensi berdekatan boleh berbagi satu stimulus grup.`;
}
