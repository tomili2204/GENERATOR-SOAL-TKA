import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // Jika pengunjung mengakses lewat subdomain ai.ayotka.id
  if (host.startsWith("ai.")) {
    // URL root (/) otomatis diarahkan/rewrite ke portal AI (/ai) secara transparan
    if (pathname === "/") {
      return NextResponse.rewrite(new URL("/ai", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Berlaku untuk semua path kecuali file static bawaan Next.js
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
