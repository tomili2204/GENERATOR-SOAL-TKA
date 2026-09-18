import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db } from "@/db";
import { generatorConfigs, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    const configs = await db.select().from(generatorConfigs);
    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // BACKEND GUARD: Hanya Admin yang dapat mengubah konfigurasi generator otomatis
    const user = await requireRole("admin");

    const body = await req.json();
    const { id, isAutoActive, dailyTargetQuota } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID generator config wajib disertakan." },
        { status: 400 }
      );
    }

    const existing = await db.select().from(generatorConfigs).where(eq(generatorConfigs.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Konfigurasi generator tidak ditemukan." },
        { status: 404 }
      );
    }

    await db
      .update(generatorConfigs)
      .set({
        isAutoActive: isAutoActive ?? existing[0].isAutoActive,
        dailyTargetQuota: dailyTargetQuota ?? existing[0].dailyTargetQuota,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(generatorConfigs.id, id));

    // Audit log
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: "TOGGLE_GENERATOR_CONFIG",
      targetResource: `generator_configs/${id}`,
      details: {
        jenjang: existing[0].jenjang,
        mapel: existing[0].mapel,
        previousState: existing[0].isAutoActive,
        newState: isAutoActive,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Konfigurasi generator ${existing[0].jenjang} ${existing[0].mapel} berhasil diperbarui.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
