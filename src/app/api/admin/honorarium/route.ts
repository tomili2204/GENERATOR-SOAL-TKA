import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import {
  users,
  userRoles,
  questions,
  questionPackages,
  validationLogs,
  honorariumRecords,
  auditLogs,
  User,
  UserRole,
  Question,
  QuestionPackage,
  ValidationLog,
  HonorariumRecord,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";
import { getTarifSettings } from "@/lib/tarif-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    await ensureTablesCreated();

    // 1. Ambil semua validator
    const allUsers: User[] = await db.select().from(users);
    const allRoles: UserRole[] = await db.select().from(userRoles);

    // Ambil semua soal dan log validasi
    const allQuestions: Question[] = await db.select().from(questions);
    const allPackages: QuestionPackage[] = await db.select().from(questionPackages);
    const allValidationLogs: ValidationLog[] = await db.select().from(validationLogs);
    const allHonorarium: HonorariumRecord[] = await db.select().from(honorariumRecords).orderBy(desc(honorariumRecords.createdAt));

    // Filter user: Hanya tampilkan validator dengan penugasan paket atau riwayat validasi nyata,
    // dan abaikan akun testing/dummy bawaan
    const validatorUsers = allUsers.filter((u: User) => {
      if (["validator@ayotka.id", "ganda@ayotka.id", "pembuat@ayotka.id", "didik@test.com"].includes(u.email)) {
        return false;
      }
      const userRolesList = allRoles.filter((r) => r.userId === u.id).map((r) => r.role);
      const hasValidatorRole = userRolesList.includes("validator_soal");
      const hasAssignedPackage = allPackages.some((p) => p.assignedValidatorId === u.id);
      const hasValidationAction = allQuestions.some((q) => q.validatorId === u.id) ||
        allValidationLogs.some((vl) => vl.validatorId === u.id);
      return (hasValidatorRole && (hasAssignedPackage || hasValidationAction)) || hasValidationAction;
    });

    const tarifSettings = await getTarifSettings();
    const isPerPaket = tarifSettings.validasi.skema === "per_paket";
    const TARIF_DEFAULT = tarifSettings.validasi.nominal;

    // 2. Susun data agregasi per validator
    const validatorReports = validatorUsers.map((val: User) => {
      const userRolesList = allRoles.filter((r) => r.userId === val.id).map((r) => r.role);

      // Soal yang divalidasi oleh user ini
      const validatedQuestions = allQuestions.filter((q) => q.validatorId === val.id);
      const disetujuiCount = validatedQuestions.filter((q) => q.status === "disetujui").length;
      const perluRevisiCount = validatedQuestions.filter(
        (q) => q.status === "perlu_revisi" || q.status === "direvisi"
      ).length;
      const ditolakCount = validatedQuestions.filter((q) => q.status === "ditolak").length;
      const totalSoal = validatedQuestions.length;

      // Paket yang divalidasi oleh user ini (ditugaskan atau memiliki soal yang divalidasi)
      const assignedPackages = allPackages.filter((p) => p.assignedValidatorId === val.id);
      const packagesWithValidatedQuestions = allPackages.filter((p) =>
        allQuestions.some((q) => q.paketId === p.id && q.validatorId === val.id)
      );

      // Gabungkan paket unik
      const uniquePackageIds = Array.from(
        new Set([...assignedPackages.map((p) => p.id), ...packagesWithValidatedQuestions.map((p) => p.id)])
      );
      const totalPaket = uniquePackageIds.length;
      const paketSiapRilisCount = allPackages.filter(
        (p) => uniquePackageIds.includes(p.id) && p.status === "siap_rilis"
      ).length;

      // Status Honorarium (HR)
      const userHrRecords = allHonorarium.filter((h) => h.userId === val.id);
      const latestHrRecord = userHrRecords[0] || null;

      const statusBayar = latestHrRecord ? latestHrRecord.statusBayar : "belum_dibayar";
      const tarif = latestHrRecord?.tarifPerItem || TARIF_DEFAULT;
      const totalNominal = latestHrRecord
        ? latestHrRecord.totalNominal
        : isPerPaket
        ? totalPaket * tarif
        : totalSoal * tarif;

      return {
        userId: val.id,
        name: val.name,
        email: val.email,
        instansi: val.instansi || null,
        roles: userRolesList,
        assignedJenjang: (val.assignedJenjang as string[]) || [],
        assignedMapel: (val.assignedMapel as string[]) || [],
        totalSoalDivalidasi: totalSoal,
        disetujuiCount,
        perluRevisiCount,
        ditolakCount,
        totalPaketDivalidasi: totalPaket,
        paketSiapRilisCount,
        tarifPerItem: tarif,
        estimasiNominal: totalNominal,
        statusBayar: statusBayar as "belum_dibayar" | "sudah_dibayar",
        tanggalBayar: latestHrRecord?.tanggalBayar ? latestHrRecord.tanggalBayar.toISOString() : null,
        catatanBayar: latestHrRecord?.catatanBayar || null,
        latestHrRecordId: latestHrRecord?.id || null,
        historyRecords: userHrRecords.map((hr) => ({
          id: hr.id,
          periode: hr.periode,
          totalSoal: hr.totalSoal,
          totalPaket: hr.totalPaket,
          tarifPerItem: hr.tarifPerItem,
          totalNominal: hr.totalNominal,
          statusBayar: hr.statusBayar,
          tanggalBayar: hr.tanggalBayar ? hr.tanggalBayar.toISOString() : null,
          catatanBayar: hr.catatanBayar,
          createdAt: hr.createdAt.toISOString(),
        })),
      };
    });

    // Ringkasan Global
    const totalSoalSemua = validatorReports.reduce((sum, v) => sum + v.totalSoalDivalidasi, 0);
    const totalPaketSemua = Array.from(
      new Set(allPackages.filter((p) => validatorReports.some((v) => p.assignedValidatorId === v.userId)).map((p) => p.id))
    ).length;
    const totalNominalSudahDibayar = validatorReports
      .filter((v) => v.statusBayar === "sudah_dibayar")
      .reduce((sum, v) => sum + v.estimasiNominal, 0);
    const totalNominalBelumDibayar = validatorReports
      .filter((v) => v.statusBayar === "belum_dibayar")
      .reduce((sum, v) => sum + v.estimasiNominal, 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalValidator: validatorReports.length,
        totalSoalDivalidasi: totalSoalSemua,
        totalPaketDivalidasi: totalPaketSemua,
        totalNominalSudahDibayar,
        totalNominalBelumDibayar,
      },
      tarifSettings,
      data: validatorReports,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireRole("admin");
    await ensureTablesCreated();

    const body = await req.json();
    const {
      userId,
      jenisTugas = "validasi_soal",
      periode = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      totalSoal = 0,
      totalPaket = 0,
      tarifPerItem = 25000,
      statusBayar = "sudah_dibayar",
      catatanBayar,
      tanggalBayar,
    } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "ID Validator (userId) wajib disertakan" },
        { status: 400 }
      );
    }

    const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (targetUser.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    let totalNominal = Number(totalSoal) * Number(tarifPerItem);
    if (body.totalNominal !== undefined && !isNaN(Number(body.totalNominal))) {
      totalNominal = Number(body.totalNominal);
    } else if (body.skema === "per_paket") {
      totalNominal = Number(totalPaket) * Number(tarifPerItem);
    }
    const recordId = `hr-${crypto.randomUUID()}`;

    // Simpan ke honorariumRecords
    await db.insert(honorariumRecords).values({
      id: recordId,
      userId,
      jenisTugas,
      periode,
      totalSoal: Number(totalSoal),
      totalPaket: Number(totalPaket),
      tarifPerItem: Number(tarifPerItem),
      totalNominal,
      statusBayar,
      tanggalBayar: statusBayar === "sudah_dibayar" ? (tanggalBayar ? new Date(tanggalBayar) : new Date()) : null,
      catatanBayar: catatanBayar?.trim() || null,
      diprosesOleh: adminUser.id,
    });

    // Catat ke log audit
    await db.insert(auditLogs).values({
      id: `audit-${crypto.randomUUID()}`,
      userId: adminUser.id,
      userEmail: adminUser.email,
      action: "HONORARIUM_UPDATE",
      targetResource: `honorarium:${userId}`,
      details: {
        recordId,
        validatorName: targetUser[0].name,
        totalSoal,
        totalPaket,
        totalNominal,
        statusBayar,
        catatanBayar,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Status Honorarium untuk ${targetUser[0].name} berhasil disimpan!`,
      data: {
        recordId,
        userId,
        statusBayar,
        totalNominal,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
