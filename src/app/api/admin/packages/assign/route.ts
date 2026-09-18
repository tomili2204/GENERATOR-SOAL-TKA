import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import { questionPackages, users, userRoles, auditLogs, UserRole } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireRole("admin");
    await ensureTablesCreated();

    const body = await req.json();
    const { packageId, validatorId } = body;

    if (!packageId) {
      return NextResponse.json(
        { success: false, error: "ID paket soal wajib disertakan" },
        { status: 400 }
      );
    }

    // Ambil paket soal
    const pkgs = await db
      .select()
      .from(questionPackages)
      .where(eq(questionPackages.id, packageId))
      .limit(1);

    if (pkgs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Paket soal tidak ditemukan" },
        { status: 404 }
      );
    }

    const pkg = pkgs[0];

    // Jika validatorId dikosongkan (unassign)
    if (!validatorId) {
      await db
        .update(questionPackages)
        .set({
          assignedValidatorId: null,
          assignedAt: null,
          assignedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(questionPackages.id, packageId));

      await db.insert(auditLogs).values({
        id: `audit-${crypto.randomUUID()}`,
        userId: adminUser.id,
        userEmail: adminUser.email,
        action: "PACKAGE_UNASSIGN_VALIDATOR",
        targetResource: `package:${packageId}`,
        details: { packageCode: pkg.code, previousValidator: pkg.assignedValidatorId },
      });

      return NextResponse.json({
        success: true,
        message: "Penugasan validator berhasil dibatalkan",
      });
    }

    // Validasi pengguna validator yang dipilih
    const targetValidators = await db
      .select()
      .from(users)
      .where(eq(users.id, validatorId))
      .limit(1);

    if (targetValidators.length === 0) {
      return NextResponse.json(
        { success: false, error: "Validator yang dipilih tidak ditemukan" },
        { status: 404 }
      );
    }

    const validator = targetValidators[0];

    // PENEGAKAN KEBIJAKAN SEPARATION OF DUTIES (Pemisahan Tugas)
    // Validator TIDAK BOLEH merupakan pembuat (author) dari paket soal tersebut!
    if (pkg.authorId && pkg.authorId === validator.id) {
      return NextResponse.json(
        {
          success: false,
          error: `Pelanggaran Pemisahan Tugas: ${validator.name} adalah pembuat paket ini dan dilarang menjadi validator paketnya sendiri.`,
        },
        { status: 403 }
      );
    }

    // Periksa apakah user benar-benar memiliki peran validator_soal
    const roles: UserRole[] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, validator.id));

    const isValidator = roles.some((r: UserRole) => r.role === "validator_soal");
    if (!isValidator) {
      return NextResponse.json(
        {
          success: false,
          error: `Pengguna ${validator.name} tidak memiliki peran sebagai Validator Soal.`,
        },
        { status: 400 }
      );
    }

    // Update paket soal dengan validator yang ditugaskan
    await db
      .update(questionPackages)
      .set({
        assignedValidatorId: validator.id,
        assignedAt: new Date(),
        assignedBy: adminUser.id,
        updatedAt: new Date(),
      })
      .where(eq(questionPackages.id, packageId));

    // Catat ke log audit
    await db.insert(auditLogs).values({
      id: `audit-${crypto.randomUUID()}`,
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: "PACKAGE_ASSIGN_VALIDATOR",
      targetResource: `package:${packageId}`,
      details: {
        packageCode: pkg.code,
        assignedValidatorId: validator.id,
        assignedValidatorName: validator.name,
        assignedValidatorEmail: validator.email,
        instansi: validator.instansi,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Paket ${pkg.code} berhasil ditugaskan kepada validator ${validator.name}`,
      data: {
        packageId,
        assignedValidatorId: validator.id,
        assignedValidatorName: validator.name,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
