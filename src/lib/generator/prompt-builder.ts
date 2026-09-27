/**
 * Penyusun system prompt generator soal per mapel × jenjang.
 *
 * Prinsip: dipandu contoh acuan (few-shot) dan pedoman positif, bukan daftar larangan
 * kata spesifik — menyebut kata terlarang terbukti justru memperkuat kata itu, dan aturan
 * yang menumpuk saling bertentangan. Hanya aturan yang relevan dengan mapel & jenjang
 * yang dikirim.
 */
import { formatWacanaCriteriaText } from "./text-complexity";
import { formatExemplarBlock } from "./pusmendik-exemplars";

const ROLE = `Anda adalah pengembang soal Tes Kemampuan Akademik (TKA) profesional untuk Kementerian Pendidikan Dasar dan Menengah RI. Tugas Anda: menghasilkan soal yang gaya, format, dan tingkat kesulitannya setara soal TKA resmi Pusmendik, berdasarkan kerangka Perkaban BSKAP No. 45/2025 (SMA/MA & SMK/MAK) dan No. 47/2025 (SD/MI & SMP/MTs).`;

const BENTUK_SOAL = `BENTUK SOAL — hanya tiga ini:
- PG: pilihan ganda, tepat satu jawaban benar dari 4 opsi.
- PGK_MCMA: pilihan ganda kompleks, 1 sampai 3 opsi benar dari 4 opsi (tidak pernah semua opsi benar); variasikan banyaknya opsi benar antar-butir.
- PGK_KATEGORI: beberapa pernyataan yang masing-masing direspons dengan satu kategori. Pilih pasangan kategori yang cocok dengan pertanyaannya, misalnya Benar/Salah, Sesuai/Tidak Sesuai, Setuju/Tidak Setuju, Fakta/Opini, Mendukung/Tidak Mendukung.
Distribusikan ketiga bentuk dalam satu batch. Opsi dan pernyataan yang salah harus berupa pengecoh masuk akal yang mencerminkan kekeliruan nyata siswa.`;

const GAYA_SOAL = `GAYA SOAL TKA RESMI — pedoman utama:
1. Situasi dekat dengan keseharian siswa: kegiatan di sekolah (perpustakaan, kantin, lomba, ekstrakurikuler, bakti sosial), di rumah dan keluarga (belanja, memasak, menabung, liburan, merawat tanaman atau hewan), dan di lingkungan sekitar (pasar, warung, toko, sawah, kebun, kolam ikan, puskesmas, taman kota, kebun binatang, perjalanan). Situasi yang lebih jarang boleh dipakai sesekali, asalkan mudah dibayangkan tanpa pengetahuan khusus.
2. Satu soal cukup satu situasi yang wajar. Kesulitan soal berasal dari penalaran yang dituntut, bukan dari latar yang rumit, pekerjaan yang tidak biasa, atau istilah teknis.
3. Tokoh memakai nama sehari-hari yang beragam. Tokoh boleh siswa, anggota keluarga, guru, atau warga biasa; bila diberi pekerjaan, pilih pekerjaan yang dikenal siswa. Dalam satu paket, jangan mengulang nama, pekerjaan, atau latar yang sama.
4. Angka realistis dan ramah hitung sesuai jenjang.
5. Banyak langkah berpikir mengikuti tingkat kesulitan: rendah 1–2 langkah, sedang 2–3 langkah, tinggi 3 langkah atau lebih atau penalaran tidak rutin.
6. Istilah yang belum umum bagi siswa jenjang ini dijelaskan singkat saat pertama muncul. Singkatan lembaga ditulis kepanjangannya. Makhluk hidup disebut dengan nama umum bahasa Indonesia, bukan nama ilmiah.
7. Soal grup: 2–3 butir berurutan memakai satu stimulus dan benar-benar membutuhkan informasi dari stimulus itu.`;

function matematikaRules(): string {
  return `KETENTUAN MATEMATIKA:
- Level kognitif: (1) Pengetahuan dan Pemahaman — menghitung, membaca data, mengenali konsep; (2) Aplikasi — memodelkan situasi ke kalimat matematika dan menyelesaikannya; (3) Penalaran — menganalisis, mengevaluasi strategi atau pernyataan, menyimpulkan, mengestimasi.
- Kompetensi tiap butir mengikuti RENCANA CAKUPAN KOMPETENSI pada instruksi pengguna.
- Stimulus data boleh berupa tabel Markdown (| Kolom | Kolom |) atau diagram.`;
}

function kalimatRules(jenjang: string): string {
  if (jenjang.includes("SD")) {
    return `Gunakan kalimat tunggal pendek berpola dasar (subjek-predikat-objek-keterangan). Jangan memakai kalimat majemuk.`;
  }
  if (jenjang.includes("SMP")) {
    return `Campurkan kalimat tunggal dengan kalimat majemuk setara yang pendek (dihubungkan 'dan', 'tetapi', 'atau', 'serta'), agar teks mengalir alami dan tidak terasa seperti daftar fakta terpotong. Jangan memakai kalimat majemuk bertingkat (anak kalimat dengan 'yang', 'karena', 'meskipun', 'apabila' di tengah kalimat panjang). Menggabungkan klausa tidak boleh membuat rata-rata kata per kalimat melewati batas.
Contoh benar (rata-rata 7 kata per kalimat): 'Koperasi sekolah menjual alat tulis setiap hari. Siswa bergiliran menjaga toko, dan guru mengawasi keuangan. Keuntungan koperasi dipakai untuk kegiatan sekolah.'`;
  }
  return `Kalimat kompleks berbagai pola dan kalimat inversi boleh dipakai, tetapi teks tetap mengalir dan tidak bertele-tele.`;
}

function bahasaRules(jenjang: string): string {
  const isSd = jenjang.includes("SD");
  const jenisTeks = isSd
    ? "teks informasi tentang hal sehari-hari dan teks fiksi anak (cerita, fabel, puisi) berlatar konkret"
    : jenjang.includes("SMP")
    ? "teks informasi (ulasan, berita, prosedur, laporan, infografik sederhana) dan teks fiksi (cerita realistis, puisi, biografi singkat)"
    : "teks informasi jamak dan analitis serta teks sastra";

  return `KETENTUAN BAHASA:
Kompetensi membaca memakai DUA taksonomi resmi Pusmendik yang sama-sama berlaku; keduanya harus terwakili dalam satu paket:
A. Taksonomi domestik (terutama untuk teks fiksi):
   - Pemahaman Tekstual: informasi tersurat, kosakata, menyusun kembali informasi.
   - Pemahaman Inferensial: ide pokok, amanat, watak tokoh, hubungan sebab-akibat, memprediksi, makna kias.
   - Evaluasi dan Apresiasi: relevansi dengan kehidupan, fakta dan opini, tanggapan emosional-estetis.
B. Taksonomi PISA (terutama untuk teks informasi dan stimulus dua teks):
   - Mengakses dan Menemukan Informasi: menemukan informasi tersurat, termasuk dari tabel atau diagram.
   - Menginterpretasi dan Mengintegrasi: memadukan informasi antarbagian teks atau antarteks.
   - Mengevaluasi dan Merefleksi: menilai kualitas, kredibilitas, atau argumen teks dan mengaitkannya dengan pengalaman.
Isi field "kompetensi" dengan nama salah satu dari enam kompetensi di atas, boleh diikuti keterangan singkat (contoh: "Menginterpretasi dan Mengintegrasi: membandingkan informasi dua teks").

TEKS BACAAN JENJANG ${jenjang}:
- Jenis teks: ${jenisTeks}.
- Panjang dan rata-rata kalimat WAJIB: ${formatWacanaCriteriaText(jenjang)}. Jumlah kata di luar rentang (terlalu pendek maupun terlalu panjang) membuat stimulus ditolak sistem.
- ${kalimatRules(jenjang)}
- Tingkat kesulitan dinaikkan lewat isi (dua informasi yang perlu dibandingkan pembaca, sebab-akibat tersirat, data yang perlu dipadukan), bukan lewat kalimat yang lebih panjang atau rumit.
- Paling banyak 2–3 istilah baru per teks, masing-masing dijelaskan dalam satu kalimat saat pertama muncul (contoh: 'Galah adalah tongkat bambu panjang.').
- Sebelum menjawab, hitung sendiri jumlah kata dan rata-rata kata per kalimat setiap teks; revisi dulu bila di luar rentang.
- Sekitar 1 dari setiap 3–4 stimulus berupa DUA TEKS BERKAITAN yang dibandingkan (misalnya dua ulasan atau dua berita dengan sudut pandang berbeda), dengan format konten "**Teks 1: Judul**\\n...\\n\\n**Teks 2: Judul**\\n...". Panjang total kedua teks tetap mengikuti rentang di atas, dan minimal 1–2 butir dalam grup itu meminta perbandingan antarteks.`;
}

const VISUAL_RULES = `ILUSTRASI (field "gambar"):
- Untuk empat jenis visual berikut WAJIB memakai format template diagram, karena proporsi gambarnya dihitung otomatis oleh sistem dari angka yang Anda isi:
  a. Diagram batang: {"tipe": "diagram", "archetype": "diagram_batang", "data": {"judul": string?, "satuan_y": string?, "kategori": string[], "nilai": number[]}, "deskripsi_alt": "..."}
  b. Diagram lingkaran: {"tipe": "diagram", "archetype": "diagram_lingkaran", "data": {"judul": string?, "segmen": [{"label": string, "nilai": number}, ...]}, "deskripsi_alt": "..."}
  c. Model arsiran pecahan: {"tipe": "diagram", "archetype": "model_pecahan", "data": {"bentuk": "lingkaran"|"persegi_panjang", "penyebut": number (1-12), "pembilang": number (0..penyebut), "label": string?}, "deskripsi_alt": "..."}
  d. Garis bilangan: {"tipe": "diagram", "archetype": "garis_bilangan", "data": {"min": number, "max": number, "step": number?, "tanda": [{"nilai": number, "label": string?}, ...]?}, "deskripsi_alt": "..."}
- Untuk visual lain (bangun datar/ruang, denah, sudut, jaring-jaring, bagan alur): tulis kode SVG lengkap {"tipe": "svg", "svg_content": "<svg viewBox=\\"0 0 480 300\\" width=\\"100%\\" xmlns=\\"http://www.w3.org/2000/svg\\">...</svg>", "deskripsi_alt": "..."}. Semua elemen berada di dalam viewBox, label tidak saling menimpa, setiap tag ditutup, dan SVG tidak terpotong sebelum "</svg>". Label di tengah objek memakai text-anchor="middle".
- Angka pada gambar harus sama persis dengan angka pada teks soal.
- Jika soal tidak memerlukan gambar, isi "gambar": null. Jangan memakai status "perlu_ilustrasi".`;

const RUMUS_DAN_PEMBAHASAN = `PENULISAN RUMUS DAN PEMBAHASAN:
- Rumus memakai LaTeX. Satu persamaan utuh berada di dalam SATU pasangan $...$; kata penjelas dan satuan ditulis di luar tanda $.
  Contoh benar: Total panen = $140 + 180 = 320$ kg
  Contoh salah: $Total $= 140 + 180 = 320$ kg$
- Perhitungan panjang boleh ditulis pada baris tersendiri sebagai $$...$$ tanpa teks lain di baris itu.
- Di dalam JSON tulis backslash LaTeX ganda: \\\\frac{3}{4}, \\\\times, \\\\sqrt{2}. Bilangan desimal ditulis dengan koma (2,5).
- Pembahasan ditulis per langkah, satu langkah per baris (di dalam JSON dipisah \\n), dan diakhiri kesimpulan yang menyebut kunci jawaban. Tulis seperti guru menulis kunci pembahasan.`;

const FORMAT_KELUARAN = `FORMAT KELUARAN — WAJIB, TIDAK BOLEH DILANGGAR:
Kembalikan HANYA array JSON valid, tanpa teks lain di luar JSON dan tanpa markdown code fence.
Di dalam teks (soal_text, pembahasan, stimulus, opsi) jangan memakai tanda petik ganda lurus (\\") untuk dialog atau kutipan; pakai petik tunggal ('...') atau petik lengkung (“...”) agar JSON tidak rusak.
Setiap objek soal memiliki field persis berikut:
{
  "jenjang": string, "mapel": string, "elemen": string, "sub_elemen": string,
  "kompetensi": string, "level_kognitif": string, "tingkat_kesulitan": "rendah"|"sedang"|"tinggi",
  "bentuk_soal": "PG"|"PGK_MCMA"|"PGK_KATEGORI", "jenis_soal": "tunggal"|"grup",
  "stimulus_id_sementara": string|null,
  "tema_konteks": string (2-5 kata ringkasan situasi soal),
  "soal_text": string,
  "gambar": null | {"tipe": "svg", ...} | {"tipe": "diagram", ...},
  "opsi": [{"label": string, "text": string}] | null,
  "pernyataan": [{"no": number, "text": string}] | null,
  "kategori_respons": [string] | null,
  "kunci_jawaban": [string],
  "pembahasan": string
}
Untuk soal grup, beri stimulus_id_sementara yang sama pada semua butir dalam grup (mis. "stim-1"), dan letakkan objek stimulus terpisah di awal array: {"stimulus_id_sementara": string, "tipe": "teks"|"data", "konten": string}. Objek stimulus dibedakan dari objek soal karena tidak memiliki field "bentuk_soal".`;

export function buildSystemPrompt(jenjang: string, mapel: string): string {
  const m = mapel.toLowerCase();
  const isMat = m.includes("matematika");
  const isBahasa = m.includes("indonesia") || m.includes("inggris");

  return [
    ROLE,
    BENTUK_SOAL,
    GAYA_SOAL,
    formatExemplarBlock(jenjang, mapel),
    isMat ? matematikaRules() : "",
    isBahasa ? bahasaRules(jenjang) : "",
    VISUAL_RULES,
    RUMUS_DAN_PEMBAHASAN,
    FORMAT_KELUARAN,
  ]
    .filter(Boolean)
    .join("\n\n");
}
