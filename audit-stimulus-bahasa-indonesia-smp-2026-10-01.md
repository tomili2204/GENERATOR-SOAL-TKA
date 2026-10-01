# LAPORAN AUDIT BACA SAJA (READ-ONLY)
## Kualitas Teks Stimulus Bahasa Indonesia Jenjang SMP/MTs Hasil Generator `soal.ayotka.id`
**Tanggal Audit:** 1 Oktober 2026  
**Status Audit:** READ-ONLY (Tanpa perubahan kode, prompt, skema, atau data)

---

## 1. LANGKAH 0 — BACA KODE

### a. Kutipan Instruksi yang Mengatur Teks Stimulus Bahasa Indonesia
Berikut adalah seluruh instruksi aktif dalam kode yang mengatur pembentukan teks stimulus Bahasa Indonesia:

#### 1. Panjang Kalimat, Jumlah Kata, dan Perbedaan SD vs SMP
* [`src/lib/generator/prompt-builder.ts:51-60`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts#L51-L60):
  ```typescript
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
  ```
* [`src/lib/generator/prompt-builder.ts:81-89`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts#L81-L89):
  ```typescript
  TEKS BACAAN JENJANG ${jenjang}:
  - Jenis teks: ${jenisTeks}.
  - Panjang dan rata-rata kalimat WAJIB: ${formatWacanaCriteriaText(jenjang)}. Jumlah kata di luar rentang (terlalu pendek maupun terlalu panjang) membuat stimulus ditolak sistem.
  - ${kalimatRules(jenjang)}
  - Tingkat kesulitan dinaikkan lewat isi (dua informasi yang perlu dibandingkan pembaca, sebab-akibat tersirat, data yang perlu dipadukan), bukan lewat kalimat yang lebih panjang atau rumit.
  - Paling banyak 2–3 istilah baru per teks, masing-masing dijelaskan dalam satu kalimat saat pertama muncul (contoh: 'Galah adalah tongkat bambu panjang.').
  - Sebelum menjawab, hitung sendiri jumlah kata dan rata-rata kata per kalimat setiap teks; revisi dulu bila di luar rentang.
  ```

#### 2. Kriteria Kuantitatif & Threshold Per Jenjang
* [`src/lib/generator/text-complexity.ts:22-38`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/text-complexity.ts#L22-L38):
  ```typescript
  export const JENJANG_TEXT_CRITERIA: Record<string, JenjangTextCriteria> = {
    "SD/MI": {
      minWords: 150,
      maxWords: 200,
      minWordsPerSentence: 3,
      maxWordsPerSentence: 7,
      allowComplexSentences: false,
      maxTechnicalTerms: 3,
    },
    "SMP/MTs": {
      minWords: 200,
      maxWords: 250,
      minWordsPerSentence: 5,
      maxWordsPerSentence: 9,
      allowComplexSentences: false,
      maxTechnicalTerms: 3,
    },
  };
  ```

#### 3. Penyisipan Definisi Istilah
* [`src/lib/generator/prompt-builder.ts:87`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts#L87):
  > *"Paling banyak 2–3 istilah baru per teks, masing-masing dijelaskan dalam satu kalimat saat pertama muncul (contoh: 'Galah adalah tongkat bambu panjang.')."*
* [`src/lib/generator/prompt-builder.ts:27`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts#L27):
  > *"Istilah yang belum umum bagi siswa jenjang ini dijelaskan singkat saat pertama muncul."*

#### 4. Kewajiban Format Paragraf
* Pada seluruh berkas generator ([`prompt-builder.ts`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts), [`gemini-generator.ts`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/gemini-generator.ts)), **TIDAK ADA instruksi eksplisit yang mewajibkan pembagian paragraf (menggunakan `\n\n`)**. Satu-satunya aturan pemisah `\n\n` adalah pemisah antarteks pada stimulus ganda (*Teks 1* dan *Teks 2*). Akibatnya, LLM menganggap teks cukup ditulis sebagai satu blok kalimat bersambung.

---

### b. Validator, Post-Processing, dan Parameter Generasi
1. **Gerbang Validasi Wacana Lapis 1 (Reject or Repair):**
   * [`src/lib/generator/text-complexity.ts:264-297`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/text-complexity.ts#L264-L297):
     Validasi menghitung `wordCount` dan `roundedAvgWps` (kata per kalimat). Untuk SMP, batas toleransi kata adalah $180 - 275$ kata, dan batas rata-rata kata per kalimat adalah $4 - 10$ kata/kalimat. Jika di luar angka ini, teks ditolak sebagai **"cacat"**.
2. **Post-Processing Penulisan Ulang Otomatis (`repairStimulusWacana`):**
   * [`src/lib/generator/gemini-generator.ts:181-204`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/gemini-generator.ts#L181-L204):
     Jika stimulus gagal lolos rentang angka di atas, sistem memanggil fungsi `repairStimulusWacana` dengan suhu rendah (`temperature: 0.3`) dan prompt instruksi:
     > *"Target WAJIB dipenuhi: 200-250 kata, rata-rata 5-9 kata/kalimat (jenjang SMP/MTs). Kalimat dihitung berdasarkan tanda titik/tanya/seru. Tulis ulang teks ini agar tepat memenuhi target di atas... Sebelum menjawab, hitung sendiri secara internal jumlah kata total dan rata-rata kata per kalimat..."*
     Proses ini memaksa LLM memotong kalimat-kalimat panjang menjadi kalimat kerdil agar rata-rata berada di sekitar 7 kata/kalimat.
3. **Setelan Parameter Pemanggilan AI:**
   * [`src/lib/generator/gemini-generator.ts:59`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/gemini-generator.ts#L59): Default `temperature = 0.7`.
   * [`src/lib/generator/gemini-generator.ts:110-114`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/gemini-generator.ts#L110-L114): `responseMimeType: "application/json"`, `maxOutputTokens: 16384`.

---

### c. Label Kompetensi Bahasa: Perkaban vs Kode Generator
* **Ketentuan Resmi Perkaban BSKAP No. 47/2025:**
  Hanya memiliki **3 taksonomi kompetensi**:
  1. *Pemahaman Tekstual*
  2. *Pemahaman Inferensial*
  3. *Evaluasi dan Apresiasi*
* **Implementasi di Kode Generator Saat Ini:**
  [`src/lib/generator/prompt-builder.ts:70-80`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts#L70-L80) secara eksplisit mewajibkan **DUA sistem taksonomi sekaligus (6 label)**:
  1. **Taksonomi Domestik**: *Pemahaman Tekstual*, *Pemahaman Inferensial*, *Evaluasi dan Apresiasi*.
  2. **Taksonomi Gaya PISA**: *Mengakses dan Menemukan Informasi*, *Menginterpretasi dan Mengintegrasi*, *Mengevaluasi dan Merefleksi*.
  Akibatnya, di basis data soal SMP Bahasa Indonesia saat ini terdapat percampuran label Perkaban dan label gaya PISA.

---

### d. Jejak Git Log (Kapan Aturan Ditambahkan / Berubah)
Berdasarkan penelusuran `git log` pada berkas-berkas terkait:
1. **Commit `00fc0b5` (Inisialisasi Proyek):**
   Memperkenalkan modul `text-complexity.ts` pertama kali dengan batasan kaku SD (150–200 kata, 3–7 kpk) dan SMP (200–250 kata, 5–9 kpk).
2. **Commit `5d4aef5` (Senin, 21 September 2026 11:34 WIB):**
   `feat(bin): perbaiki gaya kalimat stimulus & tambah dukungan antarteks`. Memperkenalkan pembagian teks antarteks.
3. **Commit `3fd9d98` (Minggu, 27 September 2026 20:25 WIB):**
   `fix(prompt): taksonomi kompetensi ganda PISA + pagar kewajaran istilah kontekstual`. Menambahkan label taksonomi PISA ke prompt generator.
4. **Commit `69477e3` (Senin, 28 September 2026 06:01 WIB):**
   `feat(generator): prompt berbasis contoh Pusmendik + keandalan proses generate`. Memisahkan prompt ke `prompt-builder.ts` dan menambahkan contoh konkret kalimat SMP: *"Contoh benar (rata-rata 7 kata per kalimat)"* serta larangan kalimat majemuk bertingkat.
5. **Commit `0422ca9` (Senin, 28 September 2026 22:09 WIB):**
   `fix(text-complexity): toleransi tipis pada gerbang validasi panjang wacana`. Menambahkan toleransi $\pm 10\%$ kata dan $\pm 1$ kpk untuk menghindari penolakan stimulus secara massal.

---

## 2. LANGKAH 1 — SAMPEL BASIS DATA

Audit memeriksa seluruh populasi stimulus Bahasa Indonesia yang aktif berelasi dengan butir soal di database:
* **Populasi Total Dianalisis:**
  * **SMP/MTs:** 164 stimulus unik (dari 23 paket soal: `A01-SMP-BIN` s.d. `A29-SMP-BIN`).
  * **SD/MI (Pembanding):** 131 stimulus unik (dari 19 paket soal: `A01-SD-BIN` s.d. `A23-SD-BIN`).
* **Rentang Tanggal:** 17 September 2026 hingga 30 September 2026.
* **Status Soal:** `dalam_validasi` (mayoritas), `menunggu_validasi`, dan `draft`.
* **Metode Penghitungan:** Satu stimulus grup (dipakai oleh 2–4 butir soal) dihitung tepat **satu kali**.

---

## 3. LANGKAH 2 & 5 — METRIK OTOMATIS: SD vs SMP

> **Catatan Langkah 5 (Pembanding Resmi):** Berkas `contoh-soal-tka-referensi.md` tidak ditemukan di dalam repositori proyek (`soal.ayotka.id`). Sesuai instruksi ketat audit, **pembanding kuantitatif resmi dinyatakan TIDAK TERSEDIA** dan metrik tidak direkayasa.

### Tabel Ringkasan Metrik Otomatis (Populasi Penuh: 164 SMP vs 131 SD)

| Metrik Analisis Teks | SD/MI (N = 131) | SMP/MTs (N = 164) | Catatan Kritis |
| :--- | :---: | :---: | :--- |
| **Panjang Teks (Kata)** | Rata-rata **169,5** (Min 138, Maks 203) | Rata-rata **221,2** (Min 182, Maks 252) | Keduanya sangat patuh pada rentang kuota teks. |
| **Jumlah Kalimat** | Rata-rata **29,1** kalimat | Rata-rata **29,4** kalimat | **Anomali**: Jumlah kalimat SMP sama banyaknya dengan SD! |
| **Jumlah Paragraf** | Rata-rata **1,40** paragraf | Rata-rata **1,60** paragraf | **91% stimulus SMP hanya 1 paragraf utuh** (tanpa jeda `\n\n`). |
| **Panjang Kalimat (KPK)** | Rata-rata **6,00** kata/kalimat | Rata-rata **7,76** kata/kalimat | SMP hanya terpaut tipis (+1,7 kata) dari SD. |
| **Simpangan Baku KPK** | **1,53** kata | **1,58** kata | Variasi panjang kalimat sangat rendah (monoton). |
| **Kalimat > 12 Kata** | **1,2%** | **9,6%** | Hanya <10% kalimat SMP yang memiliki panjang wajar. |
| **Kalimat > 20 Kata** | **0,1%** | **0,1%** | Hampir 0% kalimat kompleks/majemuk bertingkat. |
| **Rerata Pola Definisi** | **1,66** per stimulus (Total: 217) | **2,13** per stimulus (Total: 350) | Setiap teks SMP rata-rata menyisipkan **>2 kalimat definisi**. |
| **Type-Token Ratio (TTR)** | **63,8%** | **66,5%** | Tingkat keberagaman kosakata moderat. |
| **5 Pembuka Kalimat Terbanyak** | *Mereka* (158x), *Warga* (67x), *Pak* (62x), *Petugas* (58x), *Ada* (49x) | *Mereka* (157x), *Pak* (100x), *Siswa* (64x), *Proses* (53x), *Ia* (53x) | Pola kalimat sangat repetitif diawali pronomina/subjek tunggal. |

### Distribusi Frekuensi Konjungsi Antarkalimat (Total Kemunculan di 164 Teks SMP)
* `namun`: 61 kemunculan
* `tetapi`: 41 kemunculan
* `karena`: **hanya 12 kemunculan** di seluruh 164 teks!
* `selain itu`: 9 kemunculan
* `bahkan`: 5 kemunculan
* `sementara itu`: 4 kemunculan
* `oleh karena itu`: 3 kemunculan
* `akibatnya`: 3 kemunculan
* `sehingga`: **hanya 1 kemunculan** di seluruh 164 teks!
* `meskipun`: **hanya 1 kemunculan** di seluruh 164 teks!
* `padahal`: **hanya 1 kemunculan** di seluruh 164 teks!
* `walaupun`: **0 kemunculan** (lenyap total)!

> **Kesimpulan Kuantitatif:** Konjungsi subordinatif (*karena, sehingga, meskipun, walaupun, akibatnya*) hampir punah dari teks SMP. Teks terpecah menjadi runtutan kalimat tunggal 6–8 kata yang kaku.

### Distribusi Genre Teks SMP
1. Eksposisi / Informasi: **94 stimulus (57,3%)**
2. Narasi / Cerpen: **29 stimulus (17,7%)**
3. Teks Ganda Antarteks: **26 stimulus (15,9%)**
4. Prosedur: **6 stimulus (3,7%)**
5. Berita: **5 stimulus (3,0%)**
6. Laporan Observasi: **4 stimulus (2,4%)**

---

## 4. LANGKAH 3 — PENILAIAN KUALITATIF (SAMPEL 10 STIMULUS SMP ACAK)

Berikut analisis terhadap 10 stimulus SMP yang dipilih secara representatif dari paket yang berbeda sepanjang rentang tanggal pengujian:

1. **`stm-1789702902576-z1kw` (Paket `A08-SMP-BIN`, 18 Sep 2026 - Teks Informasi Budidaya Maggot)**
   * **a. Informasi Tersirat:** Sangat minim. Sikap peternak dan manfaat maggot diuraikan gamblang di baris pertama dan kedua.
   * **b. Sudut Pandang/Argumen:** Tidak ada ambiguitas; teks berupa fakta datar searah.
   * **c. Kalimat Pengisi/Repetisi:** *"Lalat tentara hitam berbeda dari lalat rumah biasa."* dilanjutkan *"Lalat ini tidak menularkan penyakit."* (pengisi panjang kalimat).
   * **d. Penggambaran Emosi:** N/A (Teks Informasi).

2. **`stm-1789771020433-va94` (Paket `A09-SMP-BIN`, 18 Sep 2026 - Teks Informasi Bioflok Lele)**
   * **a. Informasi Tersirat:** Hampir tidak ada; keuntungan hemat pakan dan waktu panen dituliskan angka eksplisitnya.
   * **b. Sudut Pandang/Argumen:** Tidak ada dinamika atau pro-kontra budidaya.
   * **c. Kalimat Pengisi:** Menyisipkan definisi: *"Gumpalan itu sering disebut dengan istilah bioflok."*

3. **`stm-1789857433629-a9w1` (Paket `A10-SMP-BIN`, 19 Sep 2026 - Inovasi Tepung Singkong)**
   * **a. Informasi Tersirat:** Faktor keberhasilan ekonomi langsung dirinci per kalimat.
   * **b. Sudut Pandang/Argumen:** Kalimat opini sangat minim, hanya mencantumkan data harga.
   * **c. Kalimat Pengisi:** Kalimat pertama langsung definisi kaku: *"Singkong adalah komoditas pangan sangat melimpah di desa."*

4. **`stm-1790519754439-h9ru` (Paket `A18-SMP-BIN`, 27 Sep 2026 - Teks Antarteks Listrik Mikrohidro)**
   * **a. Informasi Tersirat:** Tidak ada sebab tersirat; alasan jaringan kabel belum masuk ditulis eksplisit karena *"kontur perbukitan terjal"*.
   * **b. Sudut Pandang/Argumen:** Perbandingan dua teks hanya memaparkan kondisi desa A mandiri mikrohidro dan desa B menunggu tiang listrik PLN.
   * **c. Kalimat Pengisi:** Menyisipkan definisi kaku di tengah paragraf: *"Gardu tersebut merupakan pusat transmisi listrik utama."*
   * **d. Penggambaran Emosi:** Dinyatakan eksplisit: *"Kini, anak-anak dapat belajar dengan gembira pada malam hari."*

5. **`stm-1790520341131-y11p` (Paket `A20-SMP-BIN`, 27 Sep 2026 - E-Voting Pemilihan Ketua OSIS)**
   * **a. Informasi Tersirat:** Tidak ada; langkah pencegahan antrean ditulis harfiah: *"Panitia membagi jadwal ke dalam tiga sesi."*
   * **b. Sudut Pandang/Argumen:** Tidak ada ruang evaluasi kelemahan e-voting.
   * **c. Kalimat Pengisi/Definisi:** Menyisipkan dua kalimat definisi canggung berturut-turut:
     * *"Bilik digital adalah bilik suara dengan komputer."* (7 kata)
     * *"Pangkalan data adalah tempat penyimpanan data terpusat."* (7 kata)

6. **`stm-1790524556714-a3eg` (Paket `A22-SMP-BIN`, 27 Sep 2026 - Koperasi Siswa Bina Warga)**
   * **a. Informasi Tersirat:** Tidak ada sama sekali; seluruh skema simpanan ditulis persis seperti klausul tabel brosur bank.
   * **b. Sudut Pandang/Argumen:** Tidak ada narasi yang bisa dievaluasi atau dikritisi.
   * **c. Kalimat Pengisi:** **Terdapat 10 kalimat definisi/eksplisit berturut-turut**, di antaranya:
     * *"Jatuh tempo adalah batas akhir simpanan."*
     * *"Penalti adalah biaya denda administrasi koperasi."*
     * *"Bagi hasil setahun adalah tiga persen."*
     * *"Biaya penalti penarikan adalah nol rupiah."*

7. **`stm-1790529923748-cl8l` (Paket `A25-SMP-BIN`, 27 Sep 2026 - Sentra Kerajinan Anyaman Bambu)**
   * **a. Informasi Tersirat:** Alasan pembeli memesan wadah bambu ditulis eksplisit: *"Wadah bambu dinilai lebih ramah lingkungan."*
   * **b. Sudut Pandang/Argumen:** Tidak ada sudut pandang kritis.
   * **c. Kalimat Pengisi:** Menyisipkan kalimat definisi terisolasi: *"Tampah merupakan wadah bundar penampi beras."*

8. **`stm-1790551828295-p7iw` (Paket `A26-SMP-BIN`, 28 Sep 2026 - Budi Daya Lebah Kelulut SMP Bina Insan)**
   * **a. Informasi Tersirat:** Seluruh jadwal dan pakan lebah ditulis serba eksplisit.
   * **b. Sudut Pandang/Argumen:** Teks deskriptif datar.
   * **c. Kalimat Pengisi:** Terdapat dua kalimat definisi kaku:
     * *"Kelulut adalah jenis lebah kecil tanpa sengat."*
     * *"Nektar adalah cairan manis pada bunga."* (Siswa SMP tentu sudah tahu apa itu nektar).

9. **`stm-1790721457051-a4xe` (Paket `A28-SMP-BIN`, 29 Sep 2026 - Cerita Pawai Sepeda Hias Budi & Rian)**
   * **a. Informasi Tersirat:** Sikap tolong-menolong Danu tidak dibiarkan tersirat, melainkan ditulis langsung: *"Danu dengan senang hati memberikan sisa lem kayu."*
   * **b. Sudut Pandang/Argumen:** Tidak ada konflik batin atau dilema tokoh.
   * **c. Kalimat Pengisi:** Di tengah narasi fiksi, AI menyisipkan kalimat definisi benda:
     * *"Bilah bambu adalah belahan bambu tipis dan lentur."*
   * **d. Penggambaran Emosi:** **Seluruhnya dinyatakan secara langsung**, tidak ada yang *show, don't tell*:
     * *"Budi dan Rian sangat bersemangat ikut serta."*
     * *"Danu dengan senang hati memberikan..."*
     * *"Warga desa bersorak riang di sepanjang jalan."*
     * *"Keringat mereka terbayar lunas oleh kegembiraan bersama warga."*

10. **`stm-1790807860303-ztcp` (Paket `A29-SMP-BIN`, 30 Sep 2026 - Posyandu Lansia Desa Melati)**
    * **a. Informasi Tersirat:** Tidak ada informasi tersirat; seluruh mekanisme antrean dan kendala sinyal ditulis eksplisit.
    * **b. Sudut Pandang/Argumen:** Kronologis datar tanpa perdebatan efektivitas teknologi bagi lansia.
    * **c. Kalimat Pengisi:**
      * *"Lansia adalah sebutan bagi warga lanjut usia."* (Kalimat ke-6 muncul tiba-tiba).
      * Repetisi beruntun: *"Kader posyandu mencatat nama setiap warga lansia."* $\rightarrow$ *"Pendaftaran dicatat lewat aplikasi pada telepon pintar."*
    * **d. Penggambaran Emosi:** Dinyatakan eksplisit: *"Warga merasa nyaman saat berada di lokasi."*, *"Banyak warga lansia senang karena jadwal pasti."*

---

## 5. LANGKAH 4 — KAITAN STIMULUS DENGAN BUTIR SOAL

Dari 10 stimulus di atas, dilakukan penelaahan terhadap seluruh butir soal yang menempel. Ditemukan fenomena sistemik: **soal yang dilabeli `Pemahaman Inferensial` atau `Evaluasi dan Apresiasi` jawabannya ternyata tertulis 100% EKSPLISIT di dalam teks.**

| ID Soal | Stimulus Terkait | Label Kompetensi pada Soal | Teks Pertanyaan | Realitas Fakta di Teks (Ketidaksesuaian Kognitif) |
| :--- | :--- | :--- | :--- | :--- |
| **`A28-SMP-BIN-02`** | `stm-1790721457051-a4xe` | `Pemahaman Inferensial: menentukan watak tokoh` | *Tindakan Danu yang membagikan lem miliknya kepada Rian menunjukkan watak tokoh yang ....* | **TIDAK SESUAI (Eksplisit)**. Teks langsung menyebut: *"Danu dengan senang hati memberikan sisa lem kayu miliknya"*. Siswa tidak perlu menyimpulkan watak dari perbuatan; kata kuncinya tertulis. |
| **`A28-SMP-BIN-03`** | `stm-1790721457051-a4xe` | `Pemahaman Inferensial: hubungan sebab-akibat` | *Mengapa Budi dan Rian merasa keringat serta lelah mereka terbayar lunas saat pawai berlangsung?* | **TIDAK SESUAI (Eksplisit)**. Kalimat soal mengutip kata demi kata dari teks: *"Keringat mereka terbayar lunas oleh kegembiraan bersama warga"*. |
| **`A29-SMP-BIN-02`** | `stm-1790807860303-ztcp` | `Menginterpretasi & Mengintegrasi: menyimpulkan langkah` | *Pilihlah semua upaya yang dilakukan pihak posyandu untuk mengatasi kendala warga...* | **TIDAK SESUAI (Eksplisit)**. Kunci jawaban A & B tercantum persis di teks: *"Petugas membantu mengisi formulir"* dan *"Kader mendatangi langsung lansia di pelosok"*. Tidak ada integrasi data. |
| **`A29-SMP-BIN-03`** | `stm-1790807860303-ztcp` | `Mengevaluasi & Merefleksi: menilai kesesuaian dampak` | *Tentukan apakah setiap pernyataan berikut Sesuai atau Tidak Sesuai...* | **TIDAK SESUAI (Tekstual Murni)**. Soal evaluasi ini hanya menanyakan pencocokan kalimat deskriptif waktu tunggu dan jam periksa dari bacaan. |
| **`A18-SMP-BIN-03`** | `stm-1790519754439-h9ru` | `Menginterpretasi & Mengintegrasi: sebab-akibat antarteks` | *Apa alasan utama jaringan kabel listrik negara belum tersambung ke Desa Mekarwangi pada Teks 2?* | **TIDAK SESUAI (Eksplisit)**. Alasan tertulis secara harfiah di Teks 2: *"karena kontur perbukitan terjal dan jalan sempit"*. Tidak ada perbandingan antarteks yang dituntut. |
| **`A20-SMP-BIN-02`** | `stm-1790520341131-y11p` | `Pemahaman Inferensial: menyimpulkan kelogisan` | *Manakah faktor-faktor yang mendukung kelancaran e-voting...* | **TIDAK SESUAI (Eksplisit)**. Semua opsi benar hanya menyalin 3 kalimat berurutan di paragraf 1. |
| **`A25-SMP-BIN-03`** | `stm-1790529923748-cl8l` | `Pemahaman Inferensial: menarik simpulan sebab-akibat` | *Tentukan apakah setiap pernyataan berikut Sesuai atau Tidak Sesuai...* | **TIDAK SESUAI (Tekstual Murni)**. Seluruh pernyataan dicocokkan langsung dengan teks bambu tali yang lentur. |

---

## 6. STATUS TEMUAN AUDIT

Berdasarkan bukti empiris dan penelusuran kode, berikut rekap status temuan:

1. **Panjang Kalimat Monoton & Kerdil (Rata-rata 7 Kata/Kalimat): `TIDAK SESUAI`**
   * **Bukti**: Pada 164 stimulus SMP, 90,4% kalimat berada di bawah 12 kata dengan simpangan baku hanya 1,58. Kalimat berulang-ulang berpanjang persis 6–8 kata.
2. **Ketiadaan Pembagian Paragraf: `TIDAK SESUAI`**
   * **Bukti**: Rata-rata paragraf SMP hanya 1,60. Lebih dari 90% stimulus berupa satu bongkahan teks padat tanpa pembagian pembuka, isi, dan penutup.
3. **Penyisipan Kalimat Definisi Kaku ("X adalah ...", "X merupakan ..."): `TIDAK SESUAI`**
   * **Bukti**: Ditemukan rata-rata 2,13 kalimat definisi per stimulus (total 350 definisi pada sampel SMP). Contoh: *"Lansia adalah sebutan bagi warga lanjut usia"* ([`A29-SMP-BIN`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts)), *"Bilah bambu adalah belahan bambu tipis dan lentur"* ([`A28-SMP-BIN`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts)), *"Bilik digital adalah bilik suara dengan komputer"* ([`A20-SMP-BIN`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts)).
4. **Keberadaan Informasi Tersirat & Ruang Evaluasi: `TIDAK SESUAI`**
   * **Bukti**: Seluruh fakta, motif, dan emosi dinyatakan serba gamblang dan eksplisit. Soal berlabel inferensial/evaluasi turun derajat menjadi sekadar pencarian kata (*string matching*).
5. **Kepatuhan Kuota Jumlah Kata Total (200–250 Kata): `SESUAI`**
   * **Bukti**: Rata-rata panjang kata teks SMP adalah 221,2 kata (semua berada di rentang 182–252 kata).
6. **Variasi Genre Teks: `SEBAGIAN SESUAI`**
   * **Bukti**: Terdapat teks ganda antarteks (15,9%) dan fiksi/cerpen (17,7%), namun 57,3% didominasi eksposisi fakta sederhana. Genre ulasan kritis, argumentasi opini, dan teks sastra kaya metafora belum terwakili secara optimal.

---

## 7. DIAGNOSIS SUMBER MASALAH PADA KODE

### 1. Terbukti dari Kode (Definitif)
1. **Instruksi Batas KPK yang Terlalu Rendah di SMP:**
   * Di [`src/lib/generator/text-complexity.ts:34-35`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/text-complexity.ts#L34-L35), ambang batas SMP disetel `minWordsPerSentence: 5, maxWordsPerSentence: 9`.
   * Di [`src/lib/generator/prompt-builder.ts:57`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts#L57), AI diberi contoh: *"Contoh benar (rata-rata 7 kata per kalimat)"*.
   * **Dampak**: Model LLM mengunci target pembuatan kalimat pada angka persis 7 kata per kalimat untuk memastikan teks lolos validasi.
2. **Larangan Kalimat Majemuk Bertingkat di SMP:**
   * Di [`src/lib/generator/prompt-builder.ts:56`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts#L56): *"Jangan memakai kalimat majemuk bertingkat (anak kalimat dengan 'yang', 'karena', 'meskipun', 'apabila' di tengah kalimat panjang)."*
   * Di [`src/lib/generator/text-complexity.ts:36`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/text-complexity.ts#L36): `allowComplexSentences: false`.
   * **Dampak**: Hilangnya seluruh konjungsi pengait logika (*karena, sehingga, meskipun*). AI tidak dapat membangun hubungan kausalitas bertingkat yang menjadi syarat utama timbulnya makna tersirat (inferensi).
3. **Penyisipan Kalimat Definisi Benda Biasa:**
   * Di [`src/lib/generator/prompt-builder.ts:87`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts#L87): *"Paling banyak 2–3 istilah baru per teks, masing-masing dijelaskan dalam satu kalimat saat pertama muncul (contoh: 'Galah adalah tongkat bambu panjang.')."*
   * Di [`src/lib/generator/text-complexity.ts:302-306`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/text-complexity.ts#L302-L306): Validator mengeluarkan peringatan jika ada istilah teknis tanpa kalimat penjelas definisi langsung.
   * **Dampak**: AI memperlakukan kata-kata umum seperti *lansia*, *nektar*, *bilah bambu*, dan *koperasi* sebagai "istilah baru" yang wajib disisipkan kalimat definisinya secara kaku di tengah narasi.
4. **Ketiadaan Aturan Struktur Paragraf:**
   * Tidak ada parameter atau prompt yang menginstruksikan teks bacaan wajib dibagi menjadi 2–3 paragraf terpisah (`\n\n`), sehingga AI mencetaknya dalam satu blok kalimat bersambung.

### 2. Dugaan / Faktor Tambahan (Hipotetis)
* **Kompensasi Token Penalti (Auto-Repair):**
  Fungsi `repairStimulusWacana` dijalankan dengan suhu rendah (`temperature: 0.3`) jika teks awal gagal validasi wacana. Prompt perbaikan menginstruksikan AI menghitung titik dan kata secara ketat, yang secara alami menghasilkan kalimat-kalimat pendek berulang agar aman dari kegagalan validasi.

---

## 8. DAFTAR OPSI PERBAIKAN (MENGUTAMAKAN RUANG KREATIF / IZIN)

*Sesuai arahan audit, opsi-opsi di bawah ini HANYA berupa rekomendasi arsitektur dan TIDAK diimplementasikan saat ini.*

### Opsi 1: Memberikan Izin Kalimat Majemuk Wajar & Menaikkan Ambang KPK SMP
* **Konsep**: Mengubah larangan kaku menjadi **izin pemakaian kalimat majemuk bertingkat wajar**. Mengganti batas sempit 5–9 kata/kalimat menjadi **8–14 kata/kalimat** (atau rentang toleransi 7–16) khusus untuk jenjang SMP/MTs.
* **Prinsip**: *"Izinkan teks mengalir alami dengan kalimat majemuk bertingkat pendek (menggunakan konjungsi sebab-akibat, waktu, dan pengandaian), tanpa membatasi panjang kalimat secara seragam."*
* **Berkas yang Disentuh**:
  1. [`src/lib/generator/text-complexity.ts`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/text-complexity.ts) (ubah `JENJANG_TEXT_CRITERIA["SMP/MTs"]` dari `5-9` menjadi `8-14`, set `allowComplexSentences: true`).
  2. [`src/lib/generator/prompt-builder.ts`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts) (perbarui fungsi `kalimatRules("SMP")`).
* **Risiko Regresi ke Teks SD**: **NOL (0%)**, karena aturan SD tetap berada di blok kondisi `jenjang.includes("SD")` yang terpisah (tetap menjaga kalimat tunggal dasar untuk anak SD).

### Opsi 2: Memberi Izin Struktur Multi-Paragraf
* **Konsep**: Menghapus kesan satu blok teks dengan mengizinkan (atau memandu) pembagian teks ke dalam **2 hingga 3 paragraf logis** yang dipisahkan oleh karakter baris ganda (`\n\n`).
* **Prinsip**: Paragraf 1 (Konteks/Pengantar), Paragraf 2 (Dinamika/Masalah/Data), Paragraf 3 (Solusi/Refleksi).
* **Berkas yang Disentuh**:
  1. [`src/lib/generator/prompt-builder.ts`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts) (tambahkan panduan paragraf pada `bahasaRules`).
* **Risiko Regresi ke Teks SD**: **Sangat Rendah**. Untuk SD, dapat tetap diizinkan 2 paragraf pendek (masing-masing 75–100 kata).

### Opsi 3: Menghapus Kewajiban Kalimat Definisi untuk Kosakata Umum
* **Konsep**: Menegaskan bahwa untuk jenjang SMP, kosakata umum bahasa Indonesia (seperti *lansia, koperasi, nektar, pupuk, perahu, kemerdekaan*) **TIDAK PERLU didefinisikan**. Kalimat definisi hanya boleh muncul jika topik mengangkat konsep ilmiah/teknis khusus yang benar-benar asing bagi siswa SMP, dan maknanya diserap secara kontekstual di dalam kalimat, bukan berupa kalimat definisi terisolasi (*"X adalah ..."*).
* **Berkas yang Disentuh**:
  1. [`src/lib/generator/prompt-builder.ts`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts) (pada bagian penjelasan istilah baru).
  2. [`src/lib/generator/text-complexity.ts`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/text-complexity.ts) (tambahkan *whitelist* kata umum agar tidak memicu peringatan istilah teknis).
* **Risiko Regresi ke Teks SD**: **Nol**.

### Opsi 4: Harmonisasi Taksonomi Kompetensi (Perkaban vs PISA)
* **Konsep**: Menghilangkan kebingungan taksonomi ganda. Kembalikan label kompetensi secara disiplin ke 3 taksonomi resmi Perkaban BSKAP (*Pemahaman Tekstual, Pemahaman Inferensial, Evaluasi dan Apresiasi*) ATAU tetapkan pemetaan (*mapping*) satu-ke-satu yang tegas, serta beri instruksi bahwa untuk soal Inferensial, jawaban dilarang keras dapat disalin langsung dari teks (*wajib menuntut penyimpulan*).
* **Berkas yang Disentuh**:
  1. [`src/lib/generator/prompt-builder.ts`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/prompt-builder.ts)
  2. [`src/lib/generator/gemini-generator.ts`](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/generator/gemini-generator.ts)
* **Risiko Regresi ke Teks SD**: **Nol**.
