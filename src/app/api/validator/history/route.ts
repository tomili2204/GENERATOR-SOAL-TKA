import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db } from "@/db";
import { validationLogs, questions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("validator_soal");

    const historyItems = await db
      .select({
        id: validationLogs.id,
        questionId: validationLogs.questionId,
        questionCode: validationLogs.questionCode,
        validatorId: validationLogs.validatorId,
        validatorEmail: validationLogs.validatorEmail,
        action: validationLogs.action,
        previousStatus: validationLogs.previousStatus,
        newStatus: validationLogs.newStatus,
        notes: validationLogs.notes,
        createdAt: validationLogs.createdAt,
        jenjang: questions.jenjang,
        mapel: questions.mapel,
        elemen: questions.elemen,
        bentukSoal: questions.bentukSoal,
        sumber: questions.sumber,
      })
      .from(validationLogs)
      .leftJoin(questions, eq(validationLogs.questionId, questions.id))
      .where(eq(validationLogs.validatorId, user.id))
      .orderBy(desc(validationLogs.createdAt));

    return NextResponse.json({
      success: true,
      data: historyItems,
      total: historyItems.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
