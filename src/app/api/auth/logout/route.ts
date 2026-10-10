import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  clearSessionCookie();

  const response = NextResponse.json({
    success: true,
    message: "Logout berhasil.",
  });

  const cookieNames = new Set<string>([
    "sb-ayotka-auth-token",
    "sb-ayotka-auth-token.0",
    "sb-ayotka-auth-token.1",
    "sb-ayotka-auth-token.2",
    "sb-ayotka-auth-token.3",
    "ayotka_session",
    "ayotka_acting_school",
  ]);

  for (const c of req.cookies.getAll()) {
    if (
      c.name.startsWith("sb-") ||
      c.name.includes("auth-token") ||
      c.name.includes("ayotka")
    ) {
      cookieNames.add(c.name);
    }
  }

  const isProd = process.env.NODE_ENV === "production";
  const domains = [isProd ? ".ayotka.id" : undefined, undefined];

  for (const name of cookieNames) {
    for (const d of domains) {
      response.cookies.set(name, "", {
        domain: d,
        path: "/",
        maxAge: 0,
        expires: new Date(0),
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
      });
    }
  }

  return response;
}
