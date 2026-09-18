import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import { temaKonteksPool } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { ensureThemesSeeded } from "@/lib/generator/seed-themes";

export const dynamic = "force-dynamic";

// GET: Ambil seluruh daftar pool tema konteks
export async function GET(req: NextRequest) {
  try {
    await requireRole("admin");
    await ensureTablesCreated();
    await ensureThemesSeeded();

    const themes = await db
      .select()
      .from(temaKonteksPool)
      .orderBy(asc(temaKonteksPool.namaTema));

    return NextResponse.json({
      success: true,
      data: themes,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: Tambah tema konteks baru
export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    await ensureTablesCreated();

    const body = await req.json();
    const { nama_tema, sub_konteks, jenjang_cocok, aktif } = body;

    if (!nama_tema || typeof nama_tema !== "string" || !nama_tema.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama tema wajib diisi." },
        { status: 400 }
      );
    }

    if (!Array.isArray(sub_konteks) || sub_konteks.length === 0) {
      return NextResponse.json(
        { success: false, error: "Sub-konteks minimal memiliki 1 contoh spesifik." },
        { status: 400 }
      );
    }

    const cleanSubKonteks = sub_konteks
      .map((s: any) => String(s).trim())
      .filter((s: string) => s.length > 0);

    const cleanJenjangCocok = Array.isArray(jenjang_cocok) && jenjang_cocok.length > 0
      ? jenjang_cocok
      : ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"];

    const newId = `tema-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(temaKonteksPool).values({
      id: newId,
      namaTema: nama_tema.trim(),
      subKonteks: cleanSubKonteks,
      jenjangCocok: cleanJenjangCocok,
      aktif: typeof aktif === "boolean" ? aktif : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Tema "${nama_tema.trim()}" berhasil ditambahkan ke pool.`,
      id: newId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT: Perbarui tema atau toggle status aktif
export async function PUT(req: NextRequest) {
  try {
    await requireRole("admin");
    await ensureTablesCreated();

    const body = await req.json();
    const { id, nama_tema, sub_konteks, jenjang_cocok, aktif } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID tema wajib disertakan." },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(temaKonteksPool)
      .where(eq(temaKonteksPool.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tema tidak ditemukan." },
        { status: 404 }
      );
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (typeof nama_tema === "string" && nama_tema.trim()) {
      updateData.namaTema = nama_tema.trim();
    }
    if (Array.isArray(sub_konteks)) {
      updateData.subKonteks = sub_konteks
        .map((s: any) => String(s).trim())
        .filter((s: string) => s.length > 0);
    }
    if (Array.isArray(jenjang_cocok)) {
      updateData.jenjangCocok = jenjang_cocok;
    }
    if (typeof aktif === "boolean") {
      updateData.aktif = aktif;
    }

    await db
      .update(temaKonteksPool)
      .set(updateData)
      .where(eq(temaKonteksPool.id, id));

    return NextResponse.json({
      success: true,
      message: "Data tema berhasil diperbarui.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: Hapus tema dari pool
export async function DELETE(req: NextRequest) {
  try {
    await requireRole("admin");
    await ensureTablesCreated();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID tema wajib disertakan." },
        { status: 400 }
      );
    }

    await db.delete(temaKonteksPool).where(eq(temaKonteksPool.id, id));

    return NextResponse.json({
      success: true,
      message: "Tema berhasil dihapus dari pool.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
