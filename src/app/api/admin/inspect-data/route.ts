import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import {
  questions,
  questionPackages,
  validationLogs,
  honorariumRecords,
  users,
} from "@/db/schema";
import { count, eq, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    await ensureTablesCreated();

    const allPkgs: any[] = await db.select().from(questionPackages);
    const allQ: any[] = await db.select().from(questions);
    const allLogs: any[] = await db.select().from(validationLogs);
    const allHr: any[] = await db.select().from(honorariumRecords);
    const allUsers: any[] = await db.select({ id: users.id, name: users.name, email: users.email, instansi: users.instansi }).from(users);

    const usersWithActivity = allUsers.map((u: any) => {
      const qAuthored = allQ.filter((q) => q.authorId === u.id).length;
      const qValidated = allQ.filter((q) => q.validatorId === u.id).length;
      const pkgAssigned = allPkgs.filter((p) => p.assignedValidatorId === u.id).length;
      const valLogs = allLogs.filter((l) => l.validatorId === u.id).length;
      return {
        ...u,
        qAuthored,
        qValidated,
        pkgAssigned,
        valLogs,
        hasActivity: qAuthored > 0 || qValidated > 0 || pkgAssigned > 0 || valLogs > 0,
      };
    });

    // Filter questions without package (orphaned / dummy seed)
    const questionsWithoutPkg = allQ.filter((q) => !q.paketId);
    
    // Check dummy questions by ID pattern or code pattern (e.g. soal-ganda-001, soal-pembuat-001, etc.)
    const seedDummyQuestions = allQ.filter((q) =>
      q.id.startsWith("soal-") ||
      q.code.startsWith("TKA-SD-MAT-001") ||
      q.code.startsWith("TKA-SD-MAT-002") ||
      q.code.startsWith("TKA-SMP-BIN-001") ||
      q.code.startsWith("TKA-SD-BIN-001")
    );

    // Packages summary
    const pkgsSummary = allPkgs.map((p: any) => {
      const qInPkg = allQ.filter((q) => q.paketId === p.id);
      const valLogs = allLogs.filter((l) => qInPkg.some((q) => q.id === l.questionId));
      return {
        id: p.id,
        code: p.code,
        nama: p.nama,
        jenjang: p.jenjang,
        mapel: p.mapel,
        status: p.status,
        tipeSumber: p.tipeSumber,
        assignedValidatorId: p.assignedValidatorId,
        soalCount: qInPkg.length,
        validationLogsCount: valLogs.length,
        statusBreakdown: {
          draft: qInPkg.filter((q) => q.status === "draft").length,
          menunggu_validasi: qInPkg.filter((q) => q.status === "menunggu_validasi").length,
          disetujui: qInPkg.filter((q) => q.status === "disetujui").length,
          perlu_revisi: qInPkg.filter((q) => q.status === "perlu_revisi").length,
          direvisi: qInPkg.filter((q) => q.status === "direvisi").length,
          ditolak: qInPkg.filter((q) => q.status === "ditolak").length,
        },
      };
    });

    // Validation logs summary
    const logsSummary = {
      totalLogs: allLogs.length,
      actions: allLogs.reduce((acc: any, l: any) => {
        acc[l.action] = (acc[l.action] || 0) + 1;
        return acc;
      }, {}),
      validators: allLogs.reduce((acc: any, l: any) => {
        acc[l.validatorEmail] = (acc[l.validatorEmail] || 0) + 1;
        return acc;
      }, {}),
      details: allLogs.map((l: any) => ({
        id: l.id,
        questionId: l.questionId,
        questionCode: l.questionCode,
        validatorEmail: l.validatorEmail,
        action: l.action,
        previousStatus: l.previousStatus,
        newStatus: l.newStatus,
        notes: l.notes,
        createdAt: l.createdAt,
      })),
    };

    // Honorarium records summary
    const hrSummary = allHr.map((h: any) => ({
      id: h.id,
      userId: h.userId,
      jenisTugas: h.jenisTugas,
      periode: h.periode,
      totalSoal: h.totalSoal,
      totalPaket: h.totalPaket,
      tarifPerItem: h.tarifPerItem,
      totalNominal: h.totalNominal,
      statusBayar: h.statusBayar,
      catatanBayar: h.catatanBayar,
      createdAt: h.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: usersWithActivity,
        totalUsers: allUsers.length,
        totalPackages: allPkgs.length,
        totalQuestions: allQ.length,
        totalValidationLogs: allLogs.length,
        totalHonorariumRecords: allHr.length,
        questionsWithoutPackage: questionsWithoutPkg.map((q: any) => ({
          id: q.id,
          code: q.code,
          jenjang: q.jenjang,
          mapel: q.mapel,
          status: q.status,
          authorId: q.authorId,
          validatorId: q.validatorId,
        })),
        seedDummyQuestions: seedDummyQuestions.map((q: any) => ({
          id: q.id,
          code: q.code,
          status: q.status,
          paketId: q.paketId,
        })),
        packages: pkgsSummary,
        validationLogs: logsSummary,
        honorariumRecords: hrSummary,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
