import { db, ensureTablesCreated } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStoredAiConfig } from "./gemini-generator";

/**
 * Katalog model Gemini dinamis: ditarik dari Google (models.list), disaring hanya model
 * teks generatif Flash/Pro, diberi label otomatis berdasarkan pola nama, dan di-cache di
 * database selama 24 jam agar halaman /admin/generator tidak memanggil Google setiap dibuka.
 */

const CACHE_KEY = "gemini_model_catalog_cache";
const BLOCKLIST_KEY = "gemini_model_blocklist";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_MODEL_BLOCKLIST = ["gemini-flash-latest", "gemini-pro-latest"];

// Dipakai HANYA jika belum pernah ada cache sama sekali DAN pemanggilan ke Google juga gagal
// (mis. API key belum diisi), supaya dropdown pengaturan tidak pernah kosong total.
const FALLBACK_MODELS: ModelCatalogEntry[] = [
  { id: "gemini-3.8-flash", displayName: "Gemini 3.8 Flash", description: "", badges: ["Stabil", "Direkomendasikan (Terbaru)"] },
  { id: "gemini-3-flash-preview", displayName: "Gemini 3 Flash Preview", description: "", badges: ["Preview — dapat berubah sewaktu-waktu"] },
  { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash", description: "", badges: ["Stabil"] },
];

export interface ModelCatalogEntry {
  id: string;
  displayName: string;
  description: string;
  badges: string[];
}

export interface ModelCatalogResponse {
  models: ModelCatalogEntry[];
  blocklist: string[];
  cachedAt: string | null;
  cacheStale: boolean;
  source: "google" | "cache" | "fallback";
  /** Seluruh id model mentah dari Google (sebelum disaring), null jika tidak ada data mentah sama sekali. */
  rawModelIds: string[] | null;
}

export async function getModelBlocklist(): Promise<string[]> {
  await ensureTablesCreated();
  const records = await db.select().from(systemSettings).where(eq(systemSettings.key, BLOCKLIST_KEY)).limit(1);
  const val = records[0]?.value;
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");
  return DEFAULT_MODEL_BLOCKLIST;
}

export async function setModelBlocklist(list: string[]): Promise<void> {
  await ensureTablesCreated();
  const cleaned = Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)));
  const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, BLOCKLIST_KEY)).limit(1);
  if (existing.length > 0) {
    await db.update(systemSettings).set({ value: cleaned, updatedAt: new Date() }).where(eq(systemSettings.key, BLOCKLIST_KEY));
  } else {
    await db.insert(systemSettings).values({ key: BLOCKLIST_KEY, value: cleaned, updatedAt: new Date() });
  }
}

function parseVersion(lowerName: string): number {
  const match = lowerName.match(/gemini-(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

/** Priority chain sesuai spesifikasi: preview > lite > pro > (sisanya) stabil. */
function computeBaseBadges(lowerName: string): string[] {
  if (lowerName.includes("preview")) return ["Preview — dapat berubah sewaktu-waktu"];
  if (lowerName.includes("lite")) return ["Hemat Biaya — tidak disarankan untuk generate soal (constraint-following lebih lemah)"];
  if (lowerName.includes("pro")) return ["Pro — lebih mahal, cocok untuk eskalasi kasus sulit saja"];
  return ["Stabil"];
}

function filterAndBuildCatalog(rawModels: any[], blocklist: string[]): ModelCatalogEntry[] {
  interface Internal extends ModelCatalogEntry {
    family: "flash" | "pro";
    version: number;
  }

  const entries: Internal[] = rawModels
    .filter((m) => {
      const methods: string[] = m.supportedGenerationMethods || [];
      if (!methods.includes("generateContent")) return false;
      const id = String(m.name || "").replace(/^models\//, "");
      const lower = id.toLowerCase();
      if (!lower.includes("gemini-")) return false;
      if (!(lower.includes("flash") || lower.includes("pro"))) return false;
      // "generateContent" TIDAK cukup untuk menyaring model non-teks: model gambar (Nano Banana),
      // TTS, dan omni multimodal semuanya juga memakai method generateContent yang sama. Saring
      // eksplisit berdasarkan pola nama agar hanya model teks generatif murni yang lolos.
      const NON_TEXT_PATTERNS = ["image", "tts", "audio", "omni", "live", "computer-use", "embedding"];
      if (NON_TEXT_PATTERNS.some((p) => lower.includes(p))) return false;
      if (blocklist.includes(id)) return false;
      return true;
    })
    .map((m) => {
      const id = String(m.name).replace(/^models\//, "");
      const lower = id.toLowerCase();
      return {
        id,
        displayName: m.displayName || id,
        description: m.description || "",
        badges: computeBaseBadges(lower),
        family: (lower.includes("flash") ? "flash" : "pro") as "flash" | "pro",
        version: parseVersion(lower),
      };
    });

  // Tandai model Flash stabil dengan versi tertinggi sebagai "Direkomendasikan (Terbaru)"
  const stableFlash = entries.filter((e) => e.family === "flash" && e.badges.includes("Stabil"));
  if (stableFlash.length > 0) {
    const top = stableFlash.reduce((a, b) => (b.version > a.version ? b : a));
    top.badges = [...top.badges, "Direkomendasikan (Terbaru)"];
  }

  entries.sort((a, b) => {
    if (a.family !== b.family) return a.family === "flash" ? -1 : 1;
    return b.version - a.version;
  });

  return entries.map(({ family, version, ...rest }) => rest);
}

async function fetchRawModelsFromGoogle(apiKey: string): Promise<any[]> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`, {
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.models || [];
}

async function readCache(): Promise<{ rawModels: any[]; cachedAt: string } | null> {
  const records = await db.select().from(systemSettings).where(eq(systemSettings.key, CACHE_KEY)).limit(1);
  const val = records[0]?.value as { rawModels?: any[]; cachedAt?: string } | undefined;
  if (val?.rawModels && val?.cachedAt) {
    return { rawModels: val.rawModels, cachedAt: val.cachedAt };
  }
  return null;
}

async function writeCache(rawModels: any[], cachedAt: string): Promise<void> {
  const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, CACHE_KEY)).limit(1);
  const value = { rawModels, cachedAt };
  if (existing.length > 0) {
    await db.update(systemSettings).set({ value, updatedAt: new Date() }).where(eq(systemSettings.key, CACHE_KEY));
  } else {
    await db.insert(systemSettings).values({ key: CACHE_KEY, value, updatedAt: new Date() });
  }
}

/**
 * Mengambil katalog model siap-pakai (sudah disaring, dilabeli, diurutkan).
 * @param forceRefresh Lewati cache 24 jam dan paksa panggil ulang Google (dipakai tombol "Refresh Sekarang").
 */
export async function getModelCatalog(forceRefresh = false): Promise<ModelCatalogResponse> {
  await ensureTablesCreated();
  const blocklist = await getModelBlocklist();
  const cached = await readCache();
  const cacheAgeMs = cached ? Date.now() - new Date(cached.cachedAt).getTime() : Infinity;
  const cacheFresh = !!cached && cacheAgeMs < CACHE_TTL_MS;

  if (cacheFresh && !forceRefresh) {
    return {
      models: filterAndBuildCatalog(cached!.rawModels, blocklist),
      blocklist,
      cachedAt: cached!.cachedAt,
      cacheStale: false,
      source: "cache",
      rawModelIds: cached!.rawModels.map((m: any) => String(m.name || "").replace(/^models\//, "")),
    };
  }

  const config = await getStoredAiConfig();
  if (!config.apiKey?.trim()) {
    if (cached) {
      return {
        models: filterAndBuildCatalog(cached.rawModels, blocklist),
        blocklist,
        cachedAt: cached.cachedAt,
        cacheStale: true,
        source: "cache",
        rawModelIds: cached.rawModels.map((m: any) => String(m.name || "").replace(/^models\//, "")),
      };
    }
    return { models: FALLBACK_MODELS, blocklist, cachedAt: null, cacheStale: true, source: "fallback", rawModelIds: null };
  }

  try {
    const rawModels = await fetchRawModelsFromGoogle(config.apiKey);
    const cachedAt = new Date().toISOString();
    await writeCache(rawModels, cachedAt);
    return {
      models: filterAndBuildCatalog(rawModels, blocklist),
      blocklist,
      cachedAt,
      cacheStale: false,
      source: "google",
      rawModelIds: rawModels.map((m: any) => String(m.name || "").replace(/^models\//, "")),
    };
  } catch (err: any) {
    console.error("[Model Catalog] Gagal memuat katalog model dari Google:", err.message);
    if (cached) {
      return {
        models: filterAndBuildCatalog(cached.rawModels, blocklist),
        blocklist,
        cachedAt: cached.cachedAt,
        cacheStale: true,
        source: "cache",
        rawModelIds: cached.rawModels.map((m: any) => String(m.name || "").replace(/^models\//, "")),
      };
    }
    return { models: FALLBACK_MODELS, blocklist, cachedAt: null, cacheStale: true, source: "fallback", rawModelIds: null };
  }
}
