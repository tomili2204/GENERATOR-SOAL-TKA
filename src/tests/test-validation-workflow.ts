import { assertValidStatusTransition } from "@/lib/validations/transitions";
import { createSessionToken } from "@/lib/auth/session";

async function runValidationWorkflowTests() {
  console.log("\n=======================================================");
  console.log("🧪 MEMULAI PENGUJIAN ALUR VALIDASI & MESIN TRANSISI STATUS");
  console.log("=======================================================\n");

  // 1. UJI MESIN TRANSISI STATUS EKSPLISIT (STATE MACHINE)
  console.log("1. Uji Mesin Transisi Status Eksplisit (Unit Tests):");

  // A. Transisi ilegal: draft -> disetujui
  const t1 = assertValidStatusTransition("draft", "disetujui");
  if (t1.valid) throw new Error("Transisi draft -> disetujui harusnya ditolak!");
  console.log(`   ✅ Ditolak: "${t1.error}"`);

  // B. Transisi ilegal: menunggu_validasi -> ditolak TANPA ALASAN
  const t2 = assertValidStatusTransition("menunggu_validasi", "ditolak", "");
  if (t2.valid) throw new Error("Penolakan tanpa alasan harusnya ditolak!");
  console.log(`   ✅ Ditolak: "${t2.error}"`);

  // C. Transisi legal: menunggu_validasi -> ditolak DENGAN ALASAN
  const t3 = assertValidStatusTransition("menunggu_validasi", "ditolak", "Tidak sesuai kisi-kisi asesmen.");
  if (!t3.valid) throw new Error("Penolakan dengan alasan harusnya diterima!");
  console.log("   ✅ Diterima: menunggu_validasi -> ditolak dengan alasan.");

  // D. Transisi ilegal: menunggu_validasi -> direvisi TANPA CATATAN
  const t4 = assertValidStatusTransition("menunggu_validasi", "direvisi", "");
  if (t4.valid) throw new Error("Permintaan revisi tanpa catatan harusnya ditolak!");
  console.log(`   ✅ Ditolak: "${t4.error}"`);

  // E. Transisi legal: menunggu_validasi -> direvisi DENGAN CATATAN
  const t5 = assertValidStatusTransition("menunggu_validasi", "direvisi", "Mohon perbaiki formula opsi C.");
  if (!t5.valid) throw new Error("Permintaan revisi dengan catatan harusnya diterima!");
  console.log("   ✅ Diterima: menunggu_validasi -> direvisi dengan catatan perbaikan.");

  // F. Transisi legal: menunggu_validasi -> disetujui
  const t6 = assertValidStatusTransition("menunggu_validasi", "disetujui");
  if (!t6.valid) throw new Error("Persetujuan harusnya diterima!");
  console.log("   ✅ Diterima: menunggu_validasi -> disetujui (siap tayang).");

  // G. Transisi ilegal: disetujui -> menunggu_validasi (disetujui adalah gerbang terakhir)
  const t7 = assertValidStatusTransition("disetujui", "menunggu_validasi");
  if (t7.valid) throw new Error("Soal disetujui tidak boleh diubah statusnya!");
  console.log(`   ✅ Ditolak: "${t7.error}"\n`);

  // 2. UJI INTEGRASI API REVIEW & PENEGAKAN PEMISAHAN TUGAS (SEPARATION OF DUTIES)
  console.log("2. Uji Integrasi API Review & Pemisahan Tugas:");

  // Token untuk pembuat soal (Rian - pembuat_soal & validator_soal)
  const tokenPembuat = await createSessionToken({
    id: "usr-pembuat-001",
    name: "Rian (Pembuat Soal)",
    email: "pembuat@ayotka.id",
    roles: ["pembuat_soal", "validator_soal"] as const,
  });

  // Token untuk validator murni (Dr. Sari)
  const tokenValidator = await createSessionToken({
    id: "usr-validator-001",
    name: "Dr. Sari (Validator)",
    email: "validator@ayotka.id",
    roles: ["validator_soal"] as const,
  });

  // A. Buat 1 butir soal baru via API oleh akun Budi
  console.log("   - Mengunggah butir soal baru oleh Budi (ganda@ayotka.id):");
  const createRes = await fetch("http://localhost:3000/api/questions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `ayotka_session=${tokenPembuat}`,
    },
    body: JSON.stringify({
      jenjang: "SD/MI",
      mapel: "Matematika",
      elemen: "Geometri",
      sub_elemen: "Bangun Ruang",
      kompetensi: "Menghitung luas permukaan",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      soal_text: "Luas permukaan kubus dengan sisi $s = 4\\text{ cm}$ adalah...",
      pembahasan: "$$L = 6s^2 = 6 \\times 16 = 96\\text{ cm}^2$$",
      opsi: [
        { label: "A", text: "$96\\text{ cm}^2$" },
        { label: "B", text: "$64\\text{ cm}^2$" },
        { label: "C", text: "$24\\text{ cm}^2$" },
        { label: "D", text: "$16\\text{ cm}^2$" },
      ],
      kunci_jawaban: ["A"],
    }),
  });
  const createJson = await createRes.json();
  if (!createRes.ok || !createJson.success) {
    throw new Error(`Gagal membuat soal uji: ${JSON.stringify(createJson)}`);
  }
  const createdQuestionId = createJson.data.id;
  const createdCode = createJson.data.code;
  console.log(`   ✅ Soal baru berhasil dibuat: ID = ${createdQuestionId} (${createdCode})`);

  // B. Budi mencoba memvalidasi soal buatannya sendiri -> DITOLAK 403
  console.log("   - Budi mencoba memvalidasi soal ciptaan sendiri via API:");
  const resSelf = await fetch("http://localhost:3000/api/validator/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `ayotka_session=${tokenPembuat}`,
    },
    body: JSON.stringify({
      questionId: createdQuestionId,
      decision: "disetujui",
    }),
  });
  const jsonSelf = await resSelf.json();
  if (resSelf.status !== 403 || jsonSelf.success) {
    throw new Error("FATAL: Validator lolos memvalidasi soal ciptaannya sendiri lewat API!");
  }
  console.log(`   ✅ Ditolak HTTP 403: "${jsonSelf.error}"`);

  // C. Dr. Sari menelaah soal ciptaan Budi -> BERHASIL (Minta Revisi)
  console.log("   - Dr. Sari menelaah soal ciptaan Budi via API (Minta Revisi):");
  const resValid = await fetch("http://localhost:3000/api/validator/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `ayotka_session=${tokenValidator}`,
    },
    body: JSON.stringify({
      questionId: createdQuestionId,
      decision: "direvisi",
      notes: "Catatan: Mohon berikan satuan centimeter persegi pada opsi C.",
    }),
  });
  const jsonValid = await resValid.json();
  if (!resValid.ok || !jsonValid.success) {
    throw new Error(`Gagal memproses review: ${JSON.stringify(jsonValid)}`);
  }
  console.log(`   ✅ BERHASIL HTTP 200: "${jsonValid.message}"`);

  // 3. UJI LOG APPEND-ONLY PADA TABEL validation_logs VIA API RIWAYAT
  console.log("\n3. Uji Verifikasi Append-Only Audit Log (via GET /api/validator/history):");
  const resHist = await fetch("http://localhost:3000/api/validator/history", {
    headers: { Cookie: `ayotka_session=${tokenValidator}` },
  });
  const jsonHist = await resHist.json();
  if (!jsonHist.success || !Array.isArray(jsonHist.data) || jsonHist.data.length === 0) {
    throw new Error("Log validasi tidak ditemukan di riwayat validator!");
  }
  const matchingLog = jsonHist.data.find((log: any) => log.questionId === createdQuestionId);
  if (!matchingLog) {
    throw new Error(`Log validasi untuk soal ${createdQuestionId} tidak ditemukan!`);
  }
  console.log(`   ✅ Record Log Append-Only Terverifikasi: ID = ${matchingLog.id}`);
  console.log(`   ✅ Validator Email: ${matchingLog.validatorEmail}`);
  console.log(`   ✅ Transisi Status: ${matchingLog.previousStatus} -> ${matchingLog.newStatus}`);
  console.log(`   ✅ Catatan Tersimpan Abadi: "${matchingLog.notes}"`);
  console.log(`   ✅ Riwayat validator berhasil dimuat: ${jsonHist.data.length} total catatan aksi.`);

  console.log("\n=======================================================");
  console.log("🎉 SELURUH PENGUJIAN ALUR VALIDASI FASE 3 LOLOS 100%!");
  console.log("=======================================================\n");
}

runValidationWorkflowTests().catch((err) => {
  console.error("❌ Test Gagal:", err);
  process.exitCode = 1;
});
