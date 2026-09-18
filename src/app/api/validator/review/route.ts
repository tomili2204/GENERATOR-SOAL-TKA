import { NextRequest, NextResponse } from "next/server";
import { requireRole, assertCanValidateQuestion, handleApiError } from "@/lib/auth/guards";
import { db } from "@/db";
import { questions, auditLogs, validationLogs, QuestionStatusType } from "@/db/schema";
import { assertValidStatusTransition } from "@/lib/validations/transitions";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("validator_soal");
    const body = await req.json();
    const { questionId, decision, notes } = body;

    if (!questionId || !decision) {
      return NextResponse.json(
        { success: false, error: "questionId dan decision wajib diisi." },
        { status: 400 }
      );
    }

    // Normalisasi keputusan (dukung 'direvisi' dan 'perlu_revisi')
    const normalizedDecision: QuestionStatusType =
      decision === "perlu_revisi" ? "direvisi" : decision;

    const validDecisions = ["disetujui", "ditolak", "direvisi", "perlu_revisi"];
    if (!validDecisions.includes(decision)) {
      return NextResponse.json(
        {
          success: false,
          error: `Keputusan validasi tidak sah. Pilihan yang diizinkan: "disetujui", "ditolak", "direvisi".`,
        },
        { status: 400 }
      );
    }

    // 1. PENEGAKAN ATURAN PEMISAHAN TUGAS DI LEVEL BACKEND:
    // assertCanValidateQuestion melempar AuthError 403 jika authorId === user.id
    // dan melempar AuthError 400 jika status !== "menunggu_validasi"
    const question = await assertCanValidateQuestion(questionId, user);

    // 2. PENEGAKAN ATURAN MESIN TRANSISI STATUS EKSPLISIT:
    const transitionCheck = assertValidStatusTransition(
      question.status,
      normalizedDecision,
      notes
    );
    if (!transitionCheck.valid) {
      return NextResponse.json(
        { success: false, error: transitionCheck.error },
        { status: 400 }
      );
    }

    // 3. Lakukan pembaruan status validasi pada tabel Soal
    await db
      .update(questions)
      .set({
        status: normalizedDecision,
        validatorId: user.id,
        validationNotes: notes && notes.trim() !== "" ? notes.trim() : null,
        validatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(questions.id, questionId));

    // 4. Catat Log Validasi Append-Only (Tabel validation_logs yang tidak bisa diubah)
    const validationLogId = `vlog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await db.insert(validationLogs).values({
      id: validationLogId,
      questionId: question.id,
      questionCode: question.code,
      validatorId: user.id,
      validatorEmail: user.email,
      action: normalizedDecision,
      previousStatus: question.status,
      newStatus: normalizedDecision,
      notes: notes && notes.trim() !== "" ? notes.trim() : null,
      createdAt: new Date(),
    });

    // 5. Catat Log Audit Umum Sistem
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: `VALIDATION_${normalizedDecision.toUpperCase()}`,
      targetResource: `questions/${question.code}`,
      details: {
        validationLogId,
        questionId: question.id,
        questionCode: question.code,
        previousStatus: question.status,
        newStatus: normalizedDecision,
        notes: notes || "",
        authorId: question.authorId,
        validatorId: user.id,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Soal ${question.code} berhasil ditelaah dengan keputusan "${normalizedDecision}".`,
      data: {
        questionId,
        decision: normalizedDecision,
        validatorId: user.id,
        notes: notes || null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
