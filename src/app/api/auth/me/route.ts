import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, user: null, message: "Belum login." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user,
  });
}
