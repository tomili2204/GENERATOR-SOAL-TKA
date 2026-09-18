import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db } from "@/db";
import { questions, questionPackages, auditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/packages/fix-a02-slot30
 * One-shot repair: inserts the missing slot 30 question into A02-SMP-MAT.
 */
export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireRole("admin");

    const pkgRecords = await db
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.code, "A02-SMP-MAT"))
      .limit(1);

    if (pkgRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: "Paket A02-SMP-MAT tidak ditemukan." },
        { status: 404 }
      );
    }

    const pkg = pkgRecords[0];

    const existing = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.paketId, pkg.id), eq(questions.nomorUrut, 30)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Slot 30 di paket A02-SMP-MAT sudah ada.",
        existingId: existing[0].id,
      });
    }

    const questionId = `soal-ai-fix-a02-slot30-${Date.now()}`;
    const questionCode = "A02-SMP-MAT-30";

    await db.insert(questions).values({
      id: questionId,
      code: questionCode,
      nomorUrut: 30,
      jenjang: pkg.jenjang,
      mapel: pkg.mapel,
      elemen: "Aljabar",
      subElemen: "Barisan dan Deret",
      kompetensi: "Menganalisis barisan aritmatika dan rumus suku ke-n",
      levelKognitif: "Penalaran",
      tingkatKesulitan: "tinggi",
      bentukSoal: "PGK_KATEGORI",
      jenisSoal: "tunggal",
      stimulusId: null,
      paketId: pkg.id,
      sumber: "ai_generated",
      status: "menunggu_validasi",
      authorId: pkg.authorId,
      validatorId: null,
      validationNotes: null,
      validatedAt: null,
      payload: {
        soal_text: "Diberikan barisan bilangan aritmatika: $4, 7, 10, 13, 16, \\dots$. Tentukan apakah setiap pernyataan berikut bernilai Benar atau Salah:",
        gambar: null,
        opsi: [],
        pernyataan: [
          { no: 1, text: "Beda (selisih antarsuku) dari barisan tersebut adalah 3." },
          { no: 2, text: "Rumus suku ke-$n$ ($U_n$) barisan tersebut adalah $U_n = 3n + 1$." },
          { no: 3, text: "Nilai suku ke-20 ($U_{20}$) barisan tersebut adalah 65." }
        ],
        kategori_respons: ["Benar", "Salah"],
        kunci_jawaban: ["Benar", "Benar", "Salah"],
        pembahasan: "1. Beda $b = 7 - 4 = 3$ (Benar).\n2. $U_n = a + (n-1)b = 4 + 3(n-1) = 3n + 1$ (Benar).\n3. $U_{20} = 3(20) + 1 = 61$, bukan 65 (Salah)."
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(auditLogs).values({
      id: `audit-fix-a02-slot30-${Date.now()}`,
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: "FIX_MISSING_SLOT",
      targetResource: `questions/${questionCode}`,
      details: {
        packageCode: "A02-SMP-MAT",
        packageId: pkg.id,
        fixedSlot: 30,
        questionId,
        reason: "Slot 30 tidak tersimpan saat generasi awal",
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Slot 30 paket A02-SMP-MAT berhasil diperbaiki.",
      data: { questionId, questionCode, nomorUrut: 30, status: "menunggu_validasi" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
