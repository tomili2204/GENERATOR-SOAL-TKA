import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questionPackages, questions, auditLogs } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/roles";
import { eq } from "drizzle-orm";
import { formatPembahasanWithAi } from "@/lib/generator/pembahasan-formatter";

export const dynamic = "force-dynamic";

// POST /api/packages/[id]/beautify-pembahasan
// Merapikan seluruh pembahasan butir soal dalam satu paket sekaligus
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(user, ["admin", "pembuat_soal", "validator_soal"])) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const packageId = params.id;
    const pkgRecords = await db
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, packageId))
      .limit(1);

    if (pkgRecords.length === 0) {
      return NextResponse.json({ success: false, error: "Paket tidak ditemukan." }, { status: 404 });
    }

    const pkg = pkgRecords[0];

    const pkgQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.paketId, pkg.id));

    let updatedCount = 0;

    for (const q of pkgQuestions) {
      const payload: any = q.payload || {};
      const oldPembahasan = payload.pembahasan || "";

      if (oldPembahasan.trim().length > 0) {
        const formatted = await formatPembahasanWithAi({
          pembahasan: oldPembahasan,
          soalText: payload.soal_text,
          bentukSoal: q.bentukSoal,
          kunciJawaban: payload.kunci_jawaban,
          opsi: payload.opsi,
          pernyataan: payload.pernyataan,
        });

        if (formatted && formatted !== oldPembahasan) {
          const updatedPayload = { ...payload, pembahasan: formatted };
          await db
            .update(questions)
            .set({ payload: updatedPayload, updatedAt: new Date() })
            .where(eq(questions.id, q.id));
          updatedCount++;
        }
      }
    }

    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: "BEAUTIFY_PEMBAHASAN_PACKAGE",
      targetResource: `question_packages/${pkg.code}`,
      details: {
        packageId: pkg.id,
        packageCode: pkg.code,
        updatedCount,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil merapikan pembahasan untuk ${updatedCount} butir soal pada paket ${pkg.code}.`,
      data: { updatedCount },
    });
  } catch (error: any) {
    console.error("POST /api/packages/[id]/beautify-pembahasan error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal merapikan pembahasan paket." },
      { status: 500 }
    );
  }
}
