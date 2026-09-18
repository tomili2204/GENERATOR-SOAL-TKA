import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questions, auditLogs, stimulus, users } from "@/db/schema";
import { requireRole, handleApiError, assertCanEditQuestion, hasRole } from "@/lib/auth/guards";
import { validateQuestionData } from "@/lib/validations/question";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface Params {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireRole("pembuat_soal", "validator_soal", "admin");
    const questionRecords = await db.select().from(questions).where(eq(questions.id, params.id)).limit(1);

    if (questionRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: `Soal dengan ID "${params.id}" tidak ditemukan.` },
        { status: 404 }
      );
    }

    const question = questionRecords[0];

    // Pembuat soal hanya bisa melihat miliknya sendiri (kecuali admin/validator)
    if (hasRole(user, "pembuat_soal") && !hasRole(user, "admin") && !hasRole(user, "validator_soal")) {
      if (question.authorId !== user.id) {
        return NextResponse.json(
          { success: false, error: "Akses ditolak: Anda hanya dapat mengakses soal milik Anda sendiri." },
          { status: 403 }
        );
      }
    }

    let stimulusData = null;
    if (question.stimulusId) {
      const stim = await db.select().from(stimulus).where(eq(stimulus.id, question.stimulusId)).limit(1);
      if (stim.length > 0) stimulusData = stim[0];
    }

    let authorData = null;
    if (question.authorId) {
      const authorRes = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, question.authorId))
        .limit(1);
      if (authorRes.length > 0) authorData = authorRes[0];
    }

    return NextResponse.json({
      success: true,
      data: {
        ...question,
        authorName: authorData?.name || null,
        authorEmail: authorData?.email || null,
        stimulus: stimulusData,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireRole("pembuat_soal", "admin");

    // 1. Guard Otorisasi & Status Edit:
    // HANYA boleh jika authorId == user.id dan status adalah "draft" atau "direvisi"
    const existingQuestion = await assertCanEditQuestion(params.id, user);

    const body = await req.json();

    // 2. Validasi Data
    const validation = validateQuestionData(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Validasi data soal gagal.",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // 3. Validasi Keberadaan Stimulus Jika Grup
    if (body.jenis_soal === "grup" && body.stimulus_id) {
      const stim = await db.select().from(stimulus).where(eq(stimulus.id, body.stimulus_id)).limit(1);
      if (stim.length === 0) {
        return NextResponse.json(
          { success: false, error: `Stimulus dengan ID "${body.stimulus_id}" tidak ditemukan.` },
          { status: 400 }
        );
      }
    }

    const payload = {
      soal_text: body.soal_text,
      gambar: body.gambar || null,
      opsi: body.opsi || [],
      pernyataan: body.pernyataan || [],
      kategori_respons: body.kategori_respons || [],
      kunci_jawaban: body.kunci_jawaban || [],
      pembahasan: body.pembahasan,
    };

    // 4. Update dan kunci otomatis status ke "menunggu_validasi" untuk ditelaah ulang
    await db
      .update(questions)
      .set({
        jenjang: body.jenjang,
        mapel: body.mapel,
        elemen: body.elemen,
        subElemen: body.sub_elemen || null,
        kompetensi: body.kompetensi,
        levelKognitif: body.level_kognitif,
        tingkatKesulitan: body.tingkat_kesulitan,
        bentukSoal: body.bentuk_soal,
        jenisSoal: body.jenis_soal,
        stimulusId: body.jenis_soal === "grup" ? body.stimulus_id : null,
        status: "menunggu_validasi", // Otomatis diajukan ulang ke antrean telaah
        payload,
        temaKonteks: body.tema_konteks !== undefined ? (body.tema_konteks?.trim() || null) : existingQuestion.temaKonteks,
        updatedAt: new Date(),
      })
      .where(eq(questions.id, params.id));

    // 5. Audit Log
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: "UPDATE_QUESTION_MANUAL",
      targetResource: `questions/${existingQuestion.code}`,
      details: {
        id: params.id,
        statusLama: existingQuestion.status,
        statusBaru: "menunggu_validasi",
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Perubahan soal berhasil disimpan dan dialirkan kembali ke antrean telaah.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
