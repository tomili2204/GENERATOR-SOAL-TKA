import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questionPackages, questions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/roles";
import { eq, and } from "drizzle-orm";
import { reviseQuestionWithAi } from "@/lib/generator/gemini-generator";
import { renderDiagramTemplate } from "@/lib/generator/diagram-templates";
import { validateQuestionData } from "@/lib/validations/question";

// POST /api/packages/[id]/slots/[slotNumber]/ai-revise
// Meminta AI membuat DRAF revisi satu butir soal berdasarkan catatan validator.
// Tidak menyimpan apa pun ke database — hasilnya dikembalikan agar Pembuat Soal
// meninjau/menyunting di form edit sebelum benar-benar menyimpan & mengirim ulang.
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
        { success: false, error: "Hanya Pembuat Soal atau Admin yang dapat meminta perbaikan AI." },
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

    const pkgRecords = await db
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, packageId))
      .limit(1);
    if (pkgRecords.length === 0) {
      return NextResponse.json({ success: false, error: "Paket soal tidak ditemukan." }, { status: 404 });
    }
    const pkg = pkgRecords[0];

    if (pkg.authorId !== user.id && !hasAnyRole(user, ["admin"])) {
      return NextResponse.json(
        { success: false, error: "Anda tidak memiliki izin mengedit paket milik pembuat lain." },
        { status: 403 }
      );
    }

    const existing = await db
      .select()
      .from(questions)
      .where(and(eq(questions.paketId, pkg.id), eq(questions.nomorUrut, slotNumber)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Slot ini belum memiliki butir soal untuk direvisi." },
        { status: 400 }
      );
    }
    const question = existing[0] as any;

    if (!question.validationNotes || !String(question.validationNotes).trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Butir soal ini belum memiliki catatan perbaikan dari validator untuk dijadikan acuan AI.",
        },
        { status: 400 }
      );
    }

    const payload = question.payload || {};

    const aiResult = await reviseQuestionWithAi({
      jenjang: pkg.jenjang,
      mapel: pkg.mapel,
      elemen: question.elemen,
      subElemen: question.subElemen,
      bentukSoal: question.bentukSoal,
      jenisSoal: question.jenisSoal,
      tingkatKesulitan: question.tingkatKesulitan,
      soalText: payload.soal_text || "",
      opsi: payload.opsi || null,
      pernyataan: payload.pernyataan || null,
      kategoriRespons: payload.kategori_respons || null,
      kunciJawaban: payload.kunci_jawaban || [],
      pembahasan: payload.pembahasan || "",
      gambarTipe: payload.gambar?.tipe || null,
      validationNotes: question.validationNotes,
    });

    if (!aiResult.success || !aiResult.revised) {
      return NextResponse.json(
        { success: false, error: aiResult.error || "Gagal memperoleh hasil revisi dari AI." },
        { status: 502 }
      );
    }

    // Field "gambar": null dari AI berarti pertahankan ilustrasi asli; jika AI mengirim
    // format template diagram, terjemahkan dulu jadi SVG final sebelum divalidasi.
    let finalGambar = aiResult.revised.gambar ?? payload.gambar ?? null;
    if (finalGambar && finalGambar.tipe === "diagram") {
      const diagramResult = renderDiagramTemplate({ archetype: finalGambar.archetype, ...(finalGambar.data || {}) });
      if (!diagramResult.svg) {
        return NextResponse.json(
          {
            success: false,
            error: `AI mengembalikan spesifikasi diagram yang tidak valid: ${diagramResult.error}. Silakan coba lagi.`,
          },
          { status: 502 }
        );
      }
      finalGambar = { tipe: "svg", svg_content: diagramResult.svg, deskripsi_alt: finalGambar.deskripsi_alt || "" };
    }

    const merged = {
      jenjang: pkg.jenjang,
      mapel: pkg.mapel,
      elemen: question.elemen,
      sub_elemen: question.subElemen,
      kompetensi: question.kompetensi,
      level_kognitif: question.levelKognitif,
      tingkat_kesulitan: question.tingkatKesulitan,
      bentuk_soal: question.bentukSoal,
      jenis_soal: question.jenisSoal,
      stimulus_id: question.stimulusId,
      soal_text: aiResult.revised.soal_text,
      pembahasan: aiResult.revised.pembahasan,
      gambar: finalGambar,
      opsi: aiResult.revised.opsi,
      pernyataan: aiResult.revised.pernyataan,
      kategori_respons: aiResult.revised.kategori_respons,
      kunci_jawaban: aiResult.revised.kunci_jawaban,
    };

    const validation = validateQuestionData(merged as any);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: `Hasil revisi AI belum memenuhi syarat: ${validation.errors.join("; ")}`,
          errors: validation.errors,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        soal_text: merged.soal_text,
        pembahasan: merged.pembahasan,
        gambar: merged.gambar,
        opsi: merged.opsi,
        pernyataan: merged.pernyataan,
        kategori_respons: merged.kategori_respons,
        kunci_jawaban: merged.kunci_jawaban,
      },
      message: "Draf revisi AI berhasil dibuat. Tinjau hasilnya sebelum menyimpan.",
    });
  } catch (error: any) {
    console.error("POST /api/packages/[id]/slots/[slotNumber]/ai-revise error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses perbaikan AI." },
      { status: 500 }
    );
  }
}
