import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questionPackages, questions, auditLogs } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/roles";
import { eq, and } from "drizzle-orm";
import { validateQuestionData } from "@/lib/validations/question";
import { calculatePackageStatus } from "@/lib/validations/package-blueprint";

// POST /api/packages/[id]/slots/[slotNumber] - Mengisi atau mengganti butir soal di slot paket
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; slotNumber: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(user, ["pembuat_soal", "admin"])) {
      return NextResponse.json(
        { success: false, error: "Hanya Pembuat Soal atau Admin yang dapat mengisi slot paket." },
        { status: 403 }
      );
    }

    const packageId = params.id;
    const slotNumber = parseInt(params.slotNumber, 10);

    if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > 30) {
      return NextResponse.json(
        { success: false, error: "Nomor slot tidak valid. Slot harus berada di antara 1 dan 30." },
        { status: 400 }
      );
    }

    // Pastikan paket ada
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

    // Pembuat soal hanya boleh mengedit paket buatannya sendiri (kecuali Admin)
    if (pkg.authorId !== user.id && !hasAnyRole(user, ["admin"])) {
      return NextResponse.json(
        { success: false, error: "Anda tidak memiliki izin mengedit paket milik pembuat lain." },
        { status: 403 }
      );
    }

    const body = await req.json();

    // 1. Validasi Input Soal (KaTeX delimiters, PGK Kategori, dsb)
    // Pastikan jenjang dan mapel mengikuti paket
    const validatedInput = {
      ...body,
      jenjang: pkg.jenjang,
      mapel: pkg.mapel,
    };

    const validation = validateQuestionData(validatedInput);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join("; "), errors: validation.errors },
        { status: 400 }
      );
    }

    // 2. Format Kode Butir Soal Terstandarisasi: H01-SD-MAT-01
    const itemCode = `${pkg.code}-${slotNumber.toString().padStart(2, "0")}`;

    // 3. Susun Payload JSONB
    const payload = {
      soal_text: body.soal_text,
      gambar: body.gambar || null,
      opsi: body.opsi || [],
      pernyataan: body.pernyataan || [],
      kategori_respons: body.kategori_respons || [],
      kunci_jawaban: body.kunci_jawaban || [],
      pembahasan: body.pembahasan,
    };

    // Cek apakah slot sudah ada butir soal sebelumnya
    const existingSlotQuestions = await db
      .select()
      .from(questions)
      .where(and(eq(questions.paketId, pkg.id), eq(questions.nomorUrut, slotNumber)))
      .limit(1);

    let savedQuestionId = "";
    let actionType = "FILL_SLOT";

    if (existingSlotQuestions.length > 0) {
      const existingQ = existingSlotQuestions[0];

      // Jika soal sudah disetujui, tolak penggantian sepihak kecuali oleh admin
      if (existingQ.status === "disetujui" && !hasAnyRole(user, ["admin"])) {
        return NextResponse.json(
          {
            success: false,
            error: `Butir soal pada Slot ${slotNumber} sudah disetujui dan terkunci dari perubahan.`,
          },
          { status: 403 }
        );
      }

      actionType = existingQ.status === "ditolak" ? "REPLACE_REJECTED_SLOT" : "UPDATE_REVISED_SLOT";
      savedQuestionId = existingQ.id;

      // Update butir soal yang ada dan kembalikan status ke 'menunggu_validasi'
      await db
        .update(questions)
        .set({
          elemen: body.elemen,
          subElemen: body.sub_elemen || null,
          kompetensi: body.kompetensi,
          levelKognitif: body.level_kognitif,
          tingkatKesulitan: body.tingkat_kesulitan,
          bentukSoal: body.bentuk_soal,
          jenisSoal: body.jenis_soal,
          stimulusId: body.jenis_soal === "grup" ? body.stimulus_id : null,
          status: "menunggu_validasi", // Dikembalikan ke antrean validasi otomatis
          validatorId: null,
          validationNotes: null,
          validatedAt: null,
          payload,
          temaKonteks: body.tema_konteks || body.temaKonteks || null,
          updatedAt: new Date(),
        })
        .where(eq(questions.id, existingQ.id));
    } else {
      // Slot masih kosong, buat baru
      savedQuestionId = `soal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      await db.insert(questions).values({
        id: savedQuestionId,
        code: itemCode,
        nomorUrut: slotNumber,
        jenjang: pkg.jenjang,
        mapel: pkg.mapel,
        elemen: body.elemen,
        subElemen: body.sub_elemen || null,
        kompetensi: body.kompetensi,
        levelKognitif: body.level_kognitif,
        tingkatKesulitan: body.tingkat_kesulitan,
        bentukSoal: body.bentuk_soal,
        jenisSoal: body.jenis_soal,
        stimulusId: body.jenis_soal === "grup" ? body.stimulus_id : null,
        paketId: pkg.id,
        sumber: pkg.tipeSumber === "ai" ? "ai_generated" : "manual_upload",
        status: "menunggu_validasi",
        authorId: user.id,
        validatorId: null,
        validationNotes: null,
        validatedAt: null,
        payload,
        temaKonteks: body.tema_konteks || body.temaKonteks || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 4. Hitung ulang status paket
    const allPkgQuestions = await db
      .select({
        id: questions.id,
        nomorUrut: questions.nomorUrut,
        status: questions.status,
      })
      .from(questions)
      .where(eq(questions.paketId, pkg.id));

    const progress = calculatePackageStatus(allPkgQuestions);

    await db
      .update(questionPackages)
      .set({
        status: progress.status,
        updatedAt: new Date(),
      })
      .where(eq(questionPackages.id, pkg.id));

    // 5. Catat Audit Log
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: actionType,
      targetResource: `question_packages/${pkg.code}/slots/${slotNumber}`,
      details: {
        packageId: pkg.id,
        slotNumber,
        questionId: savedQuestionId,
        itemCode,
        bentukSoal: body.bentuk_soal,
        tingkatKesulitan: body.tingkat_kesulitan,
      },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Slot ${slotNumber} (${itemCode}) berhasil disimpan dan masuk antrean validasi.`,
      data: {
        questionId: savedQuestionId,
        itemCode,
        slotNumber,
        packageProgress: progress,
      },
    });
  } catch (error: any) {
    console.error("POST /api/packages/[id]/slots/[slotNumber] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal menyimpan slot soal." },
      { status: 500 }
    );
  }
}
