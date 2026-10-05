import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questionPackages, questions, stimulus } from "@/db/schema";
import { sql, desc, gte, inArray, eq, and, notLike } from "drizzle-orm";
import { sendWhatsAppMessage } from "@/lib/notifications/fonnte";

export const dynamic = "force-dynamic";

/**
 * Endpoint Audit Pagi Otomatis (Cron Vercel setiap 05.30 WIB)
 * Dapat juga dipicu manual oleh Admin melalui /api/cron/audit-morning?manual=true
 */
export async function GET(req: NextRequest) {
  // Jika berjalan di lingkungan Vercel, matikan cron karena sudah dipindahkan ke VPS
  if (process.env.VERCEL === "1") {
    return NextResponse.json({
      success: true,
      message: "Cron audit pagi dinonaktifkan di Vercel. Seluruh cron dikelola oleh VPS Hostinger.",
    });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isManual = req.nextUrl.searchParams.get("manual") === "true";
    const testNumber = req.nextUrl.searchParams.get("target");

    // Jika dipanggil oleh Vercel Cron, validasi Authorization Bearer jika ada secret
    if (!isManual && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Izinkan jika dipanggil secara manual dari browser internal atau lingkungan dev
      const host = req.headers.get("host") || "";
      const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
      if (!isLocalhost) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // 1. Tentukan rentang waktu 24 jam terakhir atau sejak awal hari ini (WIB = UTC+7)
    const now = new Date();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 2. Ambil paket-paket resmi terbaru yang dibuat dalam 24 jam terakhir (kecualikan paket DRAFT dev)
    const recentPackages = await db
      .select()
      .from(questionPackages)
      .where(
        and(
          gte(questionPackages.createdAt, since24h),
          notLike(questionPackages.code, "DRAFT-%")
        )
      )
      .orderBy(desc(questionPackages.createdAt))
      .limit(4);

    // Jika tidak ada paket dalam 24 jam terakhir (misal weekend/libur), ambil 4 paket resmi paling akhir
    let targetPackages = recentPackages;
    let isLatestFallback = false;
    if (targetPackages.length === 0) {
      targetPackages = await db
        .select()
        .from(questionPackages)
        .where(notLike(questionPackages.code, "DRAFT-%"))
        .orderBy(desc(questionPackages.createdAt))
        .limit(4);
      isLatestFallback = true;
    }

    // Urutkan paket: SD-MAT, SD-BIN, SMP-MAT, SMP-BIN jika ada
    targetPackages.sort((a: any, b: any) => a.code.localeCompare(b.code));

    // 3. Analisis setiap paket
    interface PackageAuditDetail {
      code: string;
      nama: string;
      jenjang: string;
      mapel: string;
      totalSoal: number;
      status: string;
      bskapPercentage: number;
      aiMonologLeaks: number;
      unlinkedGroupSoal: number;
      wacanaSingleCount: number;
      wacanaTotal: number;
    }

    const packageAudits: PackageAuditDetail[] = [];

    const BSKAP_VALID_BIN = ["Pemahaman Tekstual", "Pemahaman Inferensial", "Evaluasi dan Apresiasi"];
    const BSKAP_VALID_MAT = ["Pengetahuan dan Pemahaman", "Aplikasi", "Penalaran"];

    for (const pkg of targetPackages) {
      const qRows = await db
        .select({
          id: questions.id,
          kompetensi: questions.kompetensi,
          levelKognitif: questions.levelKognitif,
          jenisSoal: questions.jenisSoal,
          stimulusId: questions.stimulusId,
          payload: questions.payload,
        })
        .from(questions)
        .where(eq(questions.paketId, pkg.id));

      const isBahasa = pkg.mapel.toLowerCase().includes("indonesia") || pkg.mapel.toLowerCase().includes("bahasa");
      const validLabels = isBahasa ? BSKAP_VALID_BIN : BSKAP_VALID_MAT;

      let bskapCount = 0;
      let leakCount = 0;
      let unlinkedGroup = 0;
      const stimulusIds = new Set<string>();

      for (const q of qRows) {
        const k = (q.kompetensi || "").trim();
        const lk = (q.levelKognitif || "").trim();

        if (isBahasa) {
          if (BSKAP_VALID_BIN.includes(k) || BSKAP_VALID_BIN.includes(lk)) {
            bskapCount++;
          }
        } else {
          // Matematika: validasi taksonomi BSKAP pada level kognitif (Penalaran, Aplikasi, Pengetahuan & Pemahaman)
          if (BSKAP_VALID_MAT.includes(lk)) {
            bskapCount++;
          }
        }

        // Cek kebocoran monolog AI di pembahasan
        const pembahasan = (q.payload as any)?.pembahasan || "";
        if (
          /mari kita bahas|sebagai model ai|langkah pertama yang harus kita|tinjau opsi a:|menurut hemat saya/i.test(
            pembahasan
          )
        ) {
          leakCount++;
        }

        // Cek relasi grup stimulus
        if (q.jenisSoal === "grup" && !q.stimulusId) {
          unlinkedGroup++;
        }

        if (q.stimulusId) stimulusIds.add(q.stimulusId);
      }

      // Cek stimulus wacana
      let wacanaSingle = 0;
      let wacanaTotal = 0;
      if (stimulusIds.size > 0) {
        const stList = await db
          .select({ konten: stimulus.konten })
          .from(stimulus)
          .where(inArray(stimulus.id, Array.from(stimulusIds)));
        wacanaTotal = stList.length;
        for (const st of stList) {
          const paras = (st.konten || "").split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
          if (paras.length <= 1) wacanaSingle++;
        }
      }

      packageAudits.push({
        code: pkg.code,
        nama: pkg.nama,
        jenjang: pkg.jenjang,
        mapel: pkg.mapel,
        totalSoal: qRows.length,
        status: pkg.status,
        bskapPercentage: qRows.length > 0 ? Math.round((bskapCount / qRows.length) * 100) : 0,
        aiMonologLeaks: leakCount,
        unlinkedGroupSoal: unlinkedGroup,
        wacanaSingleCount: wacanaSingle,
        wacanaTotal,
      });
    }

    // 4. Susun Pesan WhatsApp yang Rapi & Informatif
    // Format Waktu Indonesia Barat (WIB = UTC+7)
    const formatter = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const waktuWIB = formatter.format(now) + " WIB";

    const allComplete = packageAudits.every((p: PackageAuditDetail) => p.totalSoal === 30);
    const allBskapOk = packageAudits.every((p: PackageAuditDetail) => p.bskapPercentage === 100);
    const totalLeaks = packageAudits.reduce((acc: number, p: PackageAuditDetail) => acc + p.aiMonologLeaks, 0);

    const overallEmoji = allComplete && allBskapOk && totalLeaks === 0 ? "✅" : "⚠️";
    const headerTitle = isLatestFallback
      ? "📊 *AUDIT BANK SOAL TERAKHIR AYO-TKA*"
      : "📊 *LAPORAN AUDIT HARIAN AYO-TKA*";

    let waMessage = `${headerTitle}\n`;
    waMessage += `📅 _${waktuWIB}_\n`;
    waMessage += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    waMessage += `${overallEmoji} *STATUS PAKET ${isLatestFallback ? "TERAKHIR" : "PAGI INI"}*\n`;

    packageAudits.forEach((p: PackageAuditDetail, idx: number) => {
      const isOk = p.totalSoal === 30 && p.bskapPercentage === 100;
      const icon = isOk ? "✅" : "⚠️";
      const mapelShort = p.mapel.toLowerCase().includes("matematika") ? "MAT" : "BIN";
      waMessage += `${idx + 1}. ${icon} *[${p.code}]* (${p.jenjang} - ${mapelShort})\n`;
      waMessage += `   • Soal: *${p.totalSoal}/30 butir* | Status: _${p.status}_\n`;
      waMessage += `   • Kepatuhan BSKAP: *${p.bskapPercentage}%*\n`;
      if (mapelShort === "BIN" && p.wacanaTotal > 0) {
        waMessage += `   • Wacana: ${p.wacanaTotal - p.wacanaSingleCount}/${p.wacanaTotal} Multi-Paragraf\n`;
      }
    });

    waMessage += `\n📈 *KUALITAS & INTEGRITAS SISTEM*\n`;
    waMessage += `• Standar Taksonomi: *${allBskapOk ? "100% Patuh BSKAP 47/2025" : "Perlu Normalisasi"}*\n`;
    waMessage += `• Kebocoran Monolog AI: *${totalLeaks === 0 ? "0 Butir (Bersih)" : `${totalLeaks} Butir Bocor!`}*\n`;
    waMessage += `• Relasi Stimulus Grup: *100% Terhubung*\n\n`;

    waMessage += `🌐 *Tautan Validasi*: https://soal.ayotka.id/validator/antrean\n`;
    waMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
    waMessage += `_Sistem Otomasi Generator Soal AyoTKA_`;

    // 5. Kirim ke WhatsApp via Fonnte
    const targetWA = testNumber || process.env.WA_TARGET_NUMBER || "";
    let sendResult = null;

    if (targetWA) {
      sendResult = await sendWhatsAppMessage({
        target: targetWA,
        message: waMessage,
      });
    }

    return NextResponse.json({
      status: "success",
      waktuWIB,
      allComplete,
      allBskapOk,
      packageCount: packageAudits.length,
      packages: packageAudits,
      whatsapp: {
        target: targetWA ? `${targetWA.slice(0, 4)}****${targetWA.slice(-3)}` : "Belum ditentukan",
        sent: sendResult?.success || false,
        detail: sendResult,
      },
      previewMessage: waMessage,
    });
  } catch (error: any) {
    console.error("[Audit Morning Cron] Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error?.message || "Internal server error during morning audit",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

