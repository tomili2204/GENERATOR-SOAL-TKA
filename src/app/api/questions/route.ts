import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questions, auditLogs, stimulus } from "@/db/schema";
import { requireRole, handleApiError, hasRole } from "@/lib/auth/guards";
import { validateQuestionData } from "@/lib/validations/question";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("pembuat_soal", "validator_soal", "admin");
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // Aturan RBAC: Pembuat Soal hanya bisa melihat soal miliknya sendiri
    const isOnlyPembuat = hasRole(user, "pembuat_soal") && !hasRole(user, "admin");

    const conditions = [];
    if (isOnlyPembuat) {
      conditions.push(eq(questions.authorId, user.id));
    }
    if (status) {
      conditions.push(eq(questions.status, status as any));
    }

    let items;
    if (conditions.length > 0) {
      items = await db
        .select()
        .from(questions)
        .where(and(...conditions))
        .orderBy(desc(questions.createdAt));
    } else {
      items = await db.select().from(questions).orderBy(desc(questions.createdAt));
    }

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("pembuat_soal", "admin");
    const body = await req.json();

    // 1. Eksekusi Validasi Komprehensif Backend
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

    // 2. Validasi Keberadaan Stimulus Jika Jenis Soal Grup
    if (body.jenis_soal === "grup" && body.stimulus_id) {
      const stim = await db.select().from(stimulus).where(eq(stimulus.id, body.stimulus_id)).limit(1);
      if (stim.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Stimulus dengan ID "${body.stimulus_id}" tidak ditemukan di database.`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Generate Kode Unik Soal
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const jenjangCode = body.jenjang.split("/")[0].replace(/[^a-zA-Z0-9]/g, "");
    const mapelCode = body.mapel.toLowerCase().includes("matematika") ? "MAT" : "BIN";
    const generatedCode = `TKA-${jenjangCode}-${mapelCode}-${Date.now().toString().slice(-4)}${randomSuffix}`;
    const questionId = `soal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 4. Struktur Payload JSONB
    const payload = {
      soal_text: body.soal_text,
      gambar: body.gambar || null,
      opsi: body.opsi || [],
      pernyataan: body.pernyataan || [],
      kategori_respons: body.kategori_respons || [],
      kunci_jawaban: body.kunci_jawaban || [],
      pembahasan: body.pembahasan,
    };

    // 5. Aturan Penegakan Backend:
    // "Setelah disimpan: sumber='manual_upload', status_validasi='menunggu_validasi' secara otomatis (Pembuat Soal tidak bisa memilih status lain)."
    const newQuestion = {
      id: questionId,
      code: generatedCode,
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
      paketId: body.paket_id || null,
      sumber: "manual_upload" as const,
      status: "menunggu_validasi" as const, // Terkunci otomatis oleh backend
      authorId: user.id,
      validatorId: null,
      validationNotes: null,
      validatedAt: null,
      payload,
      temaKonteks: body.tema_konteks?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(questions).values(newQuestion);

    // 6. Catat Audit Log
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: "CREATE_QUESTION_MANUAL",
      targetResource: `questions/${generatedCode}`,
      details: {
        id: questionId,
        jenjang: body.jenjang,
        mapel: body.mapel,
        bentukSoal: body.bentuk_soal,
        jenisSoal: body.jenis_soal,
        status: "menunggu_validasi",
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Soal berhasil diunggah dan otomatis dialirkan ke antrean telaah (menunggu validasi).",
      data: newQuestion,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
