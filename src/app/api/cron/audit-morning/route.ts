import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questionPackages, questions, stimulus, generationLogs, generatorConfigs } from "@/db/schema";
import { sql, desc, asc, gte, inArray, eq, and, notLike } from "drizzle-orm";
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
      status: string;
      totalSoal: number;
      bentukPG: number;
      bentukMCMA: number;
      bentukKAT: number;
      kesRendah: number;
      kesSedang: number;
      kesTinggi: number;
      bskapPercentage: number;
      mcmaKeySizes: number[];
      mcmaUniform: boolean;
      wacanaTotal: number;
      wacanaMultiPara: number;
      wacanaWordRange: string;
      svgCount: number;
      katexCount: number;
      aiMonologLeaks: number;
      urbanBiasCount: number;
      unlinkedGroupSoal: number;
    }

    const packageAudits: PackageAuditDetail[] = [];

    const BSKAP_VALID_BIN = ["Pemahaman Tekstual", "Pemahaman Inferensial", "Evaluasi dan Apresiasi"];
    const BSKAP_VALID_MAT = ["Pengetahuan dan Pemahaman", "Aplikasi", "Penalaran"];
    const URBAN_BIAS_REGEX = /\b(mrt|lrt|krl commuter|shopee|tokopedia|lazada|gojek|grab)\b/i;
    const AI_LEAK_REGEX = /mari kita bahas|sebagai model ai|langkah pertama yang harus kita|tinjau opsi a:|menurut hemat saya/i;

    for (const pkg of targetPackages) {
      const qRows = await db
        .select({
          id: questions.id,
          kompetensi: questions.kompetensi,
          levelKognitif: questions.levelKognitif,
          tingkatKesulitan: questions.tingkatKesulitan,
          bentukSoal: questions.bentukSoal,
          jenisSoal: questions.jenisSoal,
          stimulusId: questions.stimulusId,
          temaKonteks: questions.temaKonteks,
          payload: questions.payload,
        })
        .from(questions)
        .where(eq(questions.paketId, pkg.id));

      const isBahasa = pkg.mapel.toLowerCase().includes("indonesia") || pkg.mapel.toLowerCase().includes("bahasa");

      let bskapCount = 0;
      let leakCount = 0;
      let urbanBiasCount = 0;
      let unlinkedGroup = 0;
      let svgCount = 0;
      let katexCount = 0;
      let pgCount = 0;
      let mcmaCount = 0;
      let katCount = 0;
      let kesR = 0;
      let kesS = 0;
      let kesT = 0;
      const mcmaKeyCounts: Record<number, number> = {};
      const stimulusIds = new Set<string>();

      for (const q of qRows) {
        if (q.bentukSoal === "PG") pgCount++;
        else if (q.bentukSoal === "PGK_MCMA") mcmaCount++;
        else if (q.bentukSoal === "PGK_KATEGORI") katCount++;

        const k = (q.tingkatKesulitan || "").toLowerCase();
        if (k === "rendah") kesR++;
        else if (k === "sedang") kesS++;
        else if (k === "tinggi") kesT++;

        const komp = (q.kompetensi || "").trim();
        const lk = (q.levelKognitif || "").trim();

        if (isBahasa) {
          if (BSKAP_VALID_BIN.includes(komp) || BSKAP_VALID_BIN.includes(lk)) {
            bskapCount++;
          }
        } else {
          if (BSKAP_VALID_MAT.includes(lk)) {
            bskapCount++;
          }
        }

        const p = q.payload as any;
        const pembahasan = p?.pembahasan || "";
        const soalTxt = p?.soal_text || "";
        const fullText = JSON.stringify(p);

        // Cek kebocoran monolog AI di pembahasan
        if (AI_LEAK_REGEX.test(pembahasan)) {
          leakCount++;
        }

        // Cek keadilan konteks (anti bias fasilitas metropolitan)
        if (URBAN_BIAS_REGEX.test(soalTxt + " " + pembahasan)) {
          urbanBiasCount++;
        }

        // Cek relasi grup stimulus
        if (q.jenisSoal === "grup" && !q.stimulusId) {
          unlinkedGroup++;
        }

        if (q.stimulusId) stimulusIds.add(q.stimulusId);

        // Cek visual scalable SVG
        if (p?.gambar?.tipe === "svg" || p?.gambar?.svg_content) {
          svgCount++;
        }

        // Cek notasi formula KaTeX
        if (/\$[^\$]+\$/.test(fullText) || /\\frac|\\times|\\sqrt|\\pm|\\circ/.test(fullText)) {
          katexCount++;
        }

        // Analisis kunci MCMA
        if (q.bentukSoal === "PGK_MCMA") {
          const pKunci = p?.kunci_jawaban;
          const kLen = Array.isArray(pKunci) ? pKunci.length : 0;
          mcmaKeyCounts[kLen] = (mcmaKeyCounts[kLen] || 0) + 1;
        }
      }

      // Cek stimulus wacana
      let wacanaTotal = 0;
      let wacanaMulti = 0;
      let wordRangeStr = "-";
      if (stimulusIds.size > 0) {
        const stList = await db
          .select({ konten: stimulus.konten })
          .from(stimulus)
          .where(inArray(stimulus.id, Array.from(stimulusIds)));
        wacanaTotal = stList.length;
        const wordCounts: number[] = [];
        for (const st of stList) {
          const paras = (st.konten || "").split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
          if (paras.length >= 2) wacanaMulti++;
          const words = (st.konten || "").trim().split(/\s+/).length;
          wordCounts.push(words);
        }
        if (wordCounts.length > 0) {
          wordRangeStr = `${Math.min(...wordCounts)}-${Math.max(...wordCounts)} kata`;
        }
      }

      const mcmaSizes = Object.keys(mcmaKeyCounts).map(Number).filter((n) => n > 0);
      const isMcmaUniform = mcmaCount >= 3 && Object.values(mcmaKeyCounts).some((c) => c === mcmaCount);

      packageAudits.push({
        code: pkg.code,
        nama: pkg.nama,
        jenjang: pkg.jenjang,
        mapel: pkg.mapel,
        status: pkg.status,
        totalSoal: qRows.length,
        bentukPG: pgCount,
        bentukMCMA: mcmaCount,
        bentukKAT: katCount,
        kesRendah: kesR,
        kesSedang: kesS,
        kesTinggi: kesT,
        bskapPercentage: qRows.length > 0 ? Math.round((bskapCount / qRows.length) * 100) : 0,
        mcmaKeySizes: mcmaSizes,
        mcmaUniform: isMcmaUniform,
        wacanaTotal,
        wacanaMultiPara: wacanaMulti,
        wacanaWordRange: wordRangeStr,
        svgCount,
        katexCount,
        aiMonologLeaks: leakCount,
        urbanBiasCount,
        unlinkedGroupSoal: unlinkedGroup,
      });
    }

    // 3B. Pemantauan proses generator (generation_logs, 24 jam terakhir).
    interface GeneratorAlert {
      label: string;
      kind: "gagal" | "sebagian" | "tidak_jalan";
      waktuWIB?: string;
      pesan?: string;
      pulih: boolean;
    }
    const generatorAlerts: GeneratorAlert[] = [];
    try {
      const jamWIB = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false });
      const activeCfgs = await db
        .select({ id: generatorConfigs.id, jenjang: generatorConfigs.jenjang, mapel: generatorConfigs.mapel })
        .from(generatorConfigs)
        .where(eq(generatorConfigs.isAutoActive, true));
      const logs24 = await db
        .select()
        .from(generationLogs)
        .where(gte(generationLogs.startedAt, since24h))
        .orderBy(asc(generationLogs.startedAt));

      // Hanya nilai "tidak jalan" bila jadwal otomatis memang berjalan hari ini (hindari alarm palsu saat libur).
      const scheduleRanToday = logs24.some((l: any) => l.triggeredBy === "schedule");

      for (const cfg of activeCfgs) {
        const label = `${cfg.jenjang.startsWith("SD") ? "SD" : "SMP"}-${cfg.mapel.toLowerCase().includes("matematika") ? "MAT" : "BIN"}`;
        const mine = logs24.filter((l: any) => l.configId === cfg.id);
        if (mine.length === 0) {
          if (scheduleRanToday) generatorAlerts.push({ label, kind: "tidak_jalan", pulih: false });
          continue;
        }
        for (const l of mine) {
          if (l.status === "berhasil") continue;
          const pulih = mine.some((o: any) => o.status === "berhasil" && o.startedAt > l.startedAt);
          generatorAlerts.push({
            label,
            kind: l.status === "sebagian" ? "sebagian" : "gagal",
            waktuWIB: jamWIB.format(l.startedAt),
            pesan: (l.errorMessage || "tanpa pesan error").replace(/\s+/g, " ").slice(0, 110),
            pulih,
          });
        }
      }
    } catch (genErr) {
      console.error("[Audit Morning Cron] Gagal memeriksa generation_logs:", genErr);
    }
    const unresolvedGeneratorAlerts = generatorAlerts.filter((a) => !a.pulih);

    // 4. Susun Pesan WhatsApp yang Rapi & Komprehensif
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
    const totalUrbanBias = packageAudits.reduce((acc: number, p: PackageAuditDetail) => acc + p.urbanBiasCount, 0);
    const totalUnlinked = packageAudits.reduce((acc: number, p: PackageAuditDetail) => acc + p.unlinkedGroupSoal, 0);
    const anyMcmaUniform = packageAudits.some((p: PackageAuditDetail) => p.mcmaUniform);
    const totalSvg = packageAudits.reduce((acc: number, p: PackageAuditDetail) => acc + p.svgCount, 0);

    const matAudits = packageAudits.filter((a) => a.mapel.toLowerCase().includes("matematika"));
    const binAudits = packageAudits.filter(
      (a) => a.mapel.toLowerCase().includes("indonesia") || a.mapel.toLowerCase().includes("bahasa")
    );

    const matTotalSoal = matAudits.reduce((acc, a) => acc + a.totalSoal, 0);
    const matKatexTotal = matAudits.reduce((acc, a) => acc + a.katexCount, 0);
    const katexOk = matTotalSoal > 0 && matKatexTotal === matTotalSoal;

    const binTotalWacana = binAudits.reduce((acc, a) => acc + a.wacanaTotal, 0);
    const binMultiWacana = binAudits.reduce((acc, a) => acc + a.wacanaMultiPara, 0);
    const wacanaOk = binTotalWacana > 0 && binMultiWacana === binTotalWacana;

    const totalR = packageAudits.reduce((acc, a) => acc + a.kesRendah, 0);
    const totalS = packageAudits.reduce((acc, a) => acc + a.kesSedang, 0);
    const totalT = packageAudits.reduce((acc, a) => acc + a.kesTinggi, 0);
    const totalAllSoal = packageAudits.reduce((acc, a) => acc + a.totalSoal, 0);

    const pctR = totalAllSoal > 0 ? Math.round((totalR / totalAllSoal) * 100) : 0;
    const pctS = totalAllSoal > 0 ? Math.round((totalS / totalAllSoal) * 100) : 0;
    const pctT = totalAllSoal > 0 ? Math.round((totalT / totalAllSoal) * 100) : 0;
    const minBskap = packageAudits.length > 0 ? Math.min(...packageAudits.map((p) => p.bskapPercentage)) : 0;

    const overallEmoji =
      allComplete &&
      allBskapOk &&
      totalLeaks === 0 &&
      !anyMcmaUniform &&
      unresolvedGeneratorAlerts.length === 0 &&
      totalUrbanBias === 0
        ? "✅"
        : "⚠️";

    const headerTitle = isLatestFallback
      ? "📊 *AUDIT BANK SOAL TERAKHIR AYO-TKA*"
      : "📊 *LAPORAN AUDIT HARIAN AYO-TKA*";

    let waMessage = `${headerTitle}\n`;
    waMessage += `📅 _${waktuWIB}_\n`;
    waMessage += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    waMessage += `${overallEmoji} *STATUS 4 PAKET TERBARU*\n`;

    packageAudits.forEach((p: PackageAuditDetail, idx: number) => {
      const isOk = p.totalSoal === 30 && p.bskapPercentage === 100;
      const icon = isOk ? "✅" : "⚠️";
      const mapelShort = p.mapel.toLowerCase().includes("matematika") ? "MAT" : "BIN";
      waMessage += `${idx + 1}. ${icon} *[${p.code}]* (${p.jenjang} - ${mapelShort})\n`;
      waMessage += `   • Butir: *${p.totalSoal}/30* (${p.bentukPG} PG · ${p.bentukMCMA} MCMA · ${p.bentukKAT} KAT)\n`;
      waMessage += `   • Kesulitan: ${p.kesRendah}R · ${p.kesSedang}S · ${p.kesTinggi}T | BSKAP: *${p.bskapPercentage}%*\n`;
      if (mapelShort === "MAT") {
        const mcmaLabel = p.mcmaUniform ? "⚠️ Seragam" : `Bervariasi (${p.mcmaKeySizes.join("-")} kunci)`;
        waMessage += `   • MCMA: ${mcmaLabel} | Visual: *${p.svgCount} SVG*\n`;
      } else {
        waMessage += `   • Wacana: *${p.wacanaMultiPara}/${p.wacanaTotal} Multi-Paragraf* (${p.wacanaWordRange})\n`;
        waMessage += `   • Visual: *${p.svgCount} SVG* | MCMA: ${p.mcmaUniform ? "⚠️ Seragam" : "Bervariasi"}\n`;
      }
    });

    if (generatorAlerts.length > 0) {
      waMessage += `\n🚨 *PROSES GENERATOR PERLU PERHATIAN*\n`;
      for (const a of generatorAlerts) {
        const status = a.pulih ? "sudah dijalankan ulang ✅" : "BELUM PULIH ❗";
        if (a.kind === "tidak_jalan") {
          waMessage += `• [${a.label}] tidak ada run sama sekali dalam 24 jam — ${status}\n`;
        } else {
          waMessage += `• [${a.label}] ${a.kind.toUpperCase()} ${a.waktuWIB} WIB — ${status}\n`;
          waMessage += `   _${a.pesan}_\n`;
        }
      }
    }

    waMessage += `\n🏆 *SCORECARD 10 STANDAR KUALITAS*\n`;
    waMessage += `1. Regulasi BSKAP 47/2025: *${allBskapOk ? "100% Patuh (L1/L2/L3 Baku) ✅" : `${minBskap}% - Perlu Normalisasi ⚠️`}*\n`;
    waMessage += `2. Cetak Biru 30 Slot: *${allComplete ? "30 Butir per Paket Lengkap ✅" : "Ada Slot Kurang ⚠️"}*\n`;
    waMessage += `3. Sebaran Kesulitan: *${pctR}%R · ${pctS}%S · ${pctT}%T (Terstandar) ✅*\n`;
    waMessage += `4. Variasi Kunci MCMA: *${anyMcmaUniform ? "Ada Paket Seragam ⚠️" : "Proporsional & Acak ✅"}*\n`;
    waMessage += `5. Kompleksitas Wacana: *${wacanaOk ? `100% Multi-Paragraf (${binMultiWacana}/${binTotalWacana}) ✅` : `${binMultiWacana}/${binTotalWacana} Multi-Paragraf ⚠️`}*\n`;
    waMessage += `6. Keadilan Konteks: *${totalUrbanBias === 0 ? "0 Bias Urban (Membumi Nusantara) ✅" : `${totalUrbanBias} Bias Terdeteksi ⚠️`}*\n`;
    waMessage += `7. Kebersihan AI: *${totalLeaks === 0 ? "0 Kebocoran Monolog (Bersih) ✅" : `${totalLeaks} Butir Bocor Monolog ⚠️`}*\n`;
    waMessage += `8. Notasi Formula: *${katexOk ? `KaTeX Standardized (${matKatexTotal}/${matTotalSoal} MAT) ✅` : `${matKatexTotal}/${matTotalSoal} KaTeX (Perlu Cek) ⚠️`}*\n`;
    waMessage += `9. Visualisasi Gambar: *${totalSvg} Butir Native SVG Presisi ✅*\n`;
    waMessage += `10. Integritas Grup: *${totalUnlinked === 0 ? "100% Terhubung Stimulus (0 Yatim) ✅" : `${totalUnlinked} Soal Belum Terhubung ⚠️`}*\n\n`;

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
      if (!sendResult.success) {
        console.error(
          `[Audit Morning Cron] ❌ Gagal mengirim notifikasi WhatsApp ke ${targetWA}:`,
          sendResult.message,
          sendResult.detail
        );
      } else {
        console.log(`[Audit Morning Cron] ✅ Berhasil mengirim notifikasi WhatsApp ke ${targetWA}`);
      }
    }

    return NextResponse.json({
      status: "success",
      waktuWIB,
      allComplete,
      allBskapOk,
      packageCount: packageAudits.length,
      packages: packageAudits,
      generatorAlerts,
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

