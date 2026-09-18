import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // BACKEND GUARD: Hanya akun dengan peran 'pembuat_soal'
    const user = await requireRole("pembuat_soal");

    // Hanya mengambil soal milik user yang sedang aktif
    const userQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.authorId, user.id))
      .orderBy(desc(questions.createdAt));

    return NextResponse.json({
      success: true,
      data: userQuestions,
      total: userQuestions.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
