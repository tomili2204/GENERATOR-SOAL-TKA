import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import { users, userRoles, auditLogs, UserRoleType, UserRole } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // BACKEND GUARD: Hanya peran 'admin' yang dapat mengakses data pengguna & peran
    await requireRole("admin");
    await ensureTablesCreated();

    const allUsers: any[] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      instansi: users.instansi,
      isActive: users.isActive,
      assignedJenjang: users.assignedJenjang,
      assignedMapel: users.assignedMapel,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).orderBy(desc(users.createdAt));

    const allRoles: UserRole[] = await db.select().from(userRoles);

    const formatted = allUsers.map((u: any) => {
      const userAssignedRoles = allRoles
        .filter((r: UserRole) => r.userId === u.id)
        .map((r: UserRole) => r.role);
      return {
        ...u,
        roles: userAssignedRoles,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await requireRole("admin");
    await ensureTablesCreated();

    const body = await req.json();
    const {
      name,
      email,
      password,
      instansi,
      roles,
      assignedJenjang,
      assignedMapel,
      isActive = true,
    } = body;

    // Validasi input wajib
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama lengkap wajib diisi" },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email akun wajib diisi" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Kata sandi minimal 6 karakter" },
        { status: 400 }
      );
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pilih minimal 1 peran (Pembuat Soal, Validator Soal, atau keduanya)" },
        { status: 400 }
      );
    }

    // Periksa apakah email sudah terdaftar
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Email ${email} sudah digunakan oleh akun lain` },
        { status: 400 }
      );
    }

    const userId = `usr-${crypto.randomUUID().slice(0, 8)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user baru
    await db.insert(users).values({
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      instansi: instansi?.trim() || null,
      isActive: Boolean(isActive),
      assignedJenjang: Array.isArray(assignedJenjang) ? assignedJenjang : [],
      assignedMapel: Array.isArray(assignedMapel) ? assignedMapel : [],
    });

    // Insert roles
    for (const role of roles as UserRoleType[]) {
      await db.insert(userRoles).values({
        id: `role-${userId}-${role}`,
        userId,
        role,
      });
    }

    // Catat ke audit log
    await db.insert(auditLogs).values({
      id: `audit-${crypto.randomUUID()}`,
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: "USER_CREATE",
      targetResource: `users:${userId}`,
      details: {
        createdUserId: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        instansi: instansi?.trim() || null,
        roles,
        assignedJenjang,
        assignedMapel,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pengguna berhasil ditambahkan",
      data: {
        id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        instansi: instansi?.trim() || null,
        roles,
        assignedJenjang,
        assignedMapel,
        isActive: Boolean(isActive),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
