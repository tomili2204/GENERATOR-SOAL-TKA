import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { hasRole } from "@/lib/auth/roles";
import { isJenjangMatch } from "@/lib/jenjang-utils";
import { isTemplateAvailable } from "@/lib/import/kompetensi-referensi";
import { generateImportTemplateXlsx } from "@/lib/import/generate-template";

// GET /api/import-template?jenjang=...&mapel=...
// Mengunduh file .xlsx template impor massal soal Human untuk kombinasi jenjang+mapel.
// Hanya untuk Pembuat Soal (dibatasi ke jenjang/mapel penugasannya) dan Admin (bebas).
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("pembuat_soal", "admin");

    const { searchParams } = new URL(req.url);
    const jenjang = searchParams.get("jenjang");
    const mapel = searchParams.get("mapel");
    if (!jenjang || !mapel) {
      return NextResponse.json(
        { success: false, error: 'Parameter "jenjang" dan "mapel" wajib disertakan.' },
        { status: 400 }
      );
    }

    if (!hasRole(user, "admin")) {
      const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      const assignedJenjang = (dbUser?.assignedJenjang as string[] | undefined) || [];
      const assignedMapel = (dbUser?.assignedMapel as string[] | undefined) || [];
      const jenjangOk = assignedJenjang.some((j) => isJenjangMatch(j, jenjang));
      const mapelOk = assignedMapel.includes(mapel);
      if (!jenjangOk || !mapelOk) {
        return NextResponse.json(
          {
            success: false,
            error: `Anda tidak ditugaskan untuk kombinasi ${mapel} - ${jenjang}. Hubungi Admin bila ini keliru.`,
          },
          { status: 403 }
        );
      }
    }

    if (!isTemplateAvailable(jenjang, mapel)) {
      return NextResponse.json(
        {
          success: false,
          error: `Template untuk mapel/jenjang ini belum tersedia (${mapel} - ${jenjang}).`,
        },
        { status: 404 }
      );
    }

    const buffer = await generateImportTemplateXlsx(jenjang, mapel);
    const fileName = `template-impor-soal-${mapel}-${jenjang}.xlsx`
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "-");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
