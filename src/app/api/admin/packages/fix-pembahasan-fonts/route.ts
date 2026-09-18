import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db } from "@/db";
import { questions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { repairLatexString } from "@/lib/latex/latex-repair";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");

    const allQuestions = await db.select().from(questions);
    let updatedCount = 0;

    for (const q of allQuestions) {
      if (!q.payload) continue;

      let changed = false;
      const newPayload = { ...q.payload };

      if (typeof newPayload.pembahasan === "string") {
        const repaired = repairLatexString(newPayload.pembahasan);
        if (repaired !== newPayload.pembahasan) {
          newPayload.pembahasan = repaired;
          changed = true;
        }
      }

      if (typeof newPayload.soal_text === "string") {
        const repaired = repairLatexString(newPayload.soal_text);
        if (repaired !== newPayload.soal_text) {
          newPayload.soal_text = repaired;
          changed = true;
        }
      }

      if (Array.isArray(newPayload.opsi)) {
        newPayload.opsi = newPayload.opsi.map((op: any) => {
          if (typeof op?.text === "string") {
            const rep = repairLatexString(op.text);
            if (rep !== op.text) {
              changed = true;
              return { ...op, text: rep };
            }
          }
          return op;
        });
      }

      if (changed) {
        await db
          .update(questions)
          .set({
            payload: newPayload,
            updatedAt: new Date(),
          })
          .where(eq(questions.id, q.id));
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil membersihkan format font dan LaTeX pada pembahasan ${updatedCount} butir soal dari total ${allQuestions.length} butir soal.`,
      updatedCount,
      totalQuestions: allQuestions.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
