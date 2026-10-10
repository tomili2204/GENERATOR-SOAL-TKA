import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET =
  process.env.GOTRUE_JWT_SECRET ||
  "9566cea579bfa06a4f889919f594a299b9ff687473d640f42d7072c44963f268ab8d6b593f03cd76aab5c6bd6ded9e53";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface SupabaseAuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Membaca dan memverifikasi cookie autentikasi Supabase/GoTrue (sb-ayotka-auth-token)
 * yang diset oleh portal utama siswa (ayotka.id).
 */
export async function getSupabaseUser(): Promise<SupabaseAuthUser | null> {
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();

    // 1. Cari cookie auth token (bisa utuh atau terpecah dalam chunks .0, .1, dst.)
    const authChunks = allCookies
      .filter((c) => c.name.startsWith("sb-ayotka-auth-token") || c.name.startsWith("sb-") && c.name.includes("-auth-token"))
      .sort((a, b) => {
        const idxA = a.name.includes(".") ? parseInt(a.name.split(".").pop() || "0", 10) : 0;
        const idxB = b.name.includes(".") ? parseInt(b.name.split(".").pop() || "0", 10) : 0;
        return idxA - idxB;
      });

    if (authChunks.length === 0) {
      return null;
    }

    // Gabungkan isi chunks
    let rawValue = authChunks.map((c) => c.value).join("");
    if (!rawValue) return null;

    // Supabase SSR membungkus cookie dengan prefix 'base64-' jika terdapat karakter khusus
    if (rawValue.startsWith("base64-")) {
      try {
        rawValue = Buffer.from(rawValue.slice(7), "base64").toString("utf8");
      } catch {
        // Fallback jika bukan base64 biasa
      }
    }

    // Parse JSON token
    let sessionData: any = null;
    try {
      sessionData = JSON.parse(rawValue);
    } catch {
      // Jika cookie langsung berupa string JWT
      sessionData = rawValue;
    }

    // Ambil access_token: format array [access_token, refresh_token] atau objek { access_token }
    let accessToken = "";
    if (Array.isArray(sessionData) && sessionData.length > 0) {
      accessToken = sessionData[0];
    } else if (typeof sessionData === "object" && sessionData?.access_token) {
      accessToken = sessionData.access_token;
    } else if (typeof sessionData === "string" && sessionData.includes(".")) {
      accessToken = sessionData;
    }

    if (!accessToken) return null;

    // 2. Verifikasi tanda tangan JWT secara instan menggunakan jose
    const { payload } = await jwtVerify(accessToken, secretKey);
    const sub = payload.sub as string;
    if (!sub) return null;

    // 3. Verifikasi status sesi aktif ke GoTrue jika di VPS (port 9999)
    // Supaya jika siswa sudah logout / sesi dicabut di ayotka.id, ai.ayotka.id langsung menolak seketika
    const gotrueUrl = process.env.GOTRUE_INTERNAL_URL || "http://127.0.0.1:9999";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const verifyRes = await fetch(`${gotrueUrl}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (verifyRes.status === 401 || verifyRes.status === 403) {
        return null;
      }
    } catch {
      // Jika GoTrue unreachable atau saat running lokal dev, gunakan verifikasi signature di atas
    }

    const userMeta = (payload.user_metadata as any) || {};
    const appMeta = (payload.app_metadata as any) || {};

    const name =
      userMeta.name ||
      userMeta.full_name ||
      (payload.email ? (payload.email as string).split("@")[0] : "Siswa AyoTKA");

    const email = (payload.email as string) || "";
    const role = appMeta.role || (payload.role as string) || "siswa";

    return {
      id: sub,
      name,
      email,
      role,
    };
  } catch (err) {
    // Token kedaluwarsa atau tidak valid
    return null;
  }
}
