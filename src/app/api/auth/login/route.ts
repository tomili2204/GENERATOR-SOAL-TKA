import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, ensureTablesCreated } from "@/db";
import { users, userRoles, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    await ensureTablesCreated();
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const userRecords = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);

    if (userRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: "Email atau password yang Anda masukkan tidak sesuai." },
        { status: 401 }
      );
    }

    const user = userRecords[0];

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "Akun ini telah dinonaktifkan. Hubungi administrator." },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Email atau password yang Anda masukkan tidak sesuai." },
        { status: 401 }
      );
    }

    // Ambil seluruh peran (multi-peran) yang dimiliki akun
    const rolesList: any[] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
    const roles = rolesList.map((r) => r.role);

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      roles,
    };

    const token = await createSessionToken(sessionUser);
    await setSessionCookie(token);

    // Catat log login
    await db.insert(auditLogs).values({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      userEmail: user.email,
      action: "AUTH_LOGIN_SUCCESS",
      targetResource: `users/${user.id}`,
      details: { roles, timestamp: new Date().toISOString() },
      ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    const res = NextResponse.json({
      success: true,
      message: "Login berhasil.",
      user: sessionUser,
    });

    res.cookies.set("ayotka_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("Login route error:", error);
    const cause = (error as any)?.cause;
    const errorDetail = cause?.message || (typeof cause === "string" ? cause : "") || (error as any)?.message || "Terjadi kesalahan internal saat memproses autentikasi.";
    return NextResponse.json(
      { success: false, error: `Kesalahan autentikasi: ${errorDetail}`, debug: { cause: cause?.message || cause, stack: (error as any)?.stack?.split("\n").slice(0, 3) } },
      { status: 500 }
    );
  }
}
