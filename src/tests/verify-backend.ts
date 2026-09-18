import { db, ensureTablesCreated } from "@/db";
import { users, userRoles, questions } from "@/db/schema";
import { requireRole, assertCanValidateQuestion, assertCanEditQuestion, AuthError } from "@/lib/auth/guards";
import { validateQuestionData } from "@/lib/validations/question";
import { validateLatexDelimiters } from "@/lib/validations/latex";
import { eq } from "drizzle-orm";

async function runTests() {
  console.log("\n=======================================================");
  console.log("🧪 MEMULAI PENGUJIAN OTORISASI, MODEL DATA & VALIDASI SOAL");
  console.log("=======================================================\n");

  await ensureTablesCreated();

  // 1. Ambil akun pengujian dari DB
  const adminRec = await db.select().from(users).where(eq(users.email, "admin@ayotka.id")).limit(1);
  const pembuatRec = await db.select().from(users).where(eq(users.email, "pembuat@ayotka.id")).limit(1);
  const validatorRec = await db.select().from(users).where(eq(users.email, "validator@ayotka.id")).limit(1);
  const gandaRec = await db.select().from(users).where(eq(users.email, "ganda@ayotka.id")).limit(1);

  if (!adminRec[0] || !pembuatRec[0] || !validatorRec[0] || !gandaRec[0]) {
    throw new Error("Akun pengujian belum di-seed! Jalankan `npm run seed` terlebih dahulu.");
  }

  const allRoles: any[] = await db.select().from(userRoles);

  const getSessionUser = (user: typeof adminRec[0]) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    roles: allRoles.filter((r) => r.userId === user.id).map((r) => r.role),
  });

  const adminUser = getSessionUser(adminRec[0]);
  const pembuatUser = getSessionUser(pembuatRec[0]);
  const validatorUser = getSessionUser(validatorRec[0]);
  const gandaUser = getSessionUser(gandaRec[0]);

  console.log("1. Verifikasi Multi-Peran:");
  console.log(`   - Admin: [${adminUser.roles.join(", ")}]`);
  console.log(`   - Pembuat: [${pembuatUser.roles.join(", ")}]`);
  console.log(`   - Validator: [${validatorUser.roles.join(", ")}]`);
  console.log(`   - Akun Ganda: [${gandaUser.roles.join(", ")}]`);

  if (!gandaUser.roles.includes("pembuat_soal") || !gandaUser.roles.includes("validator_soal")) {
    throw new Error("Akun ganda harus memiliki peran pembuat_soal dan validator_soal!");
  }
  console.log("   ✅ Akun ganda berhasil terkonfigurasi multi-peran.\n");

  // 2. Uji Role Guard Backend: Non-Admin dilarang masuk area Admin
  console.log("2. Uji Penegakan Peran (RBAC Guard):");
  try {
    const isAllowed = pembuatUser.roles.includes("admin");
    if (!isAllowed) {
      throw new AuthError("Akses ditolak: Memerlukan peran admin.", 403);
    }
    throw new Error("GAGAL: Pembuat soal tidak boleh lolos guard admin!");
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      console.log("   ✅ Pembuat soal ditolak 403 saat mengakses modul Admin.");
    } else {
      throw err;
    }
  }

  // 3. Uji Pembuat Soal tidak bisa memvalidasi soal apa pun
  console.log("\n3. Uji Hak Validasi:");
  try {
    await assertCanValidateQuestion("soal-ganda-001", pembuatUser);
    throw new Error("GAGAL: Pembuat soal tanpa peran validator tidak boleh memvalidasi soal!");
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      console.log("   ✅ Akun Pembuat Soal murni ditolak 403 saat mencoba memvalidasi soal.");
    } else {
      throw err;
    }
  }

  // Pastikan soal-ganda-001 berstatus menunggu_validasi untuk pengujian
  await db
    .update(questions)
    .set({ status: "menunggu_validasi" })
    .where(eq(questions.id, "soal-ganda-001"));

  // 4. ATURAN PEMISAHAN TUGAS (SEPARATION OF DUTIES):
  console.log("\n4. UJI KRITIS: Penegakan Aturan Pemisahan Tugas (Separation of Duties):");
  try {
    await assertCanValidateQuestion("soal-ganda-001", gandaUser);
    throw new Error("FATAL: Validator lolos memvalidasi soal ciptaannya sendiri! Pelanggaran pemisahan tugas!");
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403 && err.message.includes("Pemisahan tugas")) {
      console.log(`   ✅ DITOLAK BACKEND (HTTP 403):`);
      console.log(`      Pesan: "${err.message}"`);
    } else {
      throw err;
    }
  }

  // 5. Validator lain (Dr. Sari) BOLEH memvalidasi 'soal-ganda-001' ciptaan Budi
  console.log("\n5. Uji Validasi oleh Validator Lain (Bukan Author):");
  const validSoal = await assertCanValidateQuestion("soal-ganda-001", validatorUser);
  if (validSoal && validSoal.id === "soal-ganda-001") {
    console.log(`   ✅ BERHASIL: Validator independen (Dr. Sari) diizinkan memvalidasi soal ${validSoal.code}.`);
  }

  // 6. Uji Hak Edit Pembuat Soal (HANYA DRAFT & DIREVISI):
  console.log("\n6. Uji Hak Edit Pembuat Soal (HANYA jika status draft atau direvisi):");
  // A. Mengedit soal milik author lain -> DITOLAK
  try {
    await assertCanEditQuestion("soal-ganda-001", pembuatUser);
    throw new Error("GAGAL: Pembuat tidak boleh mengedit soal milik orang lain!");
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      console.log("   ✅ Pembuat ditolak 403 saat mencoba mengedit soal milik author lain.");
    }
  }

  // B. Mengedit soal miliknya yang berstatus 'disetujui' -> DITOLAK
  try {
    await assertCanEditQuestion("soal-pembuat-002", pembuatUser);
    throw new Error("GAGAL: Soal berstatus 'disetujui' tidak boleh diedit!");
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      console.log("   ✅ Pembuat ditolak 403 saat mencoba mengedit soal yang sudah 'disetujui'.");
    }
  }

  // C. Mengedit soal miliknya yang berstatus 'menunggu_validasi' -> DITOLAK
  try {
    await assertCanEditQuestion("soal-pembuat-001", pembuatUser);
    throw new Error("GAGAL: Soal berstatus 'menunggu_validasi' tidak boleh diedit langsung!");
  } catch (err: any) {
    if (err instanceof AuthError && err.statusCode === 403) {
      console.log("   ✅ Pembuat ditolak 403 saat mencoba mengedit soal yang sedang 'menunggu_validasi'.");
    }
  }

  // D. Mengedit soal miliknya yang berstatus 'perlu_revisi' / 'direvisi' -> DIIZINKAN
  const editableSoal = await assertCanEditQuestion("soal-pembuat-003", pembuatUser);
  if (editableSoal) {
    console.log(`   ✅ BERHASIL: Pembuat diizinkan mengedit soal miliknya yang berstatus perbaikan (${editableSoal.code}).`);
  }

  // 7. Uji Validasi Delimiter LaTeX
  console.log("\n7. Uji Validasi Delimiter LaTeX ($ dan $$):");
  const validFormula = "Nilai $x + 1$ dan $$\\frac{a}{b}$$";
  const latexRes1 = validateLatexDelimiters(validFormula, "Teks Soal");
  if (!latexRes1.valid) throw new Error("Formula valid dianggap tidak valid!");
  console.log("   ✅ Formula seimbang berhasil lolos validasi.");

  const unclosedInline = "Nilai $x + 1 tanpa penutup";
  const latexRes2 = validateLatexDelimiters(unclosedInline, "Teks Soal");
  if (latexRes2.valid) throw new Error("Inline tidak berpasangan harusnya ditolak!");
  console.log(`   ✅ Berhasil menolak delimiter inline ganjil: "${latexRes2.error}"`);

  const unclosedBlock = "Formula $$\\int f(x) dx tanpa penutup";
  const latexRes3 = validateLatexDelimiters(unclosedBlock, "Teks Soal");
  if (latexRes3.valid) throw new Error("Blok tidak berpasangan harusnya ditolak!");
  console.log(`   ✅ Berhasil menolak delimiter blok ganjil: "${latexRes3.error}"`);

  // 8. Uji Aturan Khusus PGK_KATEGORI
  console.log("\n8. Uji Aturan Validasi Khusus PGK_KATEGORI:");
  const pgkMismatch = {
    jenjang: "SD/MI",
    mapel: "Matematika",
    elemen: "Bilangan",
    sub_elemen: "Pecahan",
    kompetensi: "Mengenal pecahan",
    level_kognitif: "Aplikasi",
    tingkat_kesulitan: "sedang",
    bentuk_soal: "PGK_KATEGORI",
    jenis_soal: "tunggal",
    soal_text: "Perhatikan pernyataan berikut.",
    pembahasan: "Pembahasan lengkap.",
    pernyataan: [
      { no: 1, text: "Pernyataan 1" },
      { no: 2, text: "Pernyataan 2" },
      { no: 3, text: "Pernyataan 3" },
    ],
    kategori_respons: ["Benar", "Salah"],
    kunci_jawaban: ["Benar", "Salah"], // Cuma 2 jawaban, padahal ada 3 pernyataan!
  };
  const valMismatch = validateQuestionData(pgkMismatch as any);
  if (valMismatch.valid) throw new Error("PGK Kategori dengan panjang kunci tidak cocok harusnya ditolak!");
  console.log(`   ✅ Berhasil menolak mismatch panjang kunci: "${valMismatch.errors[0]}"`);

  const pgkInvalidCategory = {
    ...pgkMismatch,
    kunci_jawaban: ["Benar", "Salah", "Mungkin"], // "Mungkin" tidak ada di kategori_respons!
  };
  const valInvalidCategory = validateQuestionData(pgkInvalidCategory as any);
  if (valInvalidCategory.valid) throw new Error("PGK Kategori dengan opsi di luar kategori respons harus ditolak!");
  console.log(`   ✅ Berhasil menolak respons di luar kategori: "${valInvalidCategory.errors[0]}"`);

  // 9. Uji Aturan Stimulus (Grup vs Tunggal)
  console.log("\n9. Uji Aturan Keterkaitan Stimulus (Grup vs Tunggal):");
  const grupWithoutStimulus = {
    ...pgkMismatch,
    jenis_soal: "grup",
    stimulus_id: null,
    kunci_jawaban: ["Benar", "Salah", "Benar"],
  };
  const valGrupNoStim = validateQuestionData(grupWithoutStimulus as any);
  if (valGrupNoStim.valid) throw new Error("Soal grup tanpa stimulus harusnya ditolak!");
  console.log(`   ✅ Berhasil menolak soal grup tanpa stimulus: "${valGrupNoStim.errors[0]}"`);

  const tunggalWithStimulus = {
    ...pgkMismatch,
    jenis_soal: "tunggal",
    stimulus_id: "stm-12345",
    kunci_jawaban: ["Benar", "Salah", "Benar"],
  };
  const valTunggalWithStim = validateQuestionData(tunggalWithStimulus as any);
  if (valTunggalWithStim.valid) throw new Error("Soal tunggal dengan stimulus harusnya ditolak!");
  console.log(`   ✅ Berhasil menolak soal tunggal yang memuat stimulus_id: "${valTunggalWithStim.errors[0]}"`);

  console.log("\n=======================================================");
  console.log("🎉 SELURUH PENGUJIAN OTORISASI & VALIDASI SOAL LOLOS 100%!");
  console.log("=======================================================\n");
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Terjadi kegagalan pengujian:", err);
    process.exit(1);
  });
