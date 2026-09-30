# Audit Susulan: Variasi Kategori Konteks & Tahap Pemodelan (Formulate)
### Generator Matematika soal.ayotka.id — Pelengkap Laporan Audit 9-Kriteria

**Tanggal audit:** 2026-09-30
**Sifat:** Murni evaluasi/audit read-only. Tidak ada kode, skema, atau data yang diubah dalam proses audit ini.

---

## Metodologi

Sampel diambil langsung dari database produksi, tersebar lintas paket (bukan satu paket berurutan) agar representatif terhadap variasi tema:

- **SD/MI**: 27 soal, rentang tanggal 2026-09-18 s/d 2026-09-29, dari 27 paket berbeda.
- **SMP/MTs**: 28 soal, rentang tanggal 2026-09-17 s/d 2026-09-29, dari 26 paket berbeda. **2 dikeluarkan dari analisis** (H01-SMP-MAT-03, A05-SMP-MAT-29) karena `tema_konteks = "null"` — keduanya konten lama/manual dari luar pipeline AI saat ini, bukan produk generator yang sedang diaudit. Sampel final SMP = **26 soal**.

Setiap soal dibaca teks lengkapnya (soal + stimulus bila ada) dan diklasifikasikan manual satu per satu; keputusan ambigu dicatat alasannya di teks.

Kerangka rujukan: dokumen OECD *"PISA 2022 Released Main Survey New Mathematics Items"*, yang membagi konteks soal Matematika ke 4 kategori — **Personal** (kehidupan pribadi/keluarga), **Occupational** (pekerjaan/profesi), **Societal** (kepentingan publik/komunitas), **Scientific** (sains/data empiris) — dan cross-check ke soal resmi Pusmendik yang sudah pernah diekstrak.

---

## Kriteria Baru 1 — Variasi Kategori Konteks

### Distribusi SD/MI (n=27)

| Kategori | Jumlah | Persentase |
|---|---|---|
| Societal | 12 | 44% |
| Occupational | 11 | 41% |
| Scientific | 3 | 11% |
| **Personal** | **1** | **4%** |

### Distribusi SMP/MTs (n=26)

| Kategori | Jumlah | Persentase |
|---|---|---|
| Occupational | 13 | 50% |
| Societal | 10 | 38% |
| Scientific | 2 | 8% |
| **Personal** | **1** | **4%** |

### Status: SEBAGIAN SESUAI

Tidak ada satu kategori pun yang melewati ambang >60% (jadi secara harfiah lolos aturan itu), tapi kategori **Personal nyaris tidak muncul sama sekali** (4% di kedua jenjang, masing-masing hanya 1 dari puluhan soal) — persis di titik ambang <5% yang ditandai sebagai tanda bahaya. Occupational + Societal bersama mendominasi 85% (SD) dan 88% (SMP) sampel.

### Contoh Bukti per Kategori

- **Personal** (nyaris tunggal):
  - A26-SMP-MAT-07 — Bu Wati merapikan penjemuran kerupuk *di samping rumahnya* (framing domestik pribadi, bukan usaha).
  - A09-SD-MAT-25 — 4 siswa membandingkan panjang pita milik pribadi masing-masing.

- **Occupational**:
  - A22-SD-MAT-30 — Pak Danu memanen & menjual mangga.
  - A24-SMP-MAT-30 — OSIS beli bibit (meski institusional, tugas beli spesifik).
  - A12-SMP-MAT-23 — Pak Haris usaha tahu rumahan.

- **Societal**:
  - A16-SD-MAT-30 — bank sampah SDN Cemara.
  - A19-SMP-MAT-30 — bakti sosial donasi buku 5 kelas SMP.
  - A17-SD-MAT-29 — Taman Baca Pelita Desa.

- **Scientific**:
  - A06-SD-MAT-28 & A12-SD-MAT-30 — data imunisasi/gizi balita (mengikuti pola resmi Pusmendik yang eksplisit menyebut "kebutuhan protein anak & ibu hamil" sebagai contoh Scientific).
  - A28-SMP-MAT-30 & A16-SD-MAT-29 — metode pengukuran tak langsung via bayangan/kesebangunan.

### Catatan Metodologis

Klasifikasi "kader Posyandu" ambigu antara Societal (program layanan publik) dan Scientific (data biologis/kesehatan). Aturan yang dipakai mengikuti pola rujukan resmi: **jika soal menyoroti angka fenomena kesehatan/biologis (cakupan imunisasi, pertumbuhan gizi) → Scientific**; **jika menyoroti administrasi/kehadiran program → Societal** (contoh: A18-SMP-MAT-27 "jumlah peserta hadir sosialisasi" dinilai Societal, bukan Scientific, karena itu data kehadiran administratif bukan data biologis).

### Diagnosis Akar Masalah — PROMPT, bukan skema/kode

Dibaca langsung dari `src/lib/generator/prompt-builder.ts` (`GAYA_SOAL`, `matematikaRules`): **tidak ada satu pun instruksi** yang menyebut empat kategori PISA ini atau meminta distribusi seimbang di antaranya. Prompt hanya menyebut "kegiatan di sekolah, di rumah dan keluarga (belanja, memasak, menabung...), dan di lingkungan sekitar" secara umum tanpa penekanan proporsi.

Pool tema konteks (28 tema di database) juga secara struktural condong ke tema institusional/komunitas (Pelayanan Publik, Ekonomi Kerakyatan & UMKM, Kesehatan Masyarakat, Pertanian & Perikanan) dan hampir tidak punya tema yang secara eksplisit personal-rumah-tangga individual (hanya ada 1: "Keuangan Pribadi & Tabungan", dan jarang terpilih AI dibanding tema institusional lain).

**Variasi Personal yang muncul selama ini murni kebetulan**, bukan hasil arahan sadar sistem.

---

## Kriteria Baru 2 — Tahap Pemodelan (Formulate) Eksplisit

### Definisi Operasional

- **FORMULATE (pemodelan eksplisit)**: soal memberi skenario mentah dan **menuntut siswa sendiri** menerjemahkannya ke bentuk simbolik (persamaan/pertidaksamaan/sistem persamaan/rasio berantai) — bentuk matematisnya **belum diberikan** di soal.
- **APPLY (terapan langsung)**: rumus/model/persamaan **sudah diberikan eksplisit** dalam soal (atau berupa rumus baku universal seperti L=p×l, Pythagoras, rata-rata), siswa tinggal mensubstitusi atau menjalankan prosedur.

### Hasil (SMP/MTs, n=26)

Fokus di jenjang SMP karena tahap ini paling relevan untuk materi aljabar/fungsi/SPLDV.

| Kategori | Jumlah | Persentase |
|---|---|---|
| APPLY (terapan langsung) | 21 | 81% |
| **FORMULATE (pemodelan eksplisit)** | **5** | **19%** |

### Contoh FORMULATE (5 soal)

- A24-SMP-MAT-30 dan A23-SMP-MAT-34 — dua transaksi harga berbeda, siswa harus menyusun SPLDV sendiri (persis pola soal resmi No. 13 yang dirujuk).
- A19-SMP-MAT-30 — median berubah setelah data baru masuk, siswa menyusun persamaan median dari kondisi verbal.
- A25-SMP-MAT-23 — rasio berantai ceri→gabah→green bean, harus disusun sendiri.
- A06-SMP-MAT-23 — translasi rasio 5:3 + batasan persediaan ke perhitungan proporsi.

### Contoh APPLY (representatif dari 21)

- A28-SMP-MAT-09 / A26-SMP-MAT-07 — L=s² langsung.
- A07-SMP-MAT-24 — teorema sudut sehadap/sepihak sudah baku.
- **Satu temuan ironis**: A22-SMP-MAT-30 — topik konsumsi bahan bakar genset, tapi modelnya **"V = 45 − 2,5t" justru sudah dituliskan langsung di soal**, sehingga siswa tidak pernah benar-benar diminta memodelkan meski konteksnya sangat cocok untuk itu.

### Status: SEBAGIAN SESUAI

FORMULATE hadir dan berkualitas baik saat muncul (2 dari 5 contoh adalah SPLDV yang disusun dengan benar, semirip pola soal resmi No. 13), tapi porsinya kecil (19%) dan setidaknya satu kasus nyata (A22-SMP-MAT-30) menunjukkan sistem kadang **memberikan model secara cuma-cuma** pada topik yang seharusnya menuntut pemodelan.

### Diagnosis — PROMPT, bukan kode

`matematikaRules()` hanya menyebut satu baris: *"Aplikasi — memodelkan situasi ke kalimat matematika dan menyelesaikannya"* sebagai salah satu dari 3 definisi level kognitif (bukan target proporsi wajib), dan tidak ada instruksi eksplisit "sekian persen butir aljabar/fungsi wajib meminta siswa menyusun persamaan sendiri, bukan diberi modelnya".

`competency-plan.ts` (FOKUS_SMP) mencantumkan fokus seperti "sistem persamaan linear dua variabel" dan "relasi dan fungsi" sebagai *topik*, tapi tidak menegaskan bahwa topik itu harus disajikan dalam **bentuk soal cerita mentah (menuntut formulate)**, bukan versi yang modelnya sudah diberikan.

---

## Tabel Prioritas Gap

| Prioritas | Temuan | Dampak | Akar (Prompt/Kode) |
|---|---|---|---|
| **1** | Kategori Personal nyaris tidak pernah muncul (~4%, kedua jenjang) | Soal terasa "institusional/publik" melulu, kurang mencerminkan kehidupan pribadi siswa sehari-hari (jajan sendiri, mainan, hobi pribadi) | Prompt — tidak ada instruksi/target proporsi kategori konteks |
| **2** | Tahap FORMULATE hanya 19% di SMP, dan kadang model "dibocorkan" langsung (A22-SMP-MAT-30) | Kompetensi "menyusun model" di FOKUS_SMP tidak selalu benar-benar diuji | Prompt — tidak ada instruksi eksplisit larangan memberi model jadi untuk topik yang seharusnya formulate |
| 3 | Pool tema konteks condong institusional, minim tema personal-rumah-tangga individual | Memperkuat temuan #1 secara struktural | Data (pool tema), bukan bug kode |

---

## Jawaban Eksplisit: Apakah Generator Sudah Punya Instruksi Sadar?

**Generator TIDAK memiliki instruksi sadar** untuk mengarahkan keragaman kategori Personal/Occupational/Societal/Scientific, dan **TIDAK memiliki instruksi eksplisit** yang membedakan/menargetkan proporsi tahap Formulate vs Apply.

Ini dipastikan lewat pembacaan langsung kode (`src/lib/generator/prompt-builder.ts` fungsi `GAYA_SOAL`, `matematikaRules`, dan `src/lib/generator/gemini-generator.ts`) — bukan dugaan. Satu-satunya jejak PISA yang benar-benar ada di prompt adalah **taksonomi PISA untuk literasi membaca** (`bahasaRules`, dipakai khusus Bahasa Indonesia), yang sama sekali berbeda dari kerangka konteks PISA Matematika yang diaudit di sini.

Variasi kategori konteks yang muncul selama ini **murni produk sampingan** dari kebebasan kreatif AI dan keacakan pemilihan tema pool — bukan hasil arahan yang disengaja.
