import { db, ensureTablesCreated } from "../db";
import { users, userRoles, questionPackages, honorariumRecords } from "../db/schema";
import { eq } from "drizzle-orm";

async function runTests() {
  console.log("🚀 Memulai Verifikasi Otomatis Fitur Baru...");
  await ensureTablesCreated();

  const baseUrl = "http://localhost:3000";

  // 1. Login sebagai Super Admin
  console.log("\n1. Melakukan Autentikasi Admin...");
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@ayotka.id",
      password: "admin123",
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login gagal: ${loginRes.status}`);
  }

  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Cookie sesi tidak diterima");
  }
  const cookieHeader = setCookie.split(";")[0];
  console.log("✅ Berhasil login sebagai Admin.");

  // 2. Test User Management: Tambah Pengguna Baru
  console.log("\n2. Menguji Tambah Pengguna Baru (Instansi, Multi-Peran, Jenjang & Mapel)...");
  const testEmail = `guru.test.${Date.now()}@ayotka.id`;
  const createUserRes = await fetch(`${baseUrl}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      name: "Bambang Pamungkas, M.Pd.",
      email: testEmail,
      password: "password123",
      instansi: "SMA Negeri 8 Jakarta",
      roles: ["pembuat_soal", "validator_soal"], // Keduanya
      assignedJenjang: ["SMA/MA", "SMK/MAK"],
      assignedMapel: ["Matematika"],
      isActive: true,
    }),
  });

  const createUserJson = await createUserRes.json();
  if (!createUserRes.ok || !createUserJson.success) {
    throw new Error(`Gagal tambah user: ${JSON.stringify(createUserJson)}`);
  }
  const createdUserId = createUserJson.data.id;
  console.log(`✅ Berhasil menambahkan user: ${createUserJson.data.name} (ID: ${createdUserId})`);
  console.log(`   Asal Instansi: ${createUserJson.data.instansi}`);
  console.log(`   Peran: ${createUserJson.data.roles.join(", ")} (Keduanya)`);
  console.log(`   Jenjang: ${createUserJson.data.assignedJenjang.join(", ")}`);
  console.log(`   Mapel: ${createUserJson.data.assignedMapel.join(", ")}`);

  // 3. Test Ambil Daftar Pengguna
  console.log("\n3. Menguji Pengambilan Data Pengguna...");
  const getUsersRes = await fetch(`${baseUrl}/api/admin/users`, {
    headers: { Cookie: cookieHeader },
  });
  const getUsersJson = await getUsersRes.json();
  const foundUser = getUsersJson.data.find((u: any) => u.id === createdUserId);
  if (!foundUser || foundUser.instansi !== "SMA Negeri 8 Jakarta") {
    throw new Error("User yang baru dibuat tidak ditemukan pada GET /api/admin/users");
  }
  console.log("✅ Data pengguna terverifikasi di daftar pengguna.");

  // 4. Test Penugasan Paket & Penegakan Pemisahan Tugas (Separation of Duties)
  console.log("\n4. Menguji Penugasan Paket Soal & Pemisahan Tugas (SoD)...");
  const existingPkgs = await db.select().from(questionPackages).limit(1);
  if (existingPkgs.length > 0) {
    const pkg = existingPkgs[0];

    // Skenario A: Coba tugaskan author sebagai validator (Harus DITOLAK 403)
    if (pkg.authorId) {
      console.log(`   Uji Penolakan SoD: Menugaskan author (${pkg.authorId}) sebagai validator paketnya sendiri...`);
      const sodRes = await fetch(`${baseUrl}/api/admin/packages/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          packageId: pkg.id,
          validatorId: pkg.authorId,
        }),
      });
      const sodJson = await sodRes.json();
      if (sodRes.status === 403 && !sodJson.success) {
        console.log(`   ✅ Sesuai Harapan! Ditolak oleh backend: "${sodJson.error}"`);
      } else {
        throw new Error(`Aturan Pemisahan Tugas GAGAL! Status: ${sodRes.status}`);
      }
    }

    // Skenario B: Tugaskan ke validator yang valid (Bukan author)
    console.log(`   Menugaskan paket ${pkg.code} kepada Dr. Sari (usr-validator-001)...`);
    const validAssignRes = await fetch(`${baseUrl}/api/admin/packages/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        packageId: pkg.id,
        validatorId: "usr-validator-001",
      }),
    });
    const validAssignJson = await validAssignRes.json();
    if (!validAssignRes.ok || !validAssignJson.success) {
      throw new Error(`Gagal menugaskan paket: ${JSON.stringify(validAssignJson)}`);
    }
    console.log(`   ✅ Paket berhasil ditugaskan: "${validAssignJson.message}"`);
  }

  // 5. Test Laporan Validasi & Honorarium (HR)
  console.log("\n5. Menguji Laporan Validasi & Honorarium (HR)...");
  const getHrRes = await fetch(`${baseUrl}/api/admin/honorarium`, {
    headers: { Cookie: cookieHeader },
  });
  const getHrJson = await getHrRes.json();
  if (!getHrRes.ok || !getHrJson.success) {
    throw new Error(`Gagal memuat laporan HR: ${JSON.stringify(getHrJson)}`);
  }
  console.log(`✅ Laporan HR berhasil dimuat:`);
  console.log(`   Total Validator: ${getHrJson.summary.totalValidator}`);
  console.log(`   Total Soal Divalidasi: ${getHrJson.summary.totalSoalDivalidasi}`);
  console.log(`   Total Paket Divalidasi: ${getHrJson.summary.totalPaketDivalidasi}`);
  console.log(`   Total HR Sudah Dibayar: Rp ${getHrJson.summary.totalNominalSudahDibayar.toLocaleString("id-ID")}`);
  console.log(`   Total HR Belum Dibayar: Rp ${getHrJson.summary.totalNominalBelumDibayar.toLocaleString("id-ID")}`);

  // 6. Test Update Pembayaran HR
  console.log("\n6. Menguji Pembaruan Status Pembayaran HR...");
  const updateHrRes = await fetch(`${baseUrl}/api/admin/honorarium`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({
      userId: "usr-validator-001",
      periode: "Maret 2026",
      totalSoal: 25,
      totalPaket: 1,
      tarifPerItem: 25000,
      statusBayar: "sudah_dibayar",
      catatanBayar: "Transfer BNI Virtual Account #TX-8829104",
      tanggalBayar: "2026-03-16",
    }),
  });

  const updateHrJson = await updateHrRes.json();
  if (!updateHrRes.ok || !updateHrJson.success) {
    throw new Error(`Gagal update HR: ${JSON.stringify(updateHrJson)}`);
  }
  console.log(`✅ Pembaruan HR berhasil: "${updateHrJson.message}"`);

  // 7. Cleanup user testing
  console.log("\n7. Membersihkan akun testing...");
  await db.delete(users).where(eq(users.id, createdUserId));
  console.log("✅ Akun testing berhasil dibersihkan.");

  console.log("\n🎉 SELURUH PENGUJIAN FITUR BARU BERHASIL 100%!");
}

runTests().catch((e) => {
  console.error("\n❌ PENGUJIAN GAGAL:", e);
  process.exit(1);
});
