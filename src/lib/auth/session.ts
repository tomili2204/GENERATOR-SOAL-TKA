import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SessionUser } from "./roles";

export type { SessionUser };

const COOKIE_NAME = "ayotka_session";
const SECRET_KEY = process.env.SESSION_SECRET || "ayotka_super_secret_session_key_32_bytes_length_internal_admin";
const key = new TextEncoder().encode(SECRET_KEY);

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      roles: payload.roles as any,
    };
  } catch (err) {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }
    return await verifySessionToken(sessionCookie.value);
  } catch (err) {
    return null;
  }
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}
