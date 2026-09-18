import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/guards";
import { db } from "@/db";
import { fixedTaxonomies, auditLogs } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// GET: Ambil seluruh daftar taksonomi (termasuk nonaktif) khusus Admin
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || !hasRole(user, "admin")) {
      return NextResponse.json({ success: false, error: "Akses ditolak. Khusus Administrator." }, { status: 403 });
    }

    const taxonomies = await db
      .select()
      .from(fixedTaxonomies)
      .orderBy(asc(fixedTaxonomies.category), asc(fixedTaxonomies.sortOrder), asc(fixedTaxonomies.name));

    return NextResponse.json({ success: true, data: taxonomies });
  } catch (error: any) {
    console.error("Error fetching admin taxonomies:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tambah nilai tetap baru
export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasRole(user, "admin")) {
      return NextResponse.json({ success: false, error: "Akses ditolak. Khusus Administrator." }, { status: 403 });
    }

    const body = await req.json();
    const { jenjang, mapel, category, code, name, description, sortOrder, isActive = true } = body;

    if (!jenjang || !mapel || !category || !code || !name) {
      return NextResponse.json(
        { success: false, error: "Field jenjang, mapel, kategori, kode, dan nama wajib diisi." },
        { status: 400 }
      );
    }

    const id = `tax-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const metadata = {
      isActive: Boolean(isActive),
      createdBy: user.email,
      createdByName: user.name,
    };

    await db.insert(fixedTaxonomies).values({
      id,
      jenjang,
      mapel,
      category,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description?.trim() || null,
      metadata,
      sortOrder: Number(sortOrder) || 0,
      createdAt: new Date(),
    });

    // Catat ke Audit Log
    await db.insert(auditLogs).values({
      id: `audit-${randomUUID()}`,
      userId: user.id,
      userEmail: user.email,
      action: "TAMBAH_TAKSONOMI",
      targetResource: `fixed_taxonomies:${id}`,
      details: {
        category,
        jenjang,
        mapel,
        code,
        name,
        isActive,
      },
      ipAddress: "127.0.0.1",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Nilai tetap "${name}" berhasil ditambahkan.`,
      data: { id, jenjang, mapel, category, code, name },
    });
  } catch (error: any) {
    console.error("Error creating taxonomy:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Perbarui nilai tetap yang ada
export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasRole(user, "admin")) {
      return NextResponse.json({ success: false, error: "Akses ditolak. Khusus Administrator." }, { status: 403 });
    }

    const body = await req.json();
    const { id, jenjang, mapel, category, code, name, description, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID taksonomi wajib disertakan." }, { status: 400 });
    }

    const existing = await db.select().from(fixedTaxonomies).where(eq(fixedTaxonomies.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: "Data taksonomi tidak ditemukan." }, { status: 404 });
    }

    const currentMeta = (existing[0].metadata as any) || {};
    const updatedMeta = {
      ...currentMeta,
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      updatedBy: user.email,
      updatedAt: new Date().toISOString(),
    };

    await db
      .update(fixedTaxonomies)
      .set({
        jenjang: jenjang || existing[0].jenjang,
        mapel: mapel || existing[0].mapel,
        category: category || existing[0].category,
        code: code ? code.trim().toUpperCase() : existing[0].code,
        name: name ? name.trim() : existing[0].name,
        description: description !== undefined ? description?.trim() || null : existing[0].description,
        metadata: updatedMeta,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : existing[0].sortOrder,
      })
      .where(eq(fixedTaxonomies.id, id));

    // Catat ke Audit Log
    await db.insert(auditLogs).values({
      id: `audit-${randomUUID()}`,
      userId: user.id,
      userEmail: user.email,
      action: "UBAH_TAKSONOMI",
      targetResource: `fixed_taxonomies:${id}`,
      details: {
        before: existing[0],
        after: { id, jenjang, mapel, category, code, name, isActive },
      },
      ipAddress: "127.0.0.1",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Data taksonomi berhasil diperbarui.",
    });
  } catch (error: any) {
    console.error("Error updating taxonomy:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus taksonomi
export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasRole(user, "admin")) {
      return NextResponse.json({ success: false, error: "Akses ditolak. Khusus Administrator." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Parameter ID wajib diberikan." }, { status: 400 });
    }

    const existing = await db.select().from(fixedTaxonomies).where(eq(fixedTaxonomies.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: "Data taksonomi tidak ditemukan." }, { status: 404 });
    }

    await db.delete(fixedTaxonomies).where(eq(fixedTaxonomies.id, id));

    // Catat ke Audit Log
    await db.insert(auditLogs).values({
      id: `audit-${randomUUID()}`,
      userId: user.id,
      userEmail: user.email,
      action: "HAPUS_TAKSONOMI",
      targetResource: `fixed_taxonomies:${id}`,
      details: { deletedRecord: existing[0] },
      ipAddress: "127.0.0.1",
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Nilai tetap "${existing[0].name}" berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error("Error deleting taxonomy:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
