# soal.ayotka.id — Panel Internal Manajemen & Validasi Soal TKA

Panel internal manajemen bank soal dan validasi Tes Kemampuan Akademik (TKA) untuk mendukung produk **AyoTKA** (ayotka.id) — layanan tryout TKA untuk siswa SD dan SMP, mata pelajaran Bahasa Indonesia dan Matematika.

soal.ayotka.id adalah alat kerja internal tim berorientasi data (**utilitarian, padat informasi, desktop-first, professional yet warm**), dengan sistem token visual yang diturunkan langsung dari [ayotka.id](https://ayotka.id).

---

## 🎨 Token Desain Turunan ayotka.id

- **Warna Utama & Aksen**:
  - Gradient brand: Indigo-600 (`#4f46e5`) ke Violet-600 (`#7c3aed`).
  - Latar & border: Canvas `slate-50`, panel `white`, border `slate-200`, teks `slate-900`.
- **Status Chips (Badge Berwarna)**:
  - `menunggu_validasi`: Amber (`bg-amber-50 text-amber-800 border-amber-200`)
  - `disetujui`: Emerald (`bg-emerald-50 text-emerald-800 border-emerald-200`)
  - `perlu_revisi`: Orange (`bg-orange-50 text-orange-800 border-orange-200`)
  - `ditolak`: Rose (`bg-rose-50 text-rose-800 border-rose-200`)
  - `draft`: Slate (`bg-slate-100 text-slate-700 border-slate-200`)
- **Tipografi**:
  - Teks & Judul: Sans modern (`Poppins` / `Inter`).
  - Kode & Metadata: Monospace (`IBM Plex Mono` / `ui-monospace`) untuk kode soal, jenjang, status chips, angka, dan log.
- **Kepadatan Informasi**:
  - Layout desktop padat dengan tabel mudah dipindai, counter metrik real-time, dan indikator peran aktif.

---

## 🛡️ Hak Akses & Penegakan Otorisasi Backend

Sistem menerapkan **Role-Based Access Control (RBAC)** di level backend (Route Handlers & Server Components), bukan sekadar disembunyikan di UI:

1. **Administrator (`admin`)**:
   - Mengelola pengguna & penetapan peran multi-peran.
   - Mengaktifkan / menonaktifkan toggle generate-otomatis per jenjang + mapel.
   - Melihat semua bank soal lintas status.
   - Mengelola nilai tetap (elemen materi, taksonomi Kemendikdasmen).
   - Memantau jejak log audit sistem.
2. **Pembuat Soal (`pembuat_soal`)**:
   - Mengunggah butir soal manual.
   - Mengedit soal miliknya sendiri yang belum disetujui.
   - Melihat status validasi dan catatan masukan validator.
   - *Restriksi Backend*: Dilarang memvalidasi soal apa pun, dilarang mengubah konfigurasi generator, dilarang mengelola pengguna.
3. **Validator Soal (`validator_soal`)**:
   - Melihat antrean soal berstatus `menunggu_validasi`.
   - Menyetujui, meminta revisi, atau menolak butir soal.
   - Melihat riwayat validasinya sendiri.
   - *Restriksi Backend*: Dilarang mengunggah soal resmi (kecuali jika akun juga memiliki peran pembuat), dilarang mengubah toggle generator atau pengguna.

### ⛔ Aturan Kritis Pemisahan Tugas (Separation of Duties)
Satu akun didukung memiliki lebih dari satu peran (misal: `pembuat_soal` + `validator_soal`). Namun pada level backend guard (`assertCanValidateQuestion`):
> **Seorang validator TIDAK BOLEH menyetujui, meminta revisi, atau menolak soal yang ia unggah sendiri.**
> Permintaan validasi yang melanggar aturan ini langsung ditolak dengan HTTP 403 Forbidden.

---

## 👥 Akun Uji Coba (Tersedia Otomatis)

| Peran Akun | Email | Password | Kapabilitas Akses |
|---|---|---|---|
| **Administrator** | `admin@ayotka.id` | `admin123` | Akses penuh seluruh modul admin, toggle generator, taksonomi, audit log. |
| **Pembuat Soal** | `pembuat@ayotka.id` | `pembuat123` | Unggah soal dan memantau soal milik sendiri. Ditolak memvalidasi. |
| **Validator Soal** | `validator@ayotka.id` | `validator123` | Antrean validasi & telaah soal orang lain. |
| **Multi-Peran** | `ganda@ayotka.id` | `ganda123` | Pembuat + Validator. Digunakan untuk menguji aturan pemisahan tugas. |

Pada halaman login (`/login`), telah disediakan tombol **1-Klik Uji Peran** untuk memudahkan pergantian sesi pengujian secara instan.

---

## 🚀 Menjalankan Proyek

```bash
# 1. Masuk ke direktori proyek
cd "GENERATOR SOAL TKA"

# 2. Pastikan tabel & seed data terisi
npm run seed

# 3. Jalankan pengujian backend RBAC & pemisahan tugas
npm run test:rbac

# 4. Jalankan server pengembang
npm run dev
```

Buka `http://localhost:3000` di browser desktop Anda.

---

## 📦 Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components, Route Handlers, SSR).
- **Styling**: Tailwind CSS, Lucide Icons, Poppins & IBM Plex Mono fonts.
- **Database & ORM**: PostgreSQL Relational Schema dengan kolom native `JSONB` via Drizzle ORM.
  - *Dual-Engine*: Secara default menggunakan embedded in-process PostgreSQL 16 (`@electric-sql/pglite`) dengan penyimpanan lokal `.data/soal_ayotka_pg`, sehingga berjalan langsung tanpa konfigurasi Docker/server. Jika `DATABASE_URL` (Supabase / Postgres) disetel di `.env`, otomatis beralih ke pool koneksi PostgreSQL eksternal.
- **Autentikasi**: Sesi standar email + password dengan cookie aman HTTP-Only (`jose` JWT + `bcryptjs`).
