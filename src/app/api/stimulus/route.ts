import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stimulus, auditLogs } from "@/db/schema";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole("pembuat_soal", "validator_soal", "admin");
    const { searchParams } = new URL(req.url);
    const jenjang = searchParams.get("jenjang");
    const mapel = searchParams.get("mapel");

    let query = db.select().from(stimulus);

    const conditions = [];
    if (jenjang) conditions.push(eq(stimulus.jenjang, jenjang as any));
    if (mapel) conditions.push(eq(stimulus.mapel, mapel));

    let items;
    if (conditions.length > 0) {
      items = await db
        .select()
        .from(stimulus)
        .where(and(...conditions))
        .orderBy(desc(stimulus.createdAt));
    } else {
      items = await db.select().from(stimulus).orderBy(desc(stimulus.createdAt));
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

    const { jenjang, mapel, tipe, judul, konten } = body;

    if (!jenjang || !mapel || !tipe || !konten) {
      return NextResponse.json(
        {
          success: false,
          error: "Field jenjang, mapel, tipe ('teks' | 'data'), dan konten wajib diisi.",
        },
        { status: 400 }
      );
    }

    if (tipe !== "teks" && tipe !== "data") {
      return NextResponse.json(
        { success: false, error: "Tipe stimulus harus 'teks' atau 'data'." },
        { status: 400 }
      );
    }

    // Hitung jumlah kata jika teks
    const wordCount = konten.trim().split(/\s+/).filter(Boolean).length;
    const stimulusId = `stm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newStimulus = {
      id: stimulusId,
      jenjang,
      mapel,
      tipe,
      judul: judul && judul.trim() !== "" ? judul.trim() : `Stimulus ${tipe === "teks" ? "Bacaan" : "Data"} (${mapel})`,
      konten: konten.trim(),
      jumlahKata: wordCount,
      dibuatOleh: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(stimulus).values(newStimulus);

    // Audit Log
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: "CREATE_STIMULUS",
      targetResource: `stimulus/${stimulusId}`,
      details: { judul: newStimulus.judul, tipe, jenjang, mapel, wordCount },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: "Stimulus berhasil dibuat.",
      data: newStimulus,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
