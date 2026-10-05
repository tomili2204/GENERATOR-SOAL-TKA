# PANDUAN STANDAR TAKSONOMI & INTEGRASI MODUL RAPOR TKA
**Dokumen Referensi Arsitektur Sistem untuk Firerza & Antigravity (ayotka.id)**  
*Terakhir Diperbarui: Oktober 2026*  
*Sumber Standar: Pusmendik Kemendikdasmen RI (Portal Resmi Daya Serap TKA 2025/2026: https://tka.kemendikdasmen.go.id/hasiltka/daya-serap)*

---

## 1. Latar Belakang & Tujuan

Dokumen ini disusun sebagai panduan teknis dan acuan arsitektur data bagi **Firerza** dan agen **Antigravity** dalam mengembangkan modul **Rapor Hasil Tryout** pada portal siswa `ayotka.id`.

Sistem generator soal (`soal.ayotka.id`) dan modul ujian siswa (`ayotka.id`) menggunakan basis data Supabase PostgreSQL yang sama. Seluruh 3.429 butir soal di database telah disinkronkan dengan **225 Indikator Resmi Pusmendik Kemendikdasmen RI**. 

Agar modul Rapor Tryout di `ayotka.id` memiliki tampilan, struktur taksonomi, dan analisis daya serap yang **100% identik dengan Rapor Resmi Kemendikdasmen**, Antigravity pada project `ayotka.id` wajib mengikuti arsitektur yang dijelaskan di bawah ini.

---

## 2. Perbedaan Fundamental Hierarki Taksonomi per Mata Pelajaran

Dalam asesmen resmi Kemendikdasmen RI, terdapat perbedaan kedalaman hierarki antara mata pelajaran **Bahasa Indonesia** dan **Matematika**:

```
+---------------------------------------------------------------------------------+
|                                 BAHASA INDONESIA (3 TINGKAT)                    |
|                                                                                 |
|  [Tingkat 1] KOMPETENSI       : Pemahaman Tekstual / Inferensial / Evaluasi     |
|         │                                                                       |
|         ▼                                                                       |
|  [Tingkat 2] SUBKOMPETENSI    : Mengidentifikasi penggunaan istilah dsb         |
|         │                                                                       |
|         ▼                                                                       |
|  [Tingkat 3] INDIKATOR        : Menentukan makna kata dalam teks (1)            |
+---------------------------------------------------------------------------------+

+---------------------------------------------------------------------------------+
|                                   MATEMATIKA (4 TINGKAT)                        |
|                                                                                 |
|  [Tingkat 1] ELEMEN           : Bilangan / Aljabar / Geometri / Data            |
|         │                                                                       |
|         ▼                                                                       |
|  [Tingkat 2] SUBELEMEN        : Bilangan Real / Rasional / Datar dsb            |
|         │                                                                       |
|         ▼                                                                       |
|  [Tingkat 3] KOMPETENSI       : Kemampuan memahami & bernalar tingkat tinggi... |
|         │                                                                       |
|         ▼                                                                       |
|  [Tingkat 4] INDIKATOR        : Menyelesaikan operasi bilangan bentuk pangkat (1)|
+---------------------------------------------------------------------------------+
```

### Tabel Perbandingan Struktur Resmi

| Parameter | Bahasa Indonesia | Matematika |
| :--- | :--- | :--- |
| **Jumlah Tingkat** | **3 Tingkat** | **4 Tingkat** |
| **Tingkat 1** | **Kompetensi** *(contoh: Pemahaman Tekstual, Pemahaman Inferensial, Evaluasi dan Apresiasi)* | **Elemen** *(contoh: Bilangan, Aljabar, Geometri dan Pengukuran, Data dan Peluang)* |
| **Tingkat 2** | **Subkompetensi** *(contoh: Mengidentifikasi penggunaan istilah dalam berbagai bidang)* | **Subelemen** *(contoh: Bilangan Real, Bilangan Rasional)* |
| **Tingkat 3** | **Indikator** *(contoh: Mengidentifikasi makna penggunaan istilah bidang tertentu dalam teks. (1))* | **Kompetensi** *(contoh: Kemampuan memahami, mengaplikasikan, dan bernalar yang lebih tinggi untuk menyelesaikan permasalahan...)* |
| **Tingkat 4** | *(Tidak ada / langsung ke butir soal)* | **Indikator** *(contoh: Menyelesaikan operasi bilangan bentuk pangkat (1))* |

> **PENTING UNTUK UI RAPOR**:  
> Di halaman Rapor Tryout siswa, kartu taksonomi dan bagan daya serap untuk Bahasa Indonesia **JANGAN** menampilkan label "Elemen" atau "Subelemen" agar tidak rancu dan membingungkan guru/siswa. Gunakan label resmi: **Kompetensi -> Subkompetensi -> Indikator**.

---

## 3. Struktur Tabel Database Supabase (`soal.questions`)

Tabel utama bank soal berada pada skema `soal` tabel `questions`.

### Kolom-Kolom Kunci

| Nama Kolom | Tipe Data | Deskripsi |
| :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` | ID unik soal (contoh: `soal-ai-1790585355097-20-mht8`) |
| `code` | `TEXT UNIQUE` | Kode slot paket (contoh: `A01-SMP-BIN-20`, `A11-SD-MAT-06`) |
| `jenjang` | `TEXT` | `SD/MI` atau `SMP/MTs` |
| `mapel` | `TEXT` | `Bahasa Indonesia` atau `Matematika` |
| `elemen` | `TEXT` | Untuk Mat: Elemen (`Bilangan`). Untuk BIN: Kompetensi Utama (`Pemahaman Tekstual`) atau kategori membaca |
| `sub_elemen` | `TEXT` | Untuk Mat: Subelemen (`Bilangan Real`). Untuk BIN: Subkompetensi spesifik |
| `kompetensi` | `TEXT` | Untuk Mat: Deskripsi Kompetensi. Untuk BIN: Kompetensi Utama atau Subkompetensi |
| `indikator` | `TEXT` | **Rumusan Indikator Resmi Pusmendik** (100% terisi pada seluruh 3.429 soal) |
| `level_kognitif` | `TEXT` | L1 (Pengetahuan/Pemahaman), L2 (Aplikasi), L3 (Penalaran) |
| `tingkat_kesulitan` | `TEXT` | `rendah`, `sedang`, `tinggi` |
| `bentuk_soal` | `TEXT` | `PG`, `PGK_MCMA`, `PGK_KATEGORI` |
| `payload` | `JSONB` | Berisi `soal_text`, `opsi`, `kunci_jawaban`, `pembahasan`, `gambar`, dan `indikator` |

### Panduan Parsing Kolom DB ke Hierarki Rapor

Di sisi frontend/backend `ayotka.id`, gunakan fungsi parser berikut untuk mengekstrak hierarki secara bersih:

```typescript
export interface ParsedHierarchy {
  level1Label: string;
  level1Value: string;
  level2Label: string;
  level2Value: string;
  level3Label: string;
  level3Value: string;
  level4Label?: string;
  level4Value?: string;
}

export function parseQuestionHierarchy(q: {
  mapel: string;
  elemen: string;
  subElemen?: string | null;
  kompetensi?: string | null;
  indikator?: string | null;
}): ParsedHierarchy {
  const isBahasa =
    q.mapel.toLowerCase().includes("indonesia") ||
    q.mapel.toLowerCase().includes("inggris");

  if (isBahasa) {
    // ---------------------------------------------------------
    // BAHASA INDONESIA: 3 TINGKAT
    // 1. Kompetensi (Pemahaman Tekstual / Inferensial / Evaluasi)
    // 2. Subkompetensi
    // 3. Indikator
    // ---------------------------------------------------------
    let kompetensiName = "Pemahaman Tekstual";
    let subkompetensiName = q.subElemen || "–";

    const rawKompetensi = q.kompetensi || q.elemen || "";
    if (rawKompetensi.includes(":")) {
      const parts = rawKompetensi.split(":");
      kompetensiName = parts[0].trim();
      subkompetensiName = parts.slice(1).join(":").trim() || q.subElemen || "–";
    } else if (
      rawKompetensi.includes("Pemahaman") ||
      rawKompetensi.includes("Evaluasi")
    ) {
      kompetensiName = rawKompetensi.trim();
      subkompetensiName =
        q.subElemen && q.subElemen !== kompetensiName ? q.subElemen : "–";
    }

    return {
      level1Label: "Kompetensi",
      level1Value: kompetensiName,
      level2Label: "Subkompetensi",
      level2Value: subkompetensiName,
      level3Label: "Indikator",
      level3Value: q.indikator || "–",
    };
  }

  // ---------------------------------------------------------
  // MATEMATIKA: 4 TINGKAT
  // 1. Elemen
  // 2. Subelemen
  // 3. Kompetensi
  // 4. Indikator
  // ---------------------------------------------------------
  return {
    level1Label: "Elemen",
    level1Value: q.elemen || "–",
    level2Label: "Subelemen",
    level2Value: q.subElemen || "–",
    level3Label: "Kompetensi",
    level3Value: q.kompetensi || "–",
    level4Label: "Indikator",
    level4Value: q.indikator || "–",
  };
}
```

---

## 4. Master Data Taksonomi Pusmendik (`kemendikdasmen-official.json`)

Tersedia file master taksonomi resmi hasil ekstraksi langsung dari Pusmendik API di:
`src/lib/taxonomy/kemendikdasmen-official.json`

File ini memuat **225 Indikator Resmi** beserta data daya serap rerata nasional:
* **SD Matematika**: 34 indikator
* **SD Bahasa Indonesia**: 23 indikator
* **SMP Matematika**: 37 indikator
* **SMP Bahasa Indonesia**: 28 indikator
* **SMA (Matematika, B. Indonesia, B. Inggris, PPKn)**: 103 indikator

### Contoh Struktur Data JSON

```json
{
  "jenjang": "SMP",
  "kd_mapel": "BINP",
  "nama_mapel": "Bahasa Indonesia",
  "elemen": "Pemahaman Tekstual",
  "subelemen": "Mengidentifikasi penggunaan istilah dalam berbagai bidang.",
  "kompetensi": "Mengidentifikasi penggunaan istilah dalam berbagai bidang.",
  "indikator": "Mengidentifikasi makna penggunaan istilah bidang tertentu dalam teks. (1)",
  "urutan": 1,
  "nilai_nasional": 60.05
}
```

```json
{
  "jenjang": "SMP",
  "kd_mapel": "MATP",
  "nama_mapel": "Matematika",
  "elemen": "Bilangan",
  "subelemen": "Bilangan Real",
  "kompetensi": "Kemampuan memahami, mengaplikasikan, dan bernalar yang lebih tinggi untuk menyelesaikan permasalahan terkait perbandingan dan sifat-sifat bilangan",
  "subkompetensi": "-",
  "indikator": "Menyelesaikan operasi bilangan bentuk pangkat (1)",
  "urutan": 1,
  "nilai_nasional": 34.09
}
```

> **FITUR REKOMENDASI UNTUK RAPOR SISWA**:  
> Manfaatkan field `nilai_nasional` di atas sebagai **benchmark komparasi**. Rapor siswa di `ayotka.id` dapat menampilkan badge:
> * `"Di Atas Rata-rata Nasional"` (jika skor siswa > nilai_nasional)
> * `"Perlu Penguatan"` (jika skor siswa < nilai_nasional)

---

## 5. Panduan Query SQL Agregasi Rapor Siswa (`ayotka.id`)

Saat siswa menyelesaikan paket tryout, modul rapor menghitung **Daya Serap (%)** siswa per hierarki.

### A. Rumus Daya Serap

Daya Serap (%) = (Jumlah Skor Diperoleh Siswa / Total Skor Maksimum Indikator) x 100%

### B. Query Agregasi Daya Serap Matematika (4 Tingkat)

```sql
SELECT 
  q.elemen,
  q.sub_elemen,
  q.kompetensi,
  q.indikator,
  COUNT(q.id) AS jumlah_soal,
  SUM(CASE WHEN sa.is_correct THEN 1 ELSE 0 END) AS jumlah_benar,
  ROUND((SUM(CASE WHEN sa.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(q.id)) * 100, 2) AS daya_serap_persen
FROM tryout.student_answers sa
JOIN soal.questions q ON sa.question_id = q.id
WHERE sa.session_id = :sessionId AND q.mapel = 'Matematika'
GROUP BY q.elemen, q.sub_elemen, q.kompetensi, q.indikator
ORDER BY q.elemen, q.sub_elemen, q.indikator;
```

### C. Query Agregasi Daya Serap Bahasa Indonesia (3 Tingkat)

```sql
SELECT 
  CASE 
    WHEN q.kompetensi LIKE 'Pemahaman%' OR q.kompetensi LIKE 'Evaluasi%' 
      THEN split_part(q.kompetensi, ':', 1)
    ELSE q.elemen 
  END AS kompetensi,
  COALESCE(
    NULLIF(split_part(q.kompetensi, ':', 2), ''), 
    q.sub_elemen, 
    'Umum'
  ) AS subkompetensi,
  q.indikator,
  COUNT(q.id) AS jumlah_soal,
  SUM(CASE WHEN sa.is_correct THEN 1 ELSE 0 END) AS jumlah_benar,
  ROUND((SUM(CASE WHEN sa.is_correct THEN 1 ELSE 0 END)::numeric / COUNT(q.id)) * 100, 2) AS daya_serap_persen
FROM tryout.student_answers sa
JOIN soal.questions q ON sa.question_id = q.id
WHERE sa.session_id = :sessionId AND q.mapel = 'Bahasa Indonesia'
GROUP BY 1, 2, q.indikator
ORDER BY 1, 2, q.indikator;
```

---

## 6. Referensi Komponen UI yang Sudah Live

Di repositori `generator-soal-tka` (`soal.ayotka.id`), komponen kartu hierarki indikator telah dibuat dan dapat langsung diadaptasi atau disalin ke `ayotka.id`:

* **Komponen**: `src/components/soal/HierarkiIndikatorCard.tsx`
* **Karakteristik Desain**:
  * Bingkai biru lembut (`bg-blue-50/70 border border-blue-200/90 rounded-2xl`).
  * Icon `Layers` berwarna indigo/biru.
  * Otomatis berganti label sesuai mata pelajaran (3 baris untuk Bahasa Indonesia, 4 baris untuk Matematika).
  * Menampilkan badge penanda: `"Bahasa Indonesia (3 Tingkat)"` vs `"Matematika (4 Tingkat)"`.

---

## 7. Checklist untuk Antigravity Firerza (`ayotka.id`)

Saat mengembangkan modul rapor siswa di `ayotka.id`, pastikan Antigravity Firerza memeriksa poin-poin berikut:

1. [ ] **Tidak Memaksa 4 Tingkat untuk Bahasa Indonesia**: Pastikan UI Bahasa Indonesia hanya menampilkan **Kompetensi -> Subkompetensi -> Indikator**.
2. [ ] **Menampilkan Indikator Lengkap**: Field `indikator` wajib dimunculkan pada daftar rincian butir soal di rapor siswa beserta status Benar/Salah.
3. [ ] **Diagnostik Terlemah & Terkuat**: Sajikan minimal 3 indikator dengan daya serap terendah sebagai bahan belajar remedial mandiri bagi siswa.
4. [ ] **Grafik Daya Serap per Elemen/Kompetensi**: Gunakan bar chart horizontal untuk memvisualisasikan daya serap tiap Elemen (Matematika) atau Kompetensi (Bahasa Indonesia).
5. [ ] **Konsistensi Formula Matematika**: Render rumus matematika pada pembahasan dan teks soal menggunakan KaTeX / MathJax yang rapi tanpa raw markup bocor.

---
*Dokumen ini merupakan panduan resmi pengembangan bersama AyoTKA. Hubungi tim inti atau rujuk file repositori generator-soal-tka untuk klarifikasi lebih lanjut.*
