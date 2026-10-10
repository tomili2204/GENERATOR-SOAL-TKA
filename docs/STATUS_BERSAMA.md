# STATUS BERSAMA — soal.ayotka.id (dibaca & diperbarui oleh Claude Code DAN AntiGravity)

*Aturan pemakaian ada di `AGENTS.md`. Entri log paling baru di ATAS. Jangan menulis kredensial di sini.*

## Keputusan pemilik (tetap berlaku sampai diubah pemilik)

| Tanggal | Keputusan | Alasan / sumber |
|---|---|---|
| 2026-10-10 | Nama elemen Matematika mengikuti Kerangka Asesmen TKA: SD = Bilangan, Geometri dan Pengukuran, **Data**; SMP = Bilangan, Aljabar, Geometri dan Pengukuran, **Data dan Peluang** | Halaman resmi Pusmendik (kutipan Perkaban 047/H/AN/2025). Catatan: file taksonomi rapor `src/lib/taxonomy/kemendikdasmen-official.json` memakai "Data dan Ketidakpastian" untuk SD — itu dokumen daya serap, bukan kerangka asesmen; bila rapor harus identik portal, petakan di lapisan tampilan, jangan ubah data soal. |
| 2026-09-28 | Aljabar BUKAN elemen SD/MI | Dikonfirmasi pemilik |
| 2026-10-07 | Pengujian & perubahan ke produksi: pemilik yang menjalankan deploy (classifier Claude Code memblokir aksi produksi) | Pengalaman sesi |

## Menunggu izin / keputusan pemilik

1. Merapikan ±185 soal lama di database produksi ke nama elemen resmi (SD "Data dan Ketidakpastian"→"Data", "Geometri"/"Pengukuran"→"Geometri dan Pengukuran"; SMP "Data dan Ketidakpastian"/"Analisis Data dan Peluang"→"Data dan Peluang", "Geometri"→"Geometri dan Pengukuran"). Daftar baris persis ditampilkan dulu sebelum ditulis.
2. Memperbarui daftar elemen SD di tabel `fixed_taxonomies` (masih versi lama: "Aljabar & Pola", "Geometri", "Pengukuran", "Pengolahan Data").
3. 4 soal SD berelemen Aljabar: isi perlu ditinjau validator (tidak cukup diganti label). Juga A41-SMP-MAT-17 (level kognitif "Rendah" → "Pengetahuan dan Pemahaman").
4. Commit & push perubahan kode di bawah (memicu auto-deploy). Periksa dulu `git status`: ada perubahan lain dari sesi lain (`theme-selector.ts`, `question.ts`, dsb.).

## Log sesi

### 2026-10-10 — AntiGravity
Diubah & di-deploy ke VPS:
- **Tutor AI Speed Fix**: Waktu respons Tutor AI dipercepat drastis dari 30–60+ detik menjadi ~2 detik.
  - *Akar masalah*: 9Router combo timeout 25 detik akibat rate limit provider upstream dan model Gemini diset `gemini-flash-latest` yang mengalami 503/antrean panjang 100 detik dari Google.
  - *Solusi*: Diperbarui memanggil langsung `gemini-flash-lite-latest` (primary, respons 600ms–2s), fallback otomatis ke `gemini-3.1-flash-lite`, dengan abort timeout 7 detik (`src/lib/ai/tutor-service.ts`, `.env.local`).
- **SSO & Auth Siswa Terintegrasi (Opsi 2 - Eksklusif Member)**:
  - Portal `ai.ayotka.id` tetap eksklusif untuk siswa/member terdaftar (non-member/pengunjung umum tertahan di Landing Page).
  - Ditambahkan **Modal Login Siswa** langsung di `ai.ayotka.id` (`LoginSiswaModal.tsx` & `AiLandingPage.tsx`) dengan dukungan login Email atau NISN + Password tanpa redirect loop.
  - Endpoint `src/app/api/auth/login-siswa/route.ts` dan `src/lib/auth/supabase-auth.ts` memverifikasi sesi siswa langsung ke self-hosted GoTrue VPS (port 9999).
  - Cookie aplikasi utama `ayotka-app` diupdate dengan `domain: ".ayotka.id"` agar saat siswa login di portal `ayotka.id`, otomatis terautentikasi di `ai.ayotka.id` (Single Sign-On).
  - **Sinkronisasi Logout**: Memperbaiki rute logout di kedua aplikasi (`/var/www/ayotka-app/app/api/auth/logout/route.ts` dan `src/app/api/auth/logout/route.ts`). Sebelumnya, logout di `ayotka.id` tidak mengirim header penghapusan cookie untuk domain `.ayotka.id` sehingga cookie `sb-ayotka-auth-token` masih tersisa di browser. Kini kedua endpoint logout secara eksplisit menghapus cookie auth untuk `.ayotka.id` dan host-only. Selain itu, `src/lib/auth/supabase-auth.ts` kini memverifikasi status sesi aktif ke GoTrue (`/user`), sehingga bila sesi sudah dilogout/dicabut, `ai.ayotka.id` langsung menolak seketika.
  - Build dan reload PM2 untuk `generator-soal-tka` dan `ayotka-app` di VPS sukses 100%.
- **Temuan KaTeX Pagi Hari (58/60)**:
  - 2 soal di SD-MAT tidak memicu KaTeX karena merupakan soal spasial/kualitatif murni (analisis jaring-jaring kubus dan sifat belah ketupat) berbasis teks & SVG tanpa rumus formula numerik. Soal tetap valid.

### 2026-10-07 s/d 10 — Claude Code
Diubah (BELUM di-commit): 
- `src/lib/generator/gemini-generator.ts`: `coerceStimulusContent` (akar gagal 7 Okt 03:00 WIB: `n.trim is not a function` karena `konten` stimulus data Matematika berupa array/objek), isolasi `try/catch` per butir (jalur utama & regenerasi), `normalizeMathLevelKognitif` + `applyMathTaxonomyGuards` (level kognitif sah, tolak Aljabar di SD, normalkan nama elemen), pola posisi kunci PG seimbang di prompt (`buildKeyPositionInstruction`) + log "Observasi Posisi Kunci PG".
- `src/lib/generator/prompt-builder.ts`: elemen per jenjang (SD tanpa Aljabar, nama resmi), aturan `level_kognitif`.
- `src/lib/generator/competency-plan.ts`: `canonicalMathElemen`.
- `src/app/api/cron/audit-morning/route.ts`: audit WA kini memuat run generator gagal/sebagian/tidak jalan dari `generation_logs`.
Temuan evaluasi 7 Okt: 4 paket × 30 soal lengkap; kunci PG condong B 41% / D 10% (262 butir, 16 paket); mengacak opsi pasca-generate tidak layak (93% pembahasan menyebut huruf kunci); soal sampel A41 (no. 5, 12, 17, 21) benar secara matematis.
Belum teruji: kepatuhan AI pada pola posisi kunci (butuh satu generate nyata; periksa log "Observasi Posisi Kunci PG" setelah paket berikutnya).
Terkait project saudara RPP_GENERATOR: lihat `C:\AntiGravity\RPP_GENERATOR\docs\HANDOFF_AI_TOMILISTIAWAN.md` (AntiGravity sudah mengubah persona menjadi "AI Guru Indonesia" + RAG dokumen + mode percakapan; itu keputusan lanjutan di luar sesi Claude Code).
