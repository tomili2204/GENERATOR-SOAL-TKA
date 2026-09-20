import { NextRequest, NextResponse } from "next/server";
import { requireRole, hasRole, handleApiError } from "@/lib/auth/guards";
import { db } from "@/db";
import { questions, users, stimulus, questionPackages } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { getJenjangVariants } from "@/lib/jenjang-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // BACKEND GUARD: Akun dengan peran 'validator_soal' atau 'admin'
    const user = await requireRole("validator_soal", "admin");
    const isAdmin = hasRole(user, "admin");
    const { searchParams } = new URL(req.url);

    const jenjang = searchParams.get("jenjang");
    const mapel = searchParams.get("mapel");
    const bentukSoal = searchParams.get("bentuk_soal");
    const sumber = searchParams.get("sumber");

    const conditions = [eq(questions.status, "menunggu_validasi")];

    // Jika bukan admin, hanya ambil dari paket yang ditugaskan kepada validator ini
    if (!isAdmin) {
      const assignedPkgs = await db
        .select({ id: questionPackages.id })
        .from(questionPackages)
        .where(eq(questionPackages.assignedValidatorId, user.id));
      const allowedPkgIds = assignedPkgs.map((p: any) => p.id);

      if (allowedPkgIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          filters: {
            jenjang: jenjang || "semua",
            mapel: mapel || "semua",
            bentukSoal: bentukSoal || "semua",
            sumber: sumber || "semua",
          },
        });
      }
      conditions.push(inArray(questions.paketId, allowedPkgIds));
    }

    if (jenjang && jenjang !== "semua") {
      const variants = getJenjangVariants(jenjang);
      conditions.push(inArray(questions.jenjang, variants as any));
    }
    if (mapel && mapel !== "semua") {
      conditions.push(eq(questions.mapel, mapel));
    }
    if (bentukSoal && bentukSoal !== "semua") {
      conditions.push(eq(questions.bentukSoal, bentukSoal as any));
    }
    if (sumber && sumber !== "semua") {
      conditions.push(eq(questions.sumber, sumber as any));
    }

    const queueRecords: any[] = await db
      .select({
        id: questions.id,
        code: questions.code,
        jenjang: questions.jenjang,
        mapel: questions.mapel,
        elemen: questions.elemen,
        subElemen: questions.subElemen,
        kompetensi: questions.kompetensi,
        levelKognitif: questions.levelKognitif,
        tingkatKesulitan: questions.tingkatKesulitan,
        bentukSoal: questions.bentukSoal,
        jenisSoal: questions.jenisSoal,
        stimulusId: questions.stimulusId,
        sumber: questions.sumber,
        status: questions.status,
        validationNotes: questions.validationNotes,
        authorId: questions.authorId,
        createdAt: questions.createdAt,
        payload: questions.payload,
        previousPayload: questions.previousPayload,
        previousValidationNotes: questions.previousValidationNotes,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(questions)
      .leftJoin(users, eq(questions.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(questions.createdAt));

    // Ambil seluruh ID stimulus unik yang ada di antrean
    const stimulusIds = Array.from(
      new Set(queueRecords.map((q) => q.stimulusId).filter(Boolean))
    ) as string[];

    let stimulusMap: Record<string, any> = {};
    let groupQuestionsMap: Record<string, any[]> = {};

    if (stimulusIds.length > 0) {
      const stimRecords: any[] = await db
        .select()
        .from(stimulus)
        .where(inArray(stimulus.id, stimulusIds));
      stimRecords.forEach((s: any) => {
        stimulusMap[s.id] = s;
      });

      // Ambil seluruh soal lain yang berbagi stimulus_id yang sama (untuk penilaian grup simultan)
      const siblingQuestions: any[] = await db
        .select({
          id: questions.id,
          code: questions.code,
          bentukSoal: questions.bentukSoal,
          elemen: questions.elemen,
          status: questions.status,
          payload: questions.payload,
          stimulusId: questions.stimulusId,
        })
        .from(questions)
        .where(inArray(questions.stimulusId, stimulusIds));

      siblingQuestions.forEach((sq: any) => {
        if (sq.stimulusId) {
          if (!groupQuestionsMap[sq.stimulusId]) {
            groupQuestionsMap[sq.stimulusId] = [];
          }
          groupQuestionsMap[sq.stimulusId].push(sq);
        }
      });
    }

    // Format item dengan status pemisahan tugas dan stimulus grup
    const formatted = queueRecords.map((item) => {
      const isSelf = item.authorId === user.id;
      return {
        ...item,
        isSelfAuthored: isSelf,
        canValidate: !isSelf,
        stimulus: item.stimulusId ? stimulusMap[item.stimulusId] || null : null,
        groupQuestions: item.stimulusId ? groupQuestionsMap[item.stimulusId] || [] : [],
        separationNote: isSelf
          ? "Pemisahan Tugas: Anda adalah pengunggah soal ini. Aksi validasi dilarang oleh sistem."
          : "Dapat divalidasi.",
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
      total: formatted.length,
      filters: {
        jenjang: jenjang || "semua",
        mapel: mapel || "semua",
        bentukSoal: bentukSoal || "semua",
        sumber: sumber || "semua",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
