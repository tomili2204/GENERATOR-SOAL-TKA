import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questionPackages, questions, auditLogs } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { eq, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST /api/admin/packages/[id]/bypass-validation
// Fitur Khusus Super Admin: Menyetujui langsung semua butir soal dalam paket,
// memindahkan paket ke status 'siap_rilis', dengan tetap memperbolehkan
// validator meninjau atau mengubah keputusannya di kemudian hari jika diperlukan.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // HANYA SUPER ADMIN yang diizinkan membypass validasi
    if (!hasRole(user, "admin")) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak: Hanya akun Super Admin yang memiliki wewenang untuk membypass validasi paket.",
        },
        { status: 403 }
      );
    }

    const packageIdOrCode = params.id;

    // Cari paket
    const pkgRecords = await db
      .select()
      .from(questionPackages)
      .where(or(eq(questionPackages.id, packageIdOrCode), eq(questionPackages.code, packageIdOrCode)))
      .limit(1);

    if (pkgRecords.length === 0) {
      return NextResponse.json({ success: false, error: "Paket soal tidak ditemukan." }, { status: 404 });
    }

    const pkg = pkgRecords[0];

    // Ambil semua soal dalam paket ini
    const pkgQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.paketId, pkg.id));

    if (pkgQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: "Paket belum memiliki butir soal yang diisi." },
        { status: 400 }
      );
    }

    const now = new Date();

    // 1. Perbarui semua butir soal menjadi disetujui
    await db
      .update(questions)
      .set({
        status: "disetujui",
        validatedAt: now,
        validatorId: pkg.assignedValidatorId || user.id,
        validationNotes: "Disetujui otomatis melalui Bypass Validasi (Super Admin).",
        updatedAt: now,
      })
      .where(eq(questions.paketId, pkg.id));

    // 2. Perbarui status paket menjadi siap_rilis
    await db
      .update(questionPackages)
      .set({
        status: "siap_rilis",
        updatedAt: now,
      })
      .where(eq(questionPackages.id, pkg.id));

    // 3. Catat audit log resmi
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: "BYPASS_VALIDATION",
      targetResource: `question_packages/${pkg.code}`,
      details: {
        packageId: pkg.id,
        packageCode: pkg.code,
        adminName: user.name,
        adminEmail: user.email,
        totalQuestionsApproved: pkgQuestions.length,
        timestamp: now.toISOString(),
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Bypass validasi berhasil! Seluruh ${pkgQuestions.length} butir soal pada paket ${pkg.code} disetujui dan paket kini berstatus Siap Rilis.`,
      data: {
        packageId: pkg.id,
        packageCode: pkg.code,
        approvedCount: pkgQuestions.length,
        status: "siap_rilis",
      },
    });
  } catch (error: any) {
    console.error("POST /api/admin/packages/[id]/bypass-validation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal melakukan bypass validasi." },
      { status: 500 }
    );
  }
}
