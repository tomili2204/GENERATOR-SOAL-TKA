import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { getModelCatalog } from "@/lib/generator/model-catalog";
import { getStoredAiConfig } from "@/lib/generator/gemini-generator";

export const dynamic = "force-dynamic";

// POST /api/admin/settings/ai/refresh-models - Paksa panggil ulang katalog model ke Google,
// abaikan cache 24 jam (dipicu tombol "Refresh Daftar Model Sekarang" di UI).
export async function POST() {
  try {
    await requireRole("admin");

    const catalog = await getModelCatalog(true);
    const config = await getStoredAiConfig();
    const activeModelDeprecated =
      catalog.rawModelIds !== null && catalog.rawModelIds.length > 0 && !catalog.rawModelIds.includes(config.modelName);

    return NextResponse.json({
      success: true,
      message:
        catalog.source === "google"
          ? "Katalog model berhasil diperbarui dari Google."
          : "Gagal memuat ulang dari Google, menampilkan data cache/fallback terakhir.",
      data: {
        modelCatalog: {
          models: catalog.models,
          cachedAt: catalog.cachedAt,
          cacheStale: catalog.cacheStale,
          source: catalog.source,
        },
        modelBlocklist: catalog.blocklist,
        activeModelDeprecated,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
