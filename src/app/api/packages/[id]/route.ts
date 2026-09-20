import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questionPackages, questions, stimulus, users, auditLogs } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/roles";
import { eq, or, asc, inArray } from "drizzle-orm";
import { getStandard30SlotBlueprint, calculatePackageStatus } from "@/lib/validations/package-blueprint";

// GET /api/packages/[id] - Detail paket lengkap dengan 30 slot blueprint & butir soal
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const packageIdOrCode = params.id;

    // Cari paket berdasarkan id atau code
    const pkgRecords = await db
      .select()
      .from(questionPackages)
      .where(or(eq(questionPackages.id, packageIdOrCode), eq(questionPackages.code, packageIdOrCode)))
      .limit(1);

    if (pkgRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: "Paket soal tidak ditemukan." },
        { status: 404 }
      );
    }

    const pkg = pkgRecords[0];

    // Pengecekan Hak Akses:
    // 1. Admin: boleh mengakses detail semua paket
    // 2. Pembuat Paket: boleh mengakses paket buatannya
    // 3. Validator Ditugaskan: boleh mengakses paket yang ditugaskan kepadanya
    const isAuthorized =
      hasRole(user, "admin") ||
      pkg.authorId === user.id ||
      pkg.assignedValidatorId === user.id;

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: "Akses ditolak: Anda tidak memiliki penugasan atau wewenang untuk menelaah paket soal ini.",
        },
        { status: 403 }
      );
    }

    // Ambil data pembuat paket
    const authorRes = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, pkg.authorId))
      .limit(1);
    const author = authorRes[0] || null;

    // Ambil seluruh butir soal yang tergabung dalam paket ini
    const pkgQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.paketId, pkg.id))
      .orderBy(asc(questions.nomorUrut));

    // Ambil stimulus yang dipakai jika ada
    const stimulusIds = Array.from(
      new Set(pkgQuestions.map((q: any) => q.stimulusId).filter(Boolean) as string[])
    );

    const stimulusMap: Record<string, any> = {};
    if (stimulusIds.length > 0) {
      for (const sId of stimulusIds) {
        const stimRes = await db.select().from(stimulus).where(eq(stimulus.id, sId)).limit(1);
        if (stimRes[0]) {
          stimulusMap[sId] = stimRes[0];
        }
      }
    }

    // Ambil data user/pengunggah untuk setiap butir soal
    const authorIds = Array.from(
      new Set(pkgQuestions.map((q: any) => q.authorId).filter(Boolean) as string[])
    );
    const authorMap: Record<string, { id: string; name: string; email: string }> = {};
    if (authorIds.length > 0) {
      const authorList = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, authorIds));
      authorList.forEach((u: any) => {
        authorMap[u.id] = u;
      });
    }

    // Kalkulasi status terkini
    const progress = calculatePackageStatus(pkgQuestions, pkg.status);

    // Sinkronisasi status paket jika ada perubahan
    if (pkg.status !== progress.status) {
      await db
        .update(questionPackages)
        .set({ status: progress.status, updatedAt: new Date() })
        .where(eq(questionPackages.id, pkg.id));
      pkg.status = progress.status;
    }

    // Gabungkan 30 slot cetak biru dengan butir soal aktual
    const blueprintSlots = getStandard30SlotBlueprint(pkg.mapel);

    const slots = blueprintSlots.map((blueprint) => {
      const question = pkgQuestions.find((q: any) => q.nomorUrut === blueprint.nomorUrut) || null;
      const associatedStimulus = question?.stimulusId ? stimulusMap[question.stimulusId] || null : null;

      return {
        nomorUrut: blueprint.nomorUrut,
        blueprint,
        question: question
          ? {
              ...question,
              authorName: authorMap[question.authorId]?.name || null,
              authorEmail: authorMap[question.authorId]?.email || null,
              isSelfAuthored: question.authorId === user.id,
              stimulus: associatedStimulus,
            }
          : null,
        isFilled: !!question,
        status: question ? question.status : "empty",
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        package: {
          ...pkg,
          author,
        },
        currentUserId: user.id,
        isAdmin: hasRole(user, "admin"),
        progress,
        slots,
      },
    });
  } catch (error: any) {
    console.error("GET /api/packages/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat detail paket soal." },
      { status: 500 }
    );
  }
}

// PATCH /api/packages/[id] - Memperbarui nama atau publikasi paket
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const packageId = params.id;
    const body = await req.json();

    const pkgRecords = await db
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, packageId))
      .limit(1);

    if (pkgRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: "Paket soal tidak ditemukan." },
        { status: 404 }
      );
    }

    const pkg = pkgRecords[0];

    // Jika ingin mempublikasikan paket (diterbitkan)
    if (body.action === "publish" || body.status === "diterbitkan" || body.status === "siap_rilis") {
      // Validasi kelulusan 100% (30/30 butir disetujui)
      const pkgQuestions = await db
        .select({
          id: questions.id,
          nomorUrut: questions.nomorUrut,
          status: questions.status,
        })
        .from(questions)
        .where(eq(questions.paketId, pkg.id));

      const calc = calculatePackageStatus(pkgQuestions, pkg.status);

      if (calc.disetujuiCount !== 30) {
        return NextResponse.json(
          {
            success: false,
            error: `Paket belum dapat diterbitkan. Syarat penerbitan: tepat 30 butir wajib disetujui (Saat ini: ${calc.disetujuiCount}/30 disetujui).`,
          },
          { status: 400 }
        );
      }

      await db
        .update(questionPackages)
        .set({ status: "diterbitkan", updatedAt: new Date() })
        .where(eq(questionPackages.id, pkg.id));

      await db.insert(auditLogs).values({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        userEmail: user.email,
        action: "PUBLISH_PACKAGE",
        targetResource: `question_packages/${pkg.code}`,
        details: {
          packageId: pkg.id,
          code: pkg.code,
          disetujuiCount: 30,
        },
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      });

      return NextResponse.json({
        success: true,
        message: `Paket ${pkg.code} berhasil diterbitkan dan resmi tayang ke halaman siswa!`,
      });
    }

    // Update nama biasa
    if (body.nama) {
      await db
        .update(questionPackages)
        .set({ nama: body.nama.trim(), updatedAt: new Date() })
        .where(eq(questionPackages.id, pkg.id));
    }

    return NextResponse.json({
      success: true,
      message: "Data paket berhasil diperbarui.",
    });
  } catch (error: any) {
    console.error("PATCH /api/packages/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memperbarui paket soal." },
      { status: 500 }
    );
  }
}
