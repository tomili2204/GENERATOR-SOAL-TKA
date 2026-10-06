# JADWAL KEDALUWARSA & RENCANA MIGRASI VPS AYOTKA.ID

Dokumen ini mencatat informasi resmi masa aktif VPS Hostinger dan pengingat migrasi sebelum masa langganan berakhir.

---

## 1. Detail Server Saat Ini
* **Penyedia:** Hostinger (KVM 2)
* **IP Server:** `187.77.115.29`
* **Hostname:** `srv2032585.hstgr.cloud`
* **Instance ID:** `hvps-40a3b8736ec95f06`
* **Tanggal Mulai Aktif:** Minggu, 4 Oktober 2026
* **Tanggal Kedaluwarsa (Expired):** **Senin, 4 Oktober 2027**
* **Masa Aktif:** 1 Tahun Penuh

---

## 2. Jadwal Pengingat & Persiapan Migrasi (Timeline 2027)

| Tanggal | Fase | Aksi |
| :--- | :--- | :--- |
| **1 September 2027** | **Peringatan H-30** | Memilih penyedia VPS baru (misal: IDCloudHost, Biznet GIO, atau DigitalOcean) & membuat server baru. |
| **15 September 2027** | **Testing & Setup H-20** | Clone repositori GitHub ke VPS baru, install Nginx + Node.js 22 LTS, hubungkan ke Supabase. |
| **25 September 2027** | **Switch DNS H-10** | Ubah DNS A Record `soal.ayotka.id` dan `ayotka.id` ke IP VPS baru. Uji coba cron audit WA. |
| **4 Oktober 2027** | **Masa Hostinger Berakhir** | Layanan di Hostinger dibiarkan hangus/berakhir tanpa perpanjangan (Zero Downtime). |

---

## 3. Catatan Portabilitas
* Database berada di **Supabase Cloud** (tidak berada di dalam VPS).
* Repositori kode berada di **GitHub** (`tomili2204/GENERATOR-SOAL-TKA`).
* Cron audit dan generator soal dapat dideploy ulang dalam waktu **15–20 menit**.

---

## 4. Penyimpanan Gambar Soal (WAJIB dibawa saat migrasi VPS)
* Foto ilustrasi soal TIDAK disimpan di database (sebelumnya base64 membuat Supabase membengkak hingga 592 MB). Database hanya menyimpan URL, mis. `https://soal.ayotka.id/soal-images/<nama-file>.jpg`.
* File fisik berada di **disk VPS**: `/var/www/generator-soal-tka/public/soal-images/` (~300 MB per Oktober 2026). Folder ini **tidak ada di GitHub** (`.gitignore`), jadi **harus disalin manual** (`rsync`/`scp`) ke VPS baru, atau semua foto soal akan hilang.
* Generator harian menulis file lewat `saveBase64Image` di `src/lib/images/storage.ts`.
* Nginx melayani langsung path `/soal-images/` (blok `location /soal-images/ { alias .../public/soal-images/; }` di `/etc/nginx/sites-enabled/soal.ayotka.id` dan `ai.ayotka.id`). Tanpa blok ini, file yang ditulis generator setelah build Next.js akan 404. Blok yang sama harus dipasang di VPS baru.
* Diagram matematika bertipe SVG tetap disimpan inline di database (ukurannya hanya 1–3 KB).
