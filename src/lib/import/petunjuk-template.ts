/**
 * Teks sheet "Petunjuk" pada template impor Excel Pembuat Soal (soal Human), dipisah dari
 * kode pembuat file (generate-template.ts) supaya bisa diperbarui begitu saja saat perilaku
 * atau kolom importer bertambah, tanpa menyentuh logika generator .xlsx.
 *
 * Setiap string = satu baris (satu sel) pada kolom A sheet "Petunjuk", berurutan dari baris 1.
 */
export const PETUNJUK_BARIS: string[] = [
  'PETUNJUK PENGISIAN - satu baris = satu soal. Isi di sheet "Soal". Baris 2-4 adalah CONTOH (kolom No berisi CONTOH) dan diabaikan saat impor; mulai mengisi dari baris 5.',
  "Kolom wajib: Format, Teks Soal, Kode Kompetensi, Tingkat Kesulitan, Level Kognitif. Pembahasan sangat disarankan diisi.",
  "FORMAT (pilih dari dropdown):",
  "  pg          = pilihan ganda, minimal 2 opsi (disarankan 4-5), TEPAT 1 jawaban benar. Kunci Jawaban: satu huruf, mis. B",
  "  pg_kompleks = pilihan ganda kompleks, 2-8 opsi, boleh lebih dari 1 benar. Kunci Jawaban: huruf dipisah koma, mis. A,C",
  "  pg_kategori = pernyataan Benar/Salah, 1-3 pernyataan. Isi Pernyataan 1-3 dan Jawaban 1-3 (persis Benar atau Salah). Kolom Opsi dan Kunci Jawaban dikosongkan.",
  'Kode Kompetensi: pilih dari dropdown atau lihat sheet "Referensi Kompetensi" (harus persis sama). Elemen, sub elemen, dan deskripsi kompetensi soal diambil dari sheet itu.',
  "Tingkat Kesulitan: mudah / sedang / sulit.   Level Kognitif: L1 / L2 / L3 (Matematika: L1 = Pengetahuan dan Pemahaman, L2 = Aplikasi, L3 = Penalaran).",
  "  Saran: pilih kode kompetensi yang akhirannya (.L1/.L2/.L3) sama dengan Level Kognitif soal. Aplikasi tidak memeriksa kesesuaian ini, jadi dijaga oleh penulis soal.",
  "Bobot: bilangan bulat >= 1 (bobot nilai soal ini). Boleh dikosongkan, defaultnya 1.",
  'Media Soal: isi dengan URL gambar diawali "https://", ATAU tautan bagikan Google Drive (drive.google.com / docs.google.com) -- gambarnya akan diunduh dan disalin otomatis oleh sistem saat impor. File Drive wajib dibagikan sebagai "Siapa saja yang memiliki tautan dapat melihat" dan berupa gambar langsung (PNG/JPEG/GIF/WEBP), maksimal 5 MB.',
  "  TIDAK didukung: menempelkan/menyisipkan gambar langsung ke dalam sel Excel (Insert > Picture > Place Over Cells). Gunakan URL atau tautan Google Drive di atas.",
];
