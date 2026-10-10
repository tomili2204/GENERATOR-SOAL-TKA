# Konteks project (BACA DULU — berlaku untuk Claude Code, AntiGravity, dan agent lain)

Project ini = **soal.ayotka.id**: panel bank soal TKA + generator soal AI harian (Next.js 14, Drizzle, Supabase Postgres).
Berjalan di VPS Hostinger (PM2 `generator-soal-tka`, port 3000), auto-deploy GitHub Actions setiap push ke `main`.
Ekosistem lebih luas (ayotka.id, ai.ayotka.id, tomilistiawan.id, 9Router): `docs/BLUEPRINT_AI_AYOTKA_DAN_TOMILISTIAWAN.md`.
Project saudara: `C:\AntiGravity\RPP_GENERATOR` (ai.tomilistiawan.id) — lihat `docs/HANDOFF_AI_TOMILISTIAWAN.md` di sana.

## Protokol sinkronisasi antar-agent (WAJIB)

Chat Claude Code dan AntiGravity TIDAK saling melihat. Satu-satunya ingatan bersama adalah **file di repo ini** + riwayat git.

1. **Awal sesi:** baca file ini, lalu `docs/STATUS_BERSAMA.md` (status terkini + keputusan + hal yang menunggu), lalu `git log --oneline -15` dan `git status`.
2. **Selama bekerja:** keputusan penting dari pemilik (mis. "nama elemen SD = Data") langsung dicatat di bagian *Keputusan* STATUS_BERSAMA.md beserta alasan dan tanggal — jangan hanya di chat.
3. **Akhir sesi / sebelum pindah tool:** tambahkan entri di *Log sesi* (paling atas): tanggal, tool (Claude Code/AntiGravity), apa yang diubah (path file), apa yang BELUM selesai, dan hal yang menunggu izin pemilik. Commit perubahan atau tulis jelas bahwa masih belum di-commit.
4. **Jangan menimpa pekerjaan agent lain:** `git status` dulu; file yang berubah di luar pengetahuanmu mungkin hasil sesi lain — baca, jangan revert.
5. Memori pribadi tiap tool (mis. folder `.claude`) tidak terbaca tool lain; hal penting harus ada di file repo.

## Aturan tetap dari pemilik

- Komunikasi **Bahasa Indonesia**.
- Jangan mencetak/menyimpan kredensial di file yang masuk repo atau di chat. Rahasia hanya di `.env.local` (gitignored).
- Aksi destruktif/produksi (DROP, hapus data, tulis massal ke DB produksi, deploy) hanya setelah izin eksplisit pemilik, dengan daftar perubahan ditampilkan dulu.
- Nama elemen Matematika mengikuti **Kerangka Asesmen TKA (Perkaban BSKAP 047/H/AN/2025)**: SD/MI = Bilangan, Geometri dan Pengukuran, **Data** (tanpa Aljabar); SMP/MTs = Bilangan, Aljabar, Geometri dan Pengukuran, **Data dan Peluang**. Fungsi acuan: `canonicalMathElemen` di `src/lib/generator/competency-plan.ts`.
- Level kognitif Matematika hanya: Pengetahuan dan Pemahaman, Aplikasi, Penalaran.

## Alat bantu baca-saja (project ini)

- `scripts/db-query.ts` — query ke MariaDB WordPress di VPS lewat SSH (butuh `VPS_PASSWORD` di `.env.local`).
- Folder `scratch/` (gitignored) berisi skrip evaluasi sekali pakai (mis. `eval-hari-ini.ts`, `gen-logs.ts`); aman dijalankan ulang, hanya membaca.
- Log proses generator ada di tabel `soal.generation_logs` (alasan kegagalan di kolom `error_message`).
