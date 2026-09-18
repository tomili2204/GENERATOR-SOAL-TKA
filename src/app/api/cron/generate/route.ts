import { NextRequest, NextResponse } from "next/server";
import { db, ensureTablesCreated } from "@/db";
import { generatorConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateBatchQuestions } from "@/lib/generator/gemini-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  try {
    // Verifikasi CRON_SECRET jika dikonfigurasi di environment
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized cron execution." },
        { status: 401 }
      );
    }

    await ensureTablesCreated();

    // Cari semua konfigurasi generator yang aktif otomatis
    const activeConfigs = await db
      .select()
      .from(generatorConfigs)
      .where(eq(generatorConfigs.isAutoActive, true));

    if (activeConfigs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada pipeline generator otomatis yang aktif saat ini.",
        totalProcessed: 0,
        results: [],
      });
    }

    const results = [];
    for (const cfg of activeConfigs) {
      try {
        const res = await generateBatchQuestions({
          jenjang: cfg.jenjang,
          mapel: cfg.mapel,
          configId: cfg.id,
          totalSoal: cfg.dailyTargetQuota || 30,
          triggeredBy: "schedule",
        });
        results.push({
          configId: cfg.id,
          jenjang: cfg.jenjang,
          mapel: cfg.mapel,
          status: res.status,
          packageCode: res.packageCode,
          totalLolos: res.totalLolos,
          totalGagal: res.totalGagal,
          error: res.errorMessage,
        });
      } catch (itemErr: any) {
        console.error(`Gagal generate cron untuk ${cfg.jenjang} - ${cfg.mapel}:`, itemErr);
        results.push({
          configId: cfg.id,
          jenjang: cfg.jenjang,
          mapel: cfg.mapel,
          status: "gagal",
          error: itemErr?.message || "Internal generation error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menjalankan cron generator untuk ${activeConfigs.length} konfigurasi.`,
      totalProcessed: activeConfigs.length,
      results,
    });
  } catch (error: any) {
    console.error("Cron generator error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
