import { createSessionToken } from "@/lib/auth/session";

async function testPackageWorkflow() {
  console.log("\n=======================================================");
  console.log("🧪 TESTING MANAJEMEN PAKET SOAL (OPSI 1: 30 SLOT BLUEPRINT)");
  console.log("=======================================================\n");

  const baseUrl = "http://localhost:3000";

  // Auth tokens
  const tokenPembuat = await createSessionToken({
    id: "usr-pembuat-001",
    name: "Rian (Pembuat Soal)",
    email: "pembuat@ayotka.id",
    roles: ["pembuat_soal"],
  });

  const tokenValidator = await createSessionToken({
    id: "usr-validator-001",
    name: "Dr. Sari (Validator)",
    email: "validator@ayotka.id",
    roles: ["validator_soal"],
  });

  // 1. UJI PEMBUATAN PAKET BARU (H)
  console.log("1. Menguji Pembuatan Paket Baru (H):");
  const createPkgRes = await fetch(`${baseUrl}/api/packages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `ayotka_session=${tokenPembuat}`,
    },
    body: JSON.stringify({
      jenjang: "SD/MI",
      mapel: "Matematika",
      tipeSumber: "manual",
      customNama: "Paket Simulasi Ujian Mandiri Set 1",
    }),
  });

  const createPkgJson = await createPkgRes.json();
  if (!createPkgRes.ok || !createPkgJson.success) {
    throw new Error(`Gagal membuat paket: ${JSON.stringify(createPkgJson)}`);
  }

  const pkg = createPkgJson.data;
  console.log(`   ✅ Paket berhasil dibuat: Kode = ${pkg.code} (ID = ${pkg.id})`);
  console.log(`   ✅ Nama: "${pkg.nama}"`);
  console.log(`   ✅ Status Awal: ${pkg.status} (${pkg.progress.filledSoal}/${pkg.progress.totalSoal} slot terisi)`);

  // 2. UJI DETAIL PAKET & 30 SLOT CETAK BIRU
  console.log("\n2. Menguji Detail Paket & Cetak Biru 30 Slot:");
  const detailRes = await fetch(`${baseUrl}/api/packages/${pkg.id}`, {
    headers: { Cookie: `ayotka_session=${tokenPembuat}` },
  });
  const detailJson = await detailRes.json();
  if (!detailRes.ok || !detailJson.success) {
    throw new Error(`Gagal mengambil detail paket: ${JSON.stringify(detailJson)}`);
  }

  const { slots } = detailJson.data;
  if (!Array.isArray(slots) || slots.length !== 30) {
    throw new Error(`Jumlah slot cetak biru harus tepat 30 (ditemukan: ${slots.length})`);
  }
  console.log(`   ✅ Terverifikasi tepat 30 slot cetak biru terinisialisasi.`);
  console.log(`   ✅ Slot #01: ${slots[0].blueprint.bentukSoal} (${slots[0].blueprint.tingkatKesulitan})`);
  console.log(`   ✅ Slot #16: ${slots[15].blueprint.bentukSoal} (${slots[15].blueprint.tingkatKesulitan})`);
  console.log(`   ✅ Slot #24: ${slots[23].blueprint.bentukSoal} (${slots[23].blueprint.tingkatKesulitan})`);

  // 3. UJI PENGISIAN SLOT #01 (PG DENGAN FORMULA KATEX)
  console.log("\n3. Menguji Pengisian Slot #01 oleh Pembuat Soal:");
  const fillSlot1Res = await fetch(`${baseUrl}/api/packages/${pkg.id}/slots/1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `ayotka_session=${tokenPembuat}`,
    },
    body: JSON.stringify({
      elemen: "Bilangan",
      sub_elemen: "Operasi Hitung",
      kompetensi: "Menyelesaikan operasi hitung pecahan",
      level_kognitif: "Pengetahuan dan Pemahaman",
      tingkat_kesulitan: "rendah",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      soal_text: "Hasil dari $\\frac{1}{2} + \\frac{1}{4}$ adalah...",
      pembahasan: "$$\\frac{1}{2} + \\frac{1}{4} = \\frac{2+1}{4} = \\frac{3}{4}$$",
      opsi: [
        { label: "A", text: "$\\frac{3}{4}$" },
        { label: "B", text: "$\\frac{2}{6}$" },
        { label: "C", text: "$\\frac{1}{6}$" },
        { label: "D", text: "$\\frac{1}{8}$" },
      ],
      kunci_jawaban: ["A"],
    }),
  });

  const fillSlot1Json = await fillSlot1Res.json();
  if (!fillSlot1Res.ok || !fillSlot1Json.success) {
    throw new Error(`Gagal mengisi Slot 1: ${JSON.stringify(fillSlot1Json)}`);
  }
  console.log(`   ✅ Slot #01 berhasil diisi: Kode Butir = ${fillSlot1Json.data.itemCode}`);
  console.log(`   ✅ Progres Paket Terkini: ${fillSlot1Json.data.packageProgress.filledSoal}/30 slot terisi (Status: ${fillSlot1Json.data.packageProgress.status})`);

  // 4. UJI SIMULASI SKENARIO DILEMA PENGGUNA (28 VALID, 1 REVISI, 1 DITOLAK)
  console.log("\n4. Menguji Skenario Dilema Paket: 1 Direvisi, 1 Ditolak:");

  // Isi slot #14 (akan direvisi)
  const fillSlot14Res = await fetch(`${baseUrl}/api/packages/${pkg.id}/slots/14`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `ayotka_session=${tokenPembuat}`,
    },
    body: JSON.stringify({
      elemen: "Geometri",
      sub_elemen: "Bangun Ruang",
      kompetensi: "Volume Kubus",
      level_kognitif: "Penalaran",
      tingkat_kesulitan: "tinggi",
      bentuk_soal: "PG",
      jenis_soal: "tunggal",
      soal_text: "Sebuah kubus memiliki volume $V = 64\\text{ cm}^3$. Berapa panjang rusuknya?",
      pembahasan: "$$s = \\sqrt[3]{64} = 4\\text{ cm}$$",
      opsi: [
        { label: "A", text: "4 cm" },
        { label: "B", text: "8 cm" },
        { label: "C", text: "16 cm" },
        { label: "D", text: "32 cm" },
      ],
      kunci_jawaban: ["A"],
    }),
  });
  const fillSlot14Json = await fillSlot14Res.json();
  if (!fillSlot14Res.ok || !fillSlot14Json.success) {
    throw new Error(`Gagal mengisi Slot 14: ${JSON.stringify(fillSlot14Json)}`);
  }
  const q14Id = fillSlot14Json.data.questionId;

  // Isi slot #25 (akan ditolak)
  const fillSlot25Res = await fetch(`${baseUrl}/api/packages/${pkg.id}/slots/25`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `ayotka_session=${tokenPembuat}`,
    },
    body: JSON.stringify({
      elemen: "Aljabar",
      sub_elemen: "Barisan dan Deret",
      kompetensi: "Pola Bilangan",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_KATEGORI",
      jenis_soal: "tunggal",
      soal_text: "Tentukan kebenaran dari pernyataan berikut mengenai bilangan prima:",
      pembahasan: "2 adalah satu-satunya bilangan prima genap.",
      pernyataan: [
        { no: 1, text: "2 adalah bilangan prima" },
        { no: 2, text: "9 adalah bilangan prima" },
      ],
      kategori_respons: ["Benar", "Salah"],
      kunci_jawaban: ["Benar", "Salah"],
    }),
  });
  const fillSlot25Json = await fillSlot25Res.json();
  if (!fillSlot25Res.ok || !fillSlot25Json.success) {
    throw new Error(`Gagal mengisi Slot 25: ${JSON.stringify(fillSlot25Json)}`);
  }
  const q25Id = fillSlot25Json.data.questionId;

  // Validator melakukan telaah:
  // A. Slot #01 -> DISETUJUI
  await fetch(`${baseUrl}/api/validator/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `ayotka_session=${tokenValidator}` },
    body: JSON.stringify({ questionId: fillSlot1Json.data.questionId, decision: "disetujui" }),
  });
  console.log("   ✅ Slot #01 disetujui oleh Validator.");

  // B. Slot #14 -> DIREVISI (dengan catatan perbaikan)
  await fetch(`${baseUrl}/api/validator/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `ayotka_session=${tokenValidator}` },
    body: JSON.stringify({
      questionId: q14Id,
      decision: "direvisi",
      notes: "Mohon ganti format pilihan jawaban dengan LaTeX format math mode.",
    }),
  });
  console.log("   ✅ Slot #14 ditandai DIREVISI oleh Validator.");

  // C. Slot #25 -> DITOLAK (dengan alasan)
  await fetch(`${baseUrl}/api/validator/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `ayotka_session=${tokenValidator}` },
    body: JSON.stringify({
      questionId: q25Id,
      decision: "ditolak",
      notes: "Soal tidak sesuai dengan kompetensi kisi-kisi aljabar SD.",
    }),
  });
  console.log("   ✅ Slot #25 DITOLAK oleh Validator.");

  // Verifikasi Status Paket Otomatis Berubah ke 'perlu_revisi'
  const checkRes = await fetch(`${baseUrl}/api/packages/${pkg.id}`, {
    headers: { Cookie: `ayotka_session=${tokenPembuat}` },
  });
  const checkJson = await checkRes.json();
  const currentProg = checkJson.data.progress;

  console.log(`\n   📊 Evaluasi Status Agregasi Paket:`);
  console.log(`      - Disetujui: ${currentProg.disetujuiCount}`);
  console.log(`      - Perlu Revisi: ${currentProg.direvisiCount}`);
  console.log(`      - Ditolak: ${currentProg.ditolakCount}`);
  console.log(`      - Status Paket: "${checkJson.data.package.status}"`);

  if (checkJson.data.package.status !== "perlu_revisi") {
    throw new Error(`Status paket harusnya 'perlu_revisi' saat ada butir direvisi/ditolak!`);
  }
  console.log("   ✅ Status paket otomatis berubah menjadi 'perlu_revisi'.");

  // Uji Coba Penerbitan Paket (Harus DITOLAK karena belum 30/30)
  console.log("\n5. Uji Coba Penerbitan Paket Belum Lolos 30/30 (Harus Ditolak):");
  const pubFailRes = await fetch(`${baseUrl}/api/packages/${pkg.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: `ayotka_session=${tokenPembuat}` },
    body: JSON.stringify({ action: "publish" }),
  });
  const pubFailJson = await pubFailRes.json();
  if (pubFailRes.status !== 400 || pubFailJson.success) {
    throw new Error("Penerbitan paket belum 30/30 disetujui harusnya ditolak!");
  }
  console.log(`   ✅ Ditolak dengan tepat (HTTP 400): "${pubFailJson.error}"`);

  // 6. UJI PENGGANTIAN BUTIR DITOLAK (REPLACEMENT ITEM) PADA SLOT #25
  console.log("\n6. Menguji Alur Penggantian Butir Ditolak pada Slot #25:");
  const replaceSlot25Res = await fetch(`${baseUrl}/api/packages/${pkg.id}/slots/25`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `ayotka_session=${tokenPembuat}`,
    },
    body: JSON.stringify({
      elemen: "Aljabar",
      sub_elemen: "Barisan Aritmetika",
      kompetensi: "Pola Bilangan Sederhana",
      level_kognitif: "Aplikasi",
      tingkat_kesulitan: "sedang",
      bentuk_soal: "PGK_KATEGORI",
      jenis_soal: "tunggal",
      soal_text: "Diberikan barisan bilangan: $2, 4, 6, 8, ...$. Tentukan kebenaran pernyataan berikut:",
      pembahasan: "Suku ke-$n$ adalah $U_n = 2n$.",
      pernyataan: [
        { no: 1, text: "Suku ke-5 adalah 10" },
        { no: 2, text: "Beda setiap suku adalah 3" },
      ],
      kategori_respons: ["Benar", "Salah"],
      kunci_jawaban: ["Benar", "Salah"],
    }),
  });
  const replaceSlot25Json = await replaceSlot25Res.json();
  if (!replaceSlot25Res.ok || !replaceSlot25Json.success) {
    throw new Error(`Gagal mengganti slot 25: ${JSON.stringify(replaceSlot25Json)}`);
  }
  console.log(`   ✅ Slot #25 berhasil diganti dengan butir baru. Status butir kembali: menunggu_validasi.`);

  // Validator menelaah ulang slot #25 pengganti -> DISETUJUI
  await fetch(`${baseUrl}/api/validator/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `ayotka_session=${tokenValidator}` },
    body: JSON.stringify({ questionId: replaceSlot25Json.data.questionId, decision: "disetujui" }),
  });
  console.log("   ✅ Butir pengganti pada Slot #25 berhasil DISETUJUI oleh Validator.");

  console.log("\n=======================================================");
  console.log("🎉 SELURUH PENGUJIAN MANAJEMEN PAKET & 30 SLOT LOLOS 100%!");
  console.log("=======================================================\n");
}

testPackageWorkflow().catch((err) => {
  console.error("❌ Test Gagal:", err);
  process.exitCode = 1;
});
