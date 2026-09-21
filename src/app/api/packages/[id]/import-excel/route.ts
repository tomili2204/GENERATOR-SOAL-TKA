import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questionPackages, questions, auditLogs } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/roles";
import { eq } from "drizzle-orm";
import { parseAndValidateExcelImport } from "@/lib/validations/excel-import";
import { calculatePackageStatus } from "@/lib/validations/package-blueprint";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// POST /api/packages/[id]/import-excel - Impor massal butir soal dari file .xlsx
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!hasAnyRole(user, ["pembuat_soal", "admin"])) {
      return NextResponse.json(
        { success: false, error: "Hanya Pembuat Soal atau Admin yang dapat mengimpor soal." },
        { status: 403 }
      );
    }

    const packageId = params.id;
    const pkgRecords = await db.select().from(questionPackages).where(eq(questionPackages.id, packageId)).limit(1);
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

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "File .xlsx wajib diunggah." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "Ukuran file maksimal 10 MB." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ success: false, error: "File harus berformat .xlsx." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parseResult = parseAndValidateExcelImport(buffer, pkg.mapel);

    if (parseResult.fatalError) {
      return NextResponse.json({ success: false, error: parseResult.fatalError }, { status: 400 });
    }
    if (!parseResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Ditemukan ${parseResult.errors.length} baris bermasalah. Perbaiki file lalu unggah ulang (tidak ada soal yang disimpan).`,
          rowErrors: parseResult.errors,
        },
        { status: 422 }
      );
    }

    // Ambil soal yang sudah ada di paket ini: untuk deteksi duplikat & cari slot kosong
    const existingQuestions = await db
      .select({ nomorUrut: questions.nomorUrut, payload: questions.payload })
      .from(questions)
      .where(eq(questions.paketId, pkg.id));

    const existingTexts = new Set(
      existingQuestions.map((q: any) => String(q.payload?.soal_text || "").trim())
    );
    const usedSlots = new Set(existingQuestions.map((q: any) => q.nomorUrut).filter((n: any) => n != null));
    const emptySlots: number[] = [];
    for (let i = 1; i <= 30; i++) {
      if (!usedSlots.has(i)) emptySlots.push(i);
    }

    let importedCount = 0;
    let duplicateCount = 0;
    let capacityCount = 0;
    const details: Array<{ no: string; status: string; slotNumber?: number }> = [];
    const insertValues: any[] = [];

    for (const row of parseResult.rows) {
      if (existingTexts.has(row.soalText.trim())) {
        duplicateCount++;
        details.push({ no: row.no, status: "dilewati_duplikat" });
        continue;
      }
      const slotNumber = emptySlots.shift();
      if (slotNumber === undefined) {
        capacityCount++;
        details.push({ no: row.no, status: "dilewati_kapasitas_penuh" });
        continue;
      }

      const itemCode = `${pkg.code}-${String(slotNumber).padStart(2, "0")}`;
      const questionId = `soal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      insertValues.push({
        id: questionId,
        code: itemCode,
        nomorUrut: slotNumber,
        jenjang: pkg.jenjang,
        mapel: pkg.mapel,
        elemen: row.elemen,
        subElemen: row.subElemen || null,
        kompetensi: row.kompetensi,
        levelKognitif: row.levelKognitif,
        tingkatKesulitan: row.tingkatKesulitan,
        bentukSoal: row.bentukSoal,
        jenisSoal: "tunggal",
        stimulusId: null,
        paketId: pkg.id,
        sumber: "manual_upload",
        status: "menunggu_validasi",
        authorId: user.id,
        validatorId: null,
        validationNotes: null,
        validatedAt: null,
        payload: {
          soal_text: row.soalText,
          gambar: row.gambar,
          opsi: row.opsi,
          pernyataan: row.pernyataan,
          kategori_respons: row.kategoriRespons,
          kunci_jawaban: row.kunciJawaban,
          pembahasan: row.pembahasan,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      importedCount++;
      details.push({ no: row.no, status: "berhasil_diimpor", slotNumber });
      existingTexts.add(row.soalText.trim());
    }

    for (const values of insertValues) {
      await db.insert(questions).values(values);
    }

    // Hitung ulang status paket setelah impor
    const allPkgQuestions = await db
      .select({ id: questions.id, nomorUrut: questions.nomorUrut, status: questions.status })
      .from(questions)
      .where(eq(questions.paketId, pkg.id));
    const progress = calculatePackageStatus(allPkgQuestions as any);
    await db
      .update(questionPackages)
      .set({ status: progress.status, updatedAt: new Date() })
      .where(eq(questionPackages.id, pkg.id));

    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: "IMPORT_EXCEL_SOAL",
      targetResource: `question_packages/${pkg.code}`,
      details: { packageId: pkg.id, fileName: file.name, importedCount, duplicateCount, capacityCount },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `${importedCount} soal berhasil diimpor dan masuk antrean validasi.${
        duplicateCount > 0 ? ` ${duplicateCount} soal dilewati karena duplikat.` : ""
      }${capacityCount > 0 ? ` ${capacityCount} soal dilewati karena paket sudah penuh (30/30 slot).` : ""}`,
      data: { importedCount, duplicateCount, capacityCount, details, packageProgress: progress },
    });
  } catch (error: any) {
    console.error("POST /api/packages/[id]/import-excel error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses impor Excel." },
      { status: 500 }
    );
  }
}
