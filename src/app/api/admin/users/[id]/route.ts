import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import { users, userRoles, auditLogs, questionPackages, UserRoleType } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireRole("admin");
    await ensureTablesCreated();
    const targetUserId = params.id;

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      email,
      password,
      instansi,
      roles,
      assignedJenjang,
      assignedMapel,
      isActive,
    } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (instansi !== undefined) updateData.instansi = instansi ? instansi.trim() : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (assignedJenjang !== undefined) updateData.assignedJenjang = assignedJenjang;
    if (assignedMapel !== undefined) updateData.assignedMapel = assignedMapel;
    if (password && password.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    // Update user table
    await db.update(users).set(updateData).where(eq(users.id, targetUserId));

    // Update roles jika disediakan
    if (Array.isArray(roles) && roles.length > 0) {
      // Hapus roles lama
      await db.delete(userRoles).where(eq(userRoles.userId, targetUserId));
      // Tambahkan roles baru
      for (const role of roles as UserRoleType[]) {
        await db.insert(userRoles).values({
          id: `role-${targetUserId}-${role}`,
          userId: targetUserId,
          role,
        });
      }
    }

    // Catat ke audit log
    await db.insert(auditLogs).values({
      id: `audit-${crypto.randomUUID()}`,
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: "USER_UPDATE",
      targetResource: `users:${targetUserId}`,
      details: {
        updatedUserId: targetUserId,
        updates: body,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Data pengguna berhasil diperbarui",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const adminUser = await requireRole("admin");
    await ensureTablesCreated();
    const targetUserId = params.id;

    if (targetUserId === adminUser.id) {
      return NextResponse.json(
        { success: false, error: "Tidak dapat menonaktifkan atau menghapus akun sendiri" },
        { status: 400 }
      );
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const isHardDelete = searchParams.get("hard") === "true";

    if (isHardDelete) {
      // Hard delete dengan pemutusan relasi audit log & penugasan paket agar data konsisten
      await db.update(auditLogs).set({ userId: null }).where(eq(auditLogs.userId, targetUserId));
      await db.update(questionPackages).set({ assignedValidatorId: null }).where(eq(questionPackages.assignedValidatorId, targetUserId));
      await db.delete(userRoles).where(eq(userRoles.userId, targetUserId));
      await db.delete(users).where(eq(users.id, targetUserId));

      await db.insert(auditLogs).values({
        id: `audit-${crypto.randomUUID()}`,
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: "USER_DELETE",
        targetResource: `users:${targetUserId}`,
        details: { deletedUserId: targetUserId, targetEmail: existingUser[0]?.email },
      });

      return NextResponse.json({
        success: true,
        message: "Pengguna berhasil dihapus secara permanen",
      });
    }

    // Soft delete (deaktivasi akun)
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    await db.insert(auditLogs).values({
      id: `audit-${crypto.randomUUID()}`,
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: "USER_DEACTIVATE",
      targetResource: `users:${targetUserId}`,
      details: { deactivatedUserId: targetUserId },
    });

    return NextResponse.json({
      success: true,
      message: "Pengguna berhasil dinonaktifkan",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
