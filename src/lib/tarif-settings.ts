import { db, ensureTablesCreated } from "@/db";
import { systemSettings, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import {
  TarifSettings,
  ItemTarifSetting,
  SETTINGS_KEY_TARIF,
  DEFAULT_TARIF_SETTINGS,
} from "@/types/tarif";

export * from "@/types/tarif";

/**
 * Mengambil konfigurasi besaran biaya (tarif) dari database
 */
export async function getTarifSettings(): Promise<TarifSettings> {
  try {
    await ensureTablesCreated();
    const rows = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, SETTINGS_KEY_TARIF))
      .limit(1);

    if (rows.length === 0 || !rows[0].value) {
      return DEFAULT_TARIF_SETTINGS;
    }

    const val = rows[0].value as any;

    return {
      pembuatan: {
        skema: val.pembuatan?.skema === "per_paket" ? "per_paket" : "per_soal",
        nominal: Number(val.pembuatan?.nominal) || DEFAULT_TARIF_SETTINGS.pembuatan.nominal,
        catatan: val.pembuatan?.catatan || "",
      },
      validasi: {
        skema: val.validasi?.skema === "per_paket" ? "per_paket" : "per_soal",
        nominal: Number(val.validasi?.nominal) || DEFAULT_TARIF_SETTINGS.validasi.nominal,
        catatan: val.validasi?.catatan || "",
      },
      updatedAt: val.updatedAt || rows[0].updatedAt?.toISOString(),
      updatedBy: val.updatedBy,
    };
  } catch (error) {
    console.error("Gagal mengambil tarif settings:", error);
    return DEFAULT_TARIF_SETTINGS;
  }
}

/**
 * Menyimpan konfigurasi besaran biaya (tarif) ke database dan mencatat audit log
 */
export async function saveTarifSettings(
  input: {
    pembuatan: ItemTarifSetting;
    validasi: ItemTarifSetting;
  },
  adminUser: { id: string; email: string; name?: string }
): Promise<TarifSettings> {
  await ensureTablesCreated();

  const cleanedSettings: TarifSettings = {
    pembuatan: {
      skema: input.pembuatan.skema === "per_paket" ? "per_paket" : "per_soal",
      nominal: Math.max(0, Math.floor(Number(input.pembuatan.nominal) || 0)),
      catatan: input.pembuatan.catatan?.trim() || "",
    },
    validasi: {
      skema: input.validasi.skema === "per_paket" ? "per_paket" : "per_soal",
      nominal: Math.max(0, Math.floor(Number(input.validasi.nominal) || 0)),
      catatan: input.validasi.catatan?.trim() || "",
    },
    updatedAt: new Date().toISOString(),
    updatedBy: {
      id: adminUser.id,
      name: adminUser.name || "Admin",
      email: adminUser.email,
    },
  };

  const existing = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, SETTINGS_KEY_TARIF))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(systemSettings)
      .set({
        value: cleanedSettings,
        updatedBy: adminUser.id,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.key, SETTINGS_KEY_TARIF));
  } else {
    await db.insert(systemSettings).values({
      key: SETTINGS_KEY_TARIF,
      value: cleanedSettings,
      updatedBy: adminUser.id,
      updatedAt: new Date(),
    });
  }

  // Audit log
  try {
    await db.insert(auditLogs).values({
      id: `audit-${crypto.randomUUID()}`,
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: "UPDATE_TARIF_SETTINGS",
      targetResource: "system_settings:tarif_honorarium",
      details: cleanedSettings,
    });
  } catch (logErr) {
    console.warn("Gagal menulis audit log untuk tarif settings:", logErr);
  }

  return cleanedSettings;
}
