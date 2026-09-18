import { db, ensureTablesCreated } from "@/db";
import { users, stimulus, questions, auditLogs } from "@/db/schema";
import { createSessionToken } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

async function testManualUpload() {
  console.log("\n=======================================================");
  console.log("🚀 TESTING END-TO-END MANUAL QUESTION UPLOAD & API");
  console.log("=======================================================\n");

  await ensureTablesCreated();

  const pembuat = await db.select().from(users).where(eq(users.email, "pembuat@ayotka.id")).limit(1);
  if (!pembuat[0]) throw new Error("Akun pembuat@ayotka.id tidak ditemukan!");

  const sessionUser = {
    id: pembuat[0].id,
    name: pembuat[0].name,
    email: pembuat[0].email,
    roles: ["pembuat_soal" as const],
  };

  const token = await createSessionToken(sessionUser);

  // Helper fetch with session cookie
  const apiFetch = async (url: string, options: any = {}) => {
    const headers = {
      ...options.headers,
      Cookie: `ayotka_session=${token}`,
      "Content-Type": "application/json",
    };
    return fetch(`http://localhost:3000${url}`, { ...options, headers });
  };

  // 1. Uji Buat Stimulus Baru
  console.log("1. Menguji Pembuatan Objek Stimulus:");
  const stimRes = await apiFetch("/api/stimulus", {
    method: "POST",
    body: JSON.stringify({
      jenjang: "SD/MI",
      mapel: "Bahasa Indonesia",
      tipe: "teks",
      judul: "Teks Cerita Kancil dan Buaya",
      konten: "Di sebuah hutan yang lebat, Kancil ingin menyeberangi sungai yang dipenuhi buaya...",
    }),
  });
  const stimJson = await stimRes.json();
  if (!stimJson.success || !stimJson.data?.id) {
    throw new Error(`Gagal membuat stimulus: ${JSON.stringify(stimJson)}`);
  }
  const stimulusId = stimJson.data.id;
  console.log(`   ✅ Stimulus berhasil dibuat: ID = ${stimulusId} (${stimJson.data.jumlahKata} kata)`);

  // 2. Uji Unggah Soal Tunggal (PG Matematika dengan KaTeX)
  console.log("\n2. Menguji Unggah Soal Tunggal (PG dengan KaTeX):");
  const pgSoalData = {
    jenjang: "SD/MI",
    mapel: "Matematika",
    elemen: "Bilangan",
    sub_elemen: "Pecahan",
    kompetensi: "Menyelesaikan penjumlahan pecahan",
    level_kognitif: "Aplikasi",
    tingkat_kesulitan: "sedang",
    bentuk_soal: "PG",
    jenis_soal: "tunggal",
    soal_text: "Hasil dari $\\frac{1}{2} + \\frac{1}{3}$ adalah...",
    pembahasan: "KPK dari 2 dan 3 adalah 6. $$\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}$$",
    opsi: [
      { label: "A", text: "$\\frac{5}{6}$" },
      { label: "B", text: "$\\frac{2}{5}$" },
      { label: "C", text: "$\\frac{1}{6}$" },
      { label: "D", text: "$\\frac{5}{5}$" },
    ],
    kunci_jawaban: ["A"],
  };

  const pgRes = await apiFetch("/api/questions", {
    method: "POST",
    body: JSON.stringify(pgSoalData),
  });
  const pgJson = await pgRes.json();
  if (!pgJson.success || !pgJson.data?.id) {
    throw new Error(`Gagal mengunggah soal PG: ${JSON.stringify(pgJson)}`);
  }
  console.log(`   ✅ Soal PG tersimpan: Code = ${pgJson.data.code}`);
  console.log(`   ✅ Sumber terkunci otomatis: "${pgJson.data.sumber}"`);
  console.log(`   ✅ Status validasi terkunci otomatis: "${pgJson.data.status}"`);

  if (pgJson.data.sumber !== "manual_upload" || pgJson.data.status !== "menunggu_validasi") {
    throw new Error("Backend gagal mengunci sumber atau status_validasi secara otomatis!");
  }

  // 3. Uji Penolakan Delimiter KaTeX Ganjil Melalui API
  console.log("\n3. Menguji Penolakan Delimiter KaTeX Tidak Berpasangan via API:");
  const badLatexData = {
    ...pgSoalData,
    soal_text: "Hitung nilai $x + 1 tanpa penutup",
  };
  const badRes = await apiFetch("/api/questions", {
    method: "POST",
    body: JSON.stringify(badLatexData),
  });
  const badJson = await badRes.json();
  if (badRes.status !== 400 || badJson.success) {
    throw new Error("Soal dengan KaTeX tidak seimbang seharusnya ditolak dengan status 400!");
  }
  console.log(`   ✅ API menolak dengan tepat (HTTP 400): ${badJson.errors?.[0]}`);

  // 4. Uji Unggah Soal Grup yang Terkait ke Stimulus
  console.log("\n4. Menguji Unggah Soal Grup (PGK Kategori terhubung ke Stimulus):");
  const grupData = {
    jenjang: "SD/MI",
    mapel: "Bahasa Indonesia",
    elemen: "Membaca dan Memirsa",
    sub_elemen: "Ide Pokok",
    kompetensi: "Menganalisis karakter tokoh",
    level_kognitif: "Pemahaman Inferensial",
    tingkat_kesulitan: "sedang",
    bentuk_soal: "PGK_KATEGORI",
    jenis_soal: "grup",
    stimulus_id: stimulusId,
    soal_text: "Berdasarkan kutipan bacaan stimulus di atas, tentukan kesesuaian pernyataan berikut:",
    pembahasan: "Kancil bersikap cerdik karena mampu mengelabui buaya.",
    pernyataan: [
      { no: 1, text: "Kancil ingin menyeberangi sungai untuk mencari makanan." },
      { no: 2, text: "Buaya menolak membantu kancil karena sedang tidur." },
    ],
    kategori_respons: ["Sesuai", "Tidak Sesuai"],
    kunci_jawaban: ["Sesuai", "Tidak Sesuai"],
  };

  const grupRes = await apiFetch("/api/questions", {
    method: "POST",
    body: JSON.stringify(grupData),
  });
  const grupJson = await grupRes.json();
  if (!grupJson.success || !grupJson.data?.id) {
    throw new Error(`Gagal mengunggah soal Grup: ${JSON.stringify(grupJson)}`);
  }
  console.log(`   ✅ Soal Grup PGK_KATEGORI tersimpan: Code = ${grupJson.data.code}`);
  console.log(`   ✅ Terhubung ke Stimulus ID = ${grupJson.data.stimulusId}`);

  // 5. Uji Pengambilan Soal Milik Pembuat (GET /api/questions)
  console.log("\n5. Menguji RBAC GET /api/questions (Hanya melihat milik sendiri):");
  const listRes = await apiFetch("/api/questions");
  const listJson = await listRes.json();
  if (!listJson.success || !Array.isArray(listJson.data)) {
    throw new Error("Gagal mengambil daftar soal pembuat!");
  }
  const allBelongToPembuat = listJson.data.every((q: any) => q.authorId === pembuat[0].id);
  if (!allBelongToPembuat) {
    throw new Error("Daftar soal bocor: Pembuat melihat soal milik author lain!");
  }
  console.log(`   ✅ Seluruh (${listJson.data.length}) butir soal yang dikembalikan terverifikasi milik pembuat ini saja.`);

  console.log("\n=======================================================");
  console.log("🎉 SELURUH INTEGRASI API UNGGAH MANUAL SOAL BERJALAN SEMPURNA!");
  console.log("=======================================================\n");
}

testManualUpload()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test API Error:", err);
    process.exit(1);
  });
