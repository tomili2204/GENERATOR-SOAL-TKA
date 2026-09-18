import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import { questions, validationLogs, auditLogs } from "@/db/schema";
import { inArray, isNull, or, eq } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole("admin");
    await ensureTablesCreated();

    const body = await req.json().catch(() => ({}));
    const { dryRun = true } = body;

    // 1. Identifikasi soal dummy: soal tanpa paketId atau berawalan 'soal-seed' / 'soal-pembuat' / 'soal-ganda'
    const dummyQuestions = await db
      .select({
        id: questions.id,
        code: questions.code,
        status: questions.status,
        authorId: questions.authorId,
        validatorId: questions.validatorId,
      })
      .from(questions)
      .where(
        or(
          isNull(questions.paketId),
          inArray(questions.id, [
            "soal-ganda-001",
            "soal-pembuat-001",
            "soal-pembuat-002",
            "soal-pembuat-003",
          ])
        )
      );

    const dummyQuestionIds = dummyQuestions.map((q: any) => q.id);

    // 2. Identifikasi log validasi dummy:
    // Terkait soal dummy atau divalidasi oleh validator@ayotka.id (seed akun testing)
    const dummyLogs = await db
      .select({
        id: validationLogs.id,
        questionId: validationLogs.questionId,
        questionCode: validationLogs.questionCode,
        validatorEmail: validationLogs.validatorEmail,
        action: validationLogs.action,
        notes: validationLogs.notes,
      })
      .from(validationLogs)
      .where(
        or(
          dummyQuestionIds.length > 0 ? inArray(validationLogs.questionId, dummyQuestionIds) : undefined,
          eq(validationLogs.validatorEmail, "validator@ayotka.id")
        )
      );

    const dummyLogIds = dummyLogs.map((l: any) => l.id);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        summary: {
          totalDummyQuestions: dummyQuestions.length,
          totalDummyValidationLogs: dummyLogs.length,
        },
        dummyQuestions,
        dummyLogs,
      });
    }

    // Eksekusi penghapusan
    let deletedLogsCount = 0;
    let deletedQuestionsCount = 0;

    if (dummyLogIds.length > 0) {
      const resLogs = await db
        .delete(validationLogs)
        .where(inArray(validationLogs.id, dummyLogIds));
      deletedLogsCount = dummyLogIds.length;
    }

    if (dummyQuestionIds.length > 0) {
      const resQ = await db
        .delete(questions)
        .where(inArray(questions.id, dummyQuestionIds));
      deletedQuestionsCount = dummyQuestionIds.length;
    }

    // Catat log audit
    await db.insert(auditLogs).values({
      id: `audit-${crypto.randomUUID()}`,
      userId: admin.id,
      userEmail: admin.email,
      action: "CLEAN_DUMMY_DATA",
      targetResource: "questions,validation_logs",
      details: {
        deletedQuestionsCount,
        deletedLogsCount,
        dummyQuestionCodes: dummyQuestions.map((q: any) => q.code),
      },
    });

    return NextResponse.json({
      success: true,
      dryRun: false,
      message: `Berhasil membersihkan ${deletedQuestionsCount} butir soal dummy dan ${deletedLogsCount} log validasi dummy.`,
      deletedQuestions: dummyQuestions,
      deletedLogs: dummyLogs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
