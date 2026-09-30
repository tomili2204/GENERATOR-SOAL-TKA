import { NextRequest, NextResponse } from "next/server";
import { db, ensureTablesCreated } from "@/db";
import { generatorConfigs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateBatchQuestions } from "@/lib/generator/gemini-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 menit per pemanggilan fungsi serverless Vercel

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  try {
    // 1. Verifikasi CRON_SECRET jika dikonfigurasi di environment
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized cron execution." },
        { status: 401 }
      );
    }

    await ensureTablesCreated();

    // 2. Pembersihan Otomatis (Stale Lock Cleanup):
    // Tandai log batch yang menggantung di status 'berjalan' lebih dari 15 menit sebagai 'gagal'
    await db.execute(sql`
      UPDATE soal.generation_logs
      SET status = 'gagal',
          error_message = 'Eksekusi serverless terhenti melebihi batas waktu (timeout).',
          completed_at = NOW()
      WHERE status = 'berjalan'
        AND started_at < NOW() - INTERVAL '15 MINUTES';
    `);

    // 3. Ambil parameter target (opsional) dari query parameter
    const { searchParams } = new URL(req.url);
    const targetConfigId = searchParams.get("configId")?.trim();
    const targetJenjang = searchParams.get("jenjang")?.trim();
    const targetMapel = searchParams.get("mapel")?.trim();

    // 4. Cari konfigurasi generator yang aktif otomatis
    let activeConfigs = await db
      .select()
      .from(generatorConfigs)
      .where(eq(generatorConfigs.isAutoActive, true));

    if (targetConfigId) {
      activeConfigs = activeConfigs.filter((c: any) => c.id === targetConfigId);
    } else {
      if (targetJenjang) {
        activeConfigs = activeConfigs.filter(
          (c: any) => c.jenjang.toLowerCase() === targetJenjang.toLowerCase()
        );
      }
      if (targetMapel) {
        activeConfigs = activeConfigs.filter(
          (c: any) => c.mapel.toLowerCase() === targetMapel.toLowerCase()
        );
      }
    }

    if (activeConfigs.length === 0) {
      return NextResponse.json({
        success: true,
        message: targetConfigId
          ? `Konfigurasi '${targetConfigId}' tidak ditemukan atau sedang tidak aktif.`
          : "Tidak ada pipeline generator otomatis yang aktif saat ini.",
        totalProcessed: 0,
        results: [],
      });
    }

    // 5. EKSEKUSI SEKUENSIAL (BERGANTIAN SATU PER SATU):
    // Menghindari benturan concurrency Google Gemini rate-limit (RPM/TPM) dan timeout serverless Vercel
    const results = [];
    for (let i = 0; i < activeConfigs.length; i++) {
      const cfg = activeConfigs[i];
      try {
        console.log(`[Cron Generator] Memulai pembuatan sekuensial (${i + 1}/${activeConfigs.length}): ${cfg.jenjang} - ${cfg.mapel} [${cfg.id}]`);
        const res = await generateBatchQuestions({
          jenjang: cfg.jenjang,
          mapel: cfg.mapel,
          configId: cfg.id,
          totalSoal: cfg.dailyTargetQuota || 30,
          triggeredBy: "schedule",
          themeMode: "auto_multi",
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
        console.error(`[Cron Generator] Gagal pada ${cfg.jenjang} - ${cfg.mapel}:`, itemErr);
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
      message: `Berhasil menjalankan cron generator sekuensial untuk ${results.length} konfigurasi.`,
      totalProcessed: results.length,
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
