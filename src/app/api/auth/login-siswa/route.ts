import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const GOTRUE_URL = process.env.GOTRUE_URL || "http://127.0.0.1:9999";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzkxNTQ1NDE1LCJleHAiOjIxMDY5MDU0MTV9.4oY-m0idVkr0haMO0jGpa5F09r7MMZtRHVXR5NU1WhY";

function resolveEmail(identifier: string): string {
  const clean = identifier.trim();
  // Format NISN 10 digit di AyoTKA
  if (/^\d{10}$/.test(clean)) {
    return `${clean}@nisn.ayotka.id`;
  }
  return clean.toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Email/NISN dan password wajib diisi." },
        { status: 400 }
      );
    }

    const email = resolveEmail(identifier);

    // Panggil GoTrue server lokal di VPS (port 9999)
    const tokenRes = await fetch(`${GOTRUE_URL}/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const tokenData = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok || !tokenData.access_token) {
      const errMsg =
        tokenData.error_description ||
        tokenData.msg ||
        "Email/NISN atau password tidak sesuai. Pastikan akun siswa sudah terdaftar.";
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: 401 }
      );
    }

    const { access_token, refresh_token, user } = tokenData;
    const userMeta = user.user_metadata || {};
    const name =
      userMeta.name ||
      userMeta.full_name ||
      identifier.split("@")[0] ||
      "Siswa AyoTKA";

    const studentSessionUser = {
      id: user.id,
      name,
      email: user.email || email,
      roles: ["siswa"],
    };

    // 1. Simpan cookie ayotka_session (token internal)
    const internalToken = await createSessionToken(studentSessionUser);
    await setSessionCookie(internalToken);

    // 2. Simpan juga cookie Supabase Auth (sb-ayotka-auth-token) dengan domain .ayotka.id
    const cookieStore = cookies();
    const isProd = process.env.NODE_ENV === "production";
    const domain = isProd ? ".ayotka.id" : undefined;

    const sbSessionPayload = JSON.stringify([access_token, refresh_token, null, null, null]);
    cookieStore.set("sb-ayotka-auth-token", sbSessionPayload, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      domain,
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return NextResponse.json({
      success: true,
      user: studentSessionUser,
    });
  } catch (err: any) {
    console.error("[Login Siswa AI Error]:", err);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan sistem saat memproses login." },
      { status: 500 }
    );
  }
}
