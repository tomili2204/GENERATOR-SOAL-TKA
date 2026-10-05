# PANDUAN INTEGRASI FITUR "TANYA TUTOR AI" AYOTKA.ID
**Dokumen Referensi Khusus untuk Mas Firerza & Antigravity IDE (ayotka.id)**  
*Terakhir Diperbarui: Oktober 2026*  
*Target Implementasi: Halaman Pembahasan / Reviu Hasil Try Out Siswa (`ayotka.id`)*

---

## 1. Ringkasan Fitur

Fitur **"Tanya Tutor AI"** memberikan pengalaman belajar interaktif bagi siswa setelah menyelesaikan ujian Try Out. Ketika siswa membuka pembahasan soal, akan muncul tombol **"Tanya Tutor AI"** di setiap butir soal.

Jika diklik, akan terbuka jendela obrolan (*Drawer / Modal*) di mana AI bertindak sebagai **guru les privat ramah (metode Sokrates)** yang membimbing siswa memahami letak kesalahannya secara bertahap tanpa membocorkan kunci jawaban mentah.

Backend AI telah siap dan berjalan di subdomain generator:
* **Endpoint API:** `https://soal.ayotka.id/api/ai/tutor/chat`
* **CORS:** Diaktifkan penuh (`*`), aman dipanggil langsung dari frontend `ayotka.id`.
* **API Key:** Menggunakan Gemini Flash khusus siswa (terpisah dari generator soal).

---

## 2. Spesifikasi Endpoint API

### HTTP POST Request
* **URL:** `https://soal.ayotka.id/api/ai/tutor/chat`
* **Method:** `POST`
* **Header:** `Content-Type: application/json`

### Payload Request (Opsi A — Praktis / Rekomendasi):
Mas Firerza cukup mengirimkan `soalId` (atau `soalCode`), jawaban yang dipilih siswa, dan riwayat pesan chat. Sistem backend akan otomatis menarik soal, stimulus, dan pembahasan dari database Supabase!

```json
{
  "soalId": "TKA-SD-MAT-001",
  "jawaban_siswa": "A",
  "messages": [
    {
      "role": "user",
      "content": "Halo Tutor, kenapa jawaban saya A keliru ya?"
    }
  ]
}
```

### Payload Request (Opsi B — Mengirim Context Lengkap):
Jika data soal sudah ada di state client, Mas Firerza juga bisa mengirimkan konteks lengkapnya langsung:

```json
{
  "soalContext": {
    "jenjang": "SD",
    "mapel": "Matematika",
    "stimulus": "Teks wacana jika ada...",
    "soal_text": "Sebuah kebun berukuran panjang 12 m dan lebar 8 m...",
    "opsi": [
      { "label": "A", "text": "20 meter" },
      { "label": "B", "text": "40 meter" }
    ],
    "kunci_jawaban": "B",
    "pembahasan": "Keliling = 2 x (12 + 8) = 40 meter.",
    "jawaban_siswa": "A"
  },
  "messages": [
    {
      "role": "user",
      "content": "Bagaimana langkah awal mengerjakannya?"
    }
  ]
}
```

### Struktur Respon Berhasil (`200 OK`):
```json
{
  "success": true,
  "data": {
    "reply": "Halo! Tenang ya, soal keliling kebun ini memang sering mengecoh. Angka 20 meter yang kamu dapatkan sebenarnya baru hasil penjumlahan panjang dan lebar saja ($12 + 8$). Ingat, keliling artinya mengelilingi seluruh tepi kebun. Yuk kita coba kalikan dengan 2: $K = 2 \\times (p + l)$ ...",
    "model": "gemini-flash-lite-latest",
    "soalId": "TKA-SD-MAT-001"
  }
}
```

---

## 3. Komponen Siap Pakai untuk Frontend `ayotka.id`

Mas Firerza dapat langsung menggunakan atau menyalin komponen yang telah kami buat:
1. **Komponen Modal Chat:** [src/components/tutor/TutorAiChatModal.tsx](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/components/tutor/TutorAiChatModal.tsx)
2. **Helper Renderer KaTeX LaTeX:** [src/lib/tutor/render-katex.ts](file:///c:/AntiGravity/GENERATOR%20SOAL%20TKA/src/lib/tutor/render-katex.ts)

### Cara Memasangnya di Halaman Pembahasan Soal Siswa:

```tsx
import React, { useState } from "react";
import { TutorAiChatModal } from "@/components/tutor/TutorAiChatModal";
import { Bot } from "lucide-react";

export function ItemPembahasanSoal({ soal, jawabanSiswa }) {
  const [isTutorOpen, setIsTutorOpen] = useState(false);

  return (
    <div className="border rounded-xl p-4 my-3 bg-white">
      {/* Konten Soal & Pembahasan Siswa */}
      <div className="font-medium">{soal.soal_text}</div>
      
      {/* Tombol Tanya Tutor AI */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setIsTutorOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition"
        >
          <Bot className="w-4 h-4" />
          Tanya Tutor AI
        </button>
      </div>

      {/* Drawer Chat Tutor AI */}
      <TutorAiChatModal
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        soalContext={{
          soalId: soal.id,
          jenjang: soal.jenjang,
          mapel: soal.mapel,
          soal_text: soal.soal_text,
          opsi: soal.opsi,
          kunci_jawaban: soal.kunci_jawaban,
          pembahasan: soal.pembahasan,
          jawaban_siswa: jawabanSiswa,
        }}
      />
    </div>
  );
}
```

---

## 4. Prompt Siap Pakai untuk Antigravity Milik Mas Firerza

Mas Firerza cukup menyalin prompt berikut ke jendela chat Antigravity di komputernya:

> *"Halo Antigravity, saya ingin menambahkan tombol 'Tanya Tutor AI' di halaman pembahasan soal siswa ayotka.id setelah ujian selesai. Sistem backend Tutor AI sudah siap di `https://soal.ayotka.id/api/ai/tutor/chat` dengan dokumentasi lengkap di file `docs/INTEGRASI_TUTOR_AI_UNTUK_FIRERZA.md`. Tolong pasangkan tombol 'Tanya Tutor AI' dan modal drawer obrolannya pada komponen reviu pembahasan soal sesuai panduan tersebut."*

---

Dokumen ini disimpan di repositori pada path:  
`docs/INTEGRASI_TUTOR_AI_UNTUK_FIRERZA.md`
