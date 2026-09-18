import { getSessionUser } from "./session";
import { SessionUser, hasRole, hasAnyRole } from "./roles";
import { UserRoleType, questions, questionPackages } from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export { hasRole, hasAnyRole };
export type { SessionUser };

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Memastikan pengguna telah terautentikasi (memiliki sesi aktif)
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Sesi login tidak valid atau telah kedaluwarsa. Silakan login kembali.", 401);
  }
  return user;
}

/**
 * Memastikan pengguna memiliki setidaknya satu peran yang diizinkan
 */
export async function requireRole(...allowedRoles: UserRoleType[]): Promise<SessionUser> {
  const user = await requireAuth();

  const isAllowed = hasAnyRole(user, allowedRoles);
  if (!isAllowed) {
    const rolesStr = allowedRoles.join(", ");
    throw new AuthError(
      `Akses ditolak: Tindakan ini memerlukan salah satu dari peran [${rolesStr}]. Peran Anda saat ini: [${user.roles.join(", ")}].`,
      403
    );
  }

  return user;
}

/**
 * PENEGAKAN ATURAN PEMISAHAN TUGAS (SEPARATION OF DUTIES) DI LEVEL BACKEND:
 * Seorang validator TIDAK BOLEH menyetujui, menolak, atau meminta revisi soal yang ia unggah sendiri.
 * Bahkan jika akun tersebut memiliki peran 'validator_soal' dan 'pembuat_soal' sekaligus.
 */
export async function assertCanValidateQuestion(questionId: string, user: SessionUser) {
  // 1. Pastikan memiliki peran validator_soal
  if (!hasRole(user, "validator_soal")) {
    throw new AuthError("Akses ditolak: Hanya akun dengan peran 'validator_soal' yang dapat melakukan validasi.", 403);
  }

  // 2. Ambil data soal dari basis data
  const questionRecords: any[] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (questionRecords.length === 0) {
    throw new AuthError(`Soal dengan ID "${questionId}" tidak ditemukan.`, 404);
  }

  const question = questionRecords[0];

  // 3. ATURAN PEMISAHAN TUGAS: Validator tidak boleh memvalidasi soal ciptaannya sendiri
  if (question.authorId === user.id) {
    throw new AuthError(
      `Pemisahan tugas: Validator "${user.name}" (${user.email}) TIDAK BOLEH memvalidasi atau mereview soal yang diunggah oleh dirinya sendiri (Soal: ${question.code}).`,
      403
    );
  }

  // 4. Pastikan status soal memang layak divalidasi
  if (question.status !== "menunggu_validasi") {
    throw new AuthError(
      `Soal ${question.code} saat ini berstatus "${question.status}", bukan "menunggu_validasi".`,
      400
    );
  }

  // 5. ATURAN PENUGASAN PAKET: Validator non-admin hanya boleh memvalidasi soal dari paket tugasnya
  if (!hasRole(user, "admin") && question.paketId) {
    const pkg = await db
      .select({ id: questionPackages.id, code: questionPackages.code, assignedValidatorId: questionPackages.assignedValidatorId })
      .from(questionPackages)
      .where(eq(questionPackages.id, question.paketId))
      .limit(1);

    if (pkg.length > 0 && pkg[0].assignedValidatorId && pkg[0].assignedValidatorId !== user.id) {
      throw new AuthError(
        `Penugasan: Paket soal "${pkg[0].code}" ditugaskan kepada validator lain. Anda tidak memiliki wewenang memvalidasi butir soal ini.`,
        403
      );
    }
  }

  return question;
}

/**
 * Pengecekan otorisasi edit soal untuk peran pembuat_soal:
 * Hanya boleh mengedit soal miliknya sendiri dan HANYA jika status_validasi masih "draft" atau "direvisi".
 * Soal yang sudah "menunggu_validasi", "disetujui", atau "ditolak" tidak bisa diedit langsung olehnya.
 */
export async function assertCanEditQuestion(questionId: string, user: SessionUser) {
  if (!hasRole(user, "pembuat_soal") && !hasRole(user, "admin")) {
    throw new AuthError("Akses ditolak: Hanya akun dengan peran 'pembuat_soal' atau 'admin' yang dapat mengedit soal.", 403);
  }

  const questionRecords: any[] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (questionRecords.length === 0) {
    throw new AuthError(`Soal dengan ID "${questionId}" tidak ditemukan.`, 404);
  }

  const question = questionRecords[0];

  // Jika bukan admin, pastikan pembuat soal hanya mengedit miliknya sendiri
  if (!hasRole(user, "admin") && question.authorId !== user.id) {
    throw new AuthError("Akses ditolak: Pembuat soal hanya diizinkan mengedit soal miliknya sendiri.", 403);
  }

  // Aturan status: hanya boleh diedit jika status masih "draft" atau "direvisi" ("perlu_revisi")
  const isEditable = question.status === "draft" || question.status === "direvisi" || question.status === "perlu_revisi";
  if (!isEditable) {
    throw new AuthError(
      `Akses ditolak: Soal dengan status "${question.status}" tidak dapat diedit langsung. Pembuat soal hanya dapat mengedit soal berstatus "draft" atau "direvisi".`,
      403
    );
  }

  return question;
}

/**
 * Helper pembungkus response API dengan penanganan AuthError terstandarisasi
 */
export function handleApiError(error: unknown) {
  console.error("API Error:", error);
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.statusCode,
      },
      { status: error.statusCode }
    );
  }

  const message = error instanceof Error ? error.message : "Terjadi kesalahan internal server.";
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 500,
    },
    { status: 500 }
  );
}
