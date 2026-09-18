import { requireRole } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import {
  users,
  userRoles,
  questions,
  questionPackages,
  validationLogs,
  honorariumRecords,
  User,
  UserRole,
  Question,
  QuestionPackage,
  ValidationLog,
  HonorariumRecord,
} from "@/db/schema";
import { desc } from "drizzle-orm";
import { HonorariumReportView, ValidatorReportItem } from "./HonorariumReportView";
import { Wallet, ShieldCheck, FileSpreadsheet, Coins } from "lucide-react";
import { getTarifSettings } from "@/lib/tarif-settings";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminHonorariumPage() {
  await requireRole("admin");
  await ensureTablesCreated();

  // 1. Ambil data dari database
  const allUsers: User[] = await db.select().from(users);
  const allRoles: UserRole[] = await db.select().from(userRoles);
  const allQuestions: Question[] = await db.select().from(questions);
  const allPackages: QuestionPackage[] = await db.select().from(questionPackages);
  const allValidationLogs: ValidationLog[] = await db.select().from(validationLogs);
  const allHonorarium: HonorariumRecord[] = await db
    .select()
    .from(honorariumRecords)
    .orderBy(desc(honorariumRecords.createdAt));

  // Ambil konfigurasi tarif terkini
  const tarifSettings = await getTarifSettings();
  const isPerPaket = tarifSettings.validasi.skema === "per_paket";
  const TARIF_DEFAULT = tarifSettings.validasi.nominal;

  // 2. Filter user: Hanya tampilkan validator dengan penugasan paket atau riwayat validasi nyata,
  // dan abaikan akun testing/dummy bawaan
  const validatorUsers = allUsers.filter((u: User) => {
    if (["validator@ayotka.id", "ganda@ayotka.id", "pembuat@ayotka.id", "didik@test.com"].includes(u.email)) {
      return false;
    }
    const userRolesList = allRoles.filter((r) => r.userId === u.id).map((r) => r.role);
    const hasValidatorRole = userRolesList.includes("validator_soal");
    const hasAssignedPackage = allPackages.some((p) => p.assignedValidatorId === u.id);
    const hasValidationAction =
      allQuestions.some((q) => q.validatorId === u.id) ||
      allValidationLogs.some((vl) => vl.validatorId === u.id);
    return (hasValidatorRole && (hasAssignedPackage || hasValidationAction)) || hasValidationAction;
  });

  // 3. Susun data agregasi
  const validatorReports: ValidatorReportItem[] = validatorUsers.map((val: User) => {
    const userRolesList = allRoles.filter((r) => r.userId === val.id).map((r) => r.role);

    const validatedQuestions = allQuestions.filter((q) => q.validatorId === val.id);
    const disetujuiCount = validatedQuestions.filter((q) => q.status === "disetujui").length;
    const perluRevisiCount = validatedQuestions.filter(
      (q) => q.status === "perlu_revisi" || q.status === "direvisi"
    ).length;
    const ditolakCount = validatedQuestions.filter((q) => q.status === "ditolak").length;
    const totalSoal = validatedQuestions.length;

    const assignedPackages = allPackages.filter((p) => p.assignedValidatorId === val.id);
    const packagesWithValidatedQuestions = allPackages.filter((p) =>
      allQuestions.some((q) => q.paketId === p.id && q.validatorId === val.id)
    );

    const uniquePackageIds = Array.from(
      new Set([...assignedPackages.map((p) => p.id), ...packagesWithValidatedQuestions.map((p) => p.id)])
    );
    const totalPaket = uniquePackageIds.length;
    const paketSiapRilisCount = allPackages.filter(
      (p) => uniquePackageIds.includes(p.id) && p.status === "siap_rilis"
    ).length;

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

  const summary = {
    totalValidator: validatorReports.length,
    totalSoalDivalidasi: totalSoalSemua,
    totalPaketDivalidasi: totalPaketSemua,
    totalNominalSudahDibayar,
    totalNominalBelumDibayar,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
              <Wallet className="w-4 h-4" />
              <span>Pusat Akuntabilitas & Verifikasi Keuangan</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Laporan Validasi Soal & Pembayaran Honorarium (HR)
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Monitoring jumlah soal dan paket yang telah divalidasi oleh masing-masing pengguna (validator),
              beserta status pencairan dan pencatatan nomor referensi pembayaran honorarium.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
              <p className="text-[10px] font-mono text-slate-400 uppercase">Tarif Acuan Validasi</p>
              <p className="text-xs font-bold text-emerald-700 font-mono">
                Rp {tarifSettings.validasi.nominal.toLocaleString("id-ID")}{" "}
                <span className="text-[11px] font-normal text-slate-500">
                  {isPerPaket ? "/ Paket" : "/ Soal"}
                </span>
              </p>
            </div>

            <Link
              href="/admin/tarif"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Atur Besaran Biaya</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Report View */}
      <HonorariumReportView
        initialData={validatorReports}
        initialSummary={summary}
        initialTarifSettings={tarifSettings}
      />
    </div>
  );
}
