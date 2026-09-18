import bcrypt from "bcryptjs";
import { db, ensureTablesCreated } from "./index";
import { users, userRoles, generatorConfigs, fixedTaxonomies, questions, auditLogs } from "./schema";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  console.log("⚡ Memastikan tabel database dibuat...");
  await ensureTablesCreated();

  console.log("🌱 Menjalankan seed data akun dan konfigurasi awal...");

  // Password hash default untuk akun testing
  const passwordHash = await bcrypt.hash("password123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);
  const pembuatHash = await bcrypt.hash("pembuat123", 10);
  const validatorHash = await bcrypt.hash("validator123", 10);
  const gandaHash = await bcrypt.hash("ganda123", 10);

  const testUsers = [
    {
      id: "usr-admin-001",
      name: "Super Admin AyoTKA",
      email: "admin@ayotka.id",
      passwordHash: adminHash,
      instansi: "Pusat Kurikulum & Asesmen (Puskurjar)",
      assignedJenjang: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
      assignedMapel: ["Matematika", "Bahasa Indonesia"],
      roles: ["admin" as const],
    },
    {
      id: "usr-pembuat-001",
      name: "Rian (Pembuat Soal)",
      email: "pembuat@ayotka.id",
      passwordHash: pembuatHash,
      instansi: "SDN Menteng 01 Jakarta",
      assignedJenjang: ["SD/MI"],
      assignedMapel: ["Matematika", "Bahasa Indonesia"],
      roles: ["pembuat_soal" as const],
    },
    {
      id: "usr-tomi-001",
      name: "Dr. Tomi Listiawan",
      email: "tomi@ayotka.id",
      passwordHash: validatorHash,
      instansi: "AyoTKA Pusat",
      assignedJenjang: ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"],
      assignedMapel: ["Matematika", "Bahasa Indonesia"],
      roles: ["validator_soal" as const, "pembuat_soal" as const],
    },
  ];

  for (const u of testUsers) {
    const existing = await db.select().from(users).where(eq(users.email, u.email)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values({
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        instansi: u.instansi,
        assignedJenjang: u.assignedJenjang,
        assignedMapel: u.assignedMapel,
        isActive: true,
      });

      for (const r of u.roles) {
        await db.insert(userRoles).values({
          id: `role-${u.id}-${r}`,
          userId: u.id,
          role: r,
        });
      }
    } else {
      await db.update(users).set({
        instansi: existing[0].instansi || u.instansi,
        assignedJenjang: (existing[0].assignedJenjang && (existing[0].assignedJenjang as string[]).length > 0) ? existing[0].assignedJenjang : u.assignedJenjang,
        assignedMapel: (existing[0].assignedMapel && (existing[0].assignedMapel as string[]).length > 0) ? existing[0].assignedMapel : u.assignedMapel,
      }).where(eq(users.id, existing[0].id));
    }
  }

  // Seed Generator Configs (Admin only)
  const configs = [
    { id: "gen-sd-mat", jenjang: "SD/MI" as const, mapel: "Matematika" as const, isAutoActive: true, dailyTargetQuota: 30 },
    { id: "gen-sd-indo", jenjang: "SD/MI" as const, mapel: "Bahasa Indonesia" as const, isAutoActive: false, dailyTargetQuota: 30 },
    { id: "gen-smp-mat", jenjang: "SMP/MTs" as const, mapel: "Matematika" as const, isAutoActive: true, dailyTargetQuota: 30 },
    { id: "gen-smp-indo", jenjang: "SMP/MTs" as const, mapel: "Bahasa Indonesia" as const, isAutoActive: false, dailyTargetQuota: 30 },
  ];

  for (const c of configs) {
    const existing = await db.select().from(generatorConfigs).where(eq(generatorConfigs.id, c.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(generatorConfigs).values({
        id: c.id,
        jenjang: c.jenjang,
        mapel: c.mapel,
        isAutoActive: c.isAutoActive,
        dailyTargetQuota: c.dailyTargetQuota,
        config: { model: "gemini-1.5-pro", temperature: 0.7, batchSize: 5 },
        updatedBy: "usr-admin-001",
      });
    }
  }

  // Seed Taxonomies (Elemen Materi)
  const taxonomies = [
    { id: "tax-1", jenjang: "SD/MI" as const, mapel: "Matematika" as const, category: "elemen", code: "BIL", name: "Bilangan", sortOrder: 1 },
    { id: "tax-2", jenjang: "SD/MI" as const, mapel: "Matematika" as const, category: "elemen", code: "ALJ", name: "Aljabar & Pola", sortOrder: 2 },
    { id: "tax-3", jenjang: "SD/MI" as const, mapel: "Matematika" as const, category: "elemen", code: "GEO", name: "Geometri", sortOrder: 3 },
    { id: "tax-4", jenjang: "SD/MI" as const, mapel: "Matematika" as const, category: "elemen", code: "UKR", name: "Pengukuran", sortOrder: 4 },
    { id: "tax-5", jenjang: "SD/MI" as const, mapel: "Matematika" as const, category: "elemen", code: "DAT", name: "Pengolahan Data", sortOrder: 5 },
    { id: "tax-6", jenjang: "SD/MI" as const, mapel: "Bahasa Indonesia" as const, category: "elemen", code: "TEK", name: "Pemahaman Tekstual", sortOrder: 1 },
    { id: "tax-7", jenjang: "SD/MI" as const, mapel: "Bahasa Indonesia" as const, category: "elemen", code: "INF", name: "Pemahaman Inferensial", sortOrder: 2 },
    { id: "tax-8", jenjang: "SD/MI" as const, mapel: "Bahasa Indonesia" as const, category: "elemen", code: "EVA", name: "Evaluasi & Refleksi", sortOrder: 3 },
  ];

  for (const t of taxonomies) {
    const existing = await db.select().from(fixedTaxonomies).where(eq(fixedTaxonomies.id, t.id)).limit(1);
    if (existing.length === 0) {
      await db.insert(fixedTaxonomies).values({
        id: t.id,
        jenjang: t.jenjang,
        mapel: t.mapel,
        category: t.category,
        code: t.code,
        name: t.name,
        sortOrder: t.sortOrder,
        metadata: { standard: "Kemendikdasmen 2024" },
      });
    }
  }

  // Sample dummy questions removed to keep production clean

  // Seed Audit Log
  const initialLog = await db.select().from(auditLogs).limit(1);
  if (initialLog.length === 0) {
    await db.insert(auditLogs).values({
      id: "log-init-001",
      userId: "usr-admin-001",
      userEmail: "admin@ayotka.id",
      action: "SYSTEM_INITIALIZE",
      targetResource: "system/seed",
      details: { message: "Inisialisasi sistem, akun peran, dan konfigurasi generator AyoTKA" },
      ipAddress: "127.0.0.1",
    });
  }

  console.log("✅ Seed database berhasil diselesaikan!");
}

// Jalankan otomatis jika dipanggil langsung via CLI
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Gagal seed database:", err);
      process.exit(1);
    });
}
