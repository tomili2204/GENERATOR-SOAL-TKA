import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import { systemSettings, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getStoredAiConfig } from "@/lib/generator/gemini-generator";
import { getModelCatalog, setModelBlocklist } from "@/lib/generator/model-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    await ensureTablesCreated();

    const config = await getStoredAiConfig();
    const rawKey = config.apiKey || "";
    const hasKey = rawKey.trim().length > 0;

    // Mask key demi keamanan (contoh: AIzaSy...9xK1)
    let maskedKey = "";
    if (hasKey) {
      if (rawKey.length > 10) {
        maskedKey = `${rawKey.substring(0, 6)}••••••••••••${rawKey.substring(rawKey.length - 4)}`;
      } else {
        maskedKey = "••••••••";
      }
    }

    const catalog = await getModelCatalog(false);
    const activeModelDeprecated =
      catalog.rawModelIds !== null && catalog.rawModelIds.length > 0 && !catalog.rawModelIds.includes(config.modelName);

    return NextResponse.json({
      success: true,
      data: {
        hasKey,
        apiKeyMasked: maskedKey,
        modelName: config.modelName,
        temperature: config.temperature,
        customPromptPrefix: config.customPromptPrefix || "",
        strictSvgMode: !!config.strictSvgMode,
        nanoBananaEnabled: !!config.nanoBananaEnabled,
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

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("admin");
    await ensureTablesCreated();

    const body = await req.json();
    const { apiKey, modelName, temperature, customPromptPrefix, strictSvgMode, nanoBananaEnabled, blocklist } = body;

    // Blocklist model disimpan di key systemSettings TERPISAH (gemini_model_blocklist), bukan
    // di dalam ai_gemini_config. Ditangani independen agar UI bisa menyimpan blocklist saja
    // tanpa perlu mengirim ulang seluruh field form pengaturan AI.
    if (Array.isArray(blocklist)) {
      await setModelBlocklist(blocklist);
      await db.insert(auditLogs).values({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        userEmail: user.email,
        action: "UPDATE_GEMINI_MODEL_BLOCKLIST",
        targetResource: "system_settings/gemini_model_blocklist",
        details: { blocklist },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      // Jika request HANYA berisi blocklist (tidak ada field pengaturan AI lain), cukup selesai di sini.
      if (
        apiKey === undefined &&
        modelName === undefined &&
        temperature === undefined &&
        customPromptPrefix === undefined &&
        strictSvgMode === undefined &&
        nanoBananaEnabled === undefined
      ) {
        return NextResponse.json({ success: true, message: "Daftar blokir model berhasil disimpan.", data: { blocklist } });
      }
    }

    // Ambil setting lama jika ada
    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "ai_gemini_config"))
      .limit(1);

    let currentVal: any = {};
    if (existing.length > 0) {
      currentVal = existing[0].value || {};
    }

    // Jika user menginput apiKey baru (tidak kosong dan bukan placeholder mask)
    let finalApiKey = currentVal.apiKey || "";
    if (typeof apiKey === "string" && apiKey.trim() && !apiKey.includes("•••")) {
      finalApiKey = apiKey.trim();
    }

    const newVal = {
      apiKey: finalApiKey,
      modelName: modelName || currentVal.modelName || "gemini-3-flash-preview",
      temperature: typeof temperature === "number" ? temperature : (currentVal.temperature ?? 0.7),
      customPromptPrefix: customPromptPrefix ?? currentVal.customPromptPrefix ?? "",
      strictSvgMode: typeof strictSvgMode === "boolean" ? strictSvgMode : (currentVal.strictSvgMode ?? false),
      nanoBananaEnabled: typeof nanoBananaEnabled === "boolean" ? nanoBananaEnabled : (currentVal.nanoBananaEnabled ?? false),
    };

    if (existing.length > 0) {
      await db
        .update(systemSettings)
        .set({
          value: newVal,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, "ai_gemini_config"));
    } else {
      await db.insert(systemSettings).values({
        key: "ai_gemini_config",
        value: newVal,
        updatedBy: user.id,
        updatedAt: new Date(),
      });
    }

    // Catat ke audit log
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: "UPDATE_AI_CONFIG",
      targetResource: "system_settings/ai_gemini_config",
      details: {
        modelName: newVal.modelName,
        temperature: newVal.temperature,
        apiKeyUpdated: typeof apiKey === "string" && apiKey.trim() && !apiKey.includes("•••"),
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Pengaturan API AI berhasil disimpan.",
      data: {
        hasKey: Boolean(finalApiKey),
        modelName: newVal.modelName,
        temperature: newVal.temperature,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
