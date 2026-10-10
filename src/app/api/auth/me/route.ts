import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getSupabaseUser } from "@/lib/auth/supabase-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Cek sesi internal (admin / validator soal)
  const adminUser = await getSessionUser();
  if (adminUser) {
    return NextResponse.json({
      success: true,
      user: adminUser,
    });
  }

  // 2. Cek sesi siswa dari portal AyoTKA (Supabase Auth / GoTrue)
  const studentUser = await getSupabaseUser();
  if (studentUser) {
    return NextResponse.json({
      success: true,
      user: {
        id: studentUser.id,
        name: studentUser.name,
        email: studentUser.email,
        roles: [studentUser.role],
      },
    });
  }

  return NextResponse.json(
    { success: false, user: null, message: "Belum login." },
    { status: 401 }
  );
}
