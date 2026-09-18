import { requireRole } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import { questionPackages, questions, users, QuestionPackage, Question, User } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { calculatePackageStatus } from "@/lib/validations/package-blueprint";
import { PackageAssignmentView, type PackageAdminItem } from "./PackageAssignmentView";
import { UserCheck, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPackageAssignmentPage() {
  await requireRole("admin");
  await ensureTablesCreated();

  // Ambil seluruh paket soal
  const packagesList: QuestionPackage[] = await db
    .select()
    .from(questionPackages)
    .orderBy(desc(questionPackages.createdAt));

  // Ambil daftar user untuk mapping author & validator
  const allUsers: User[] = await db.select().from(users);
  const userMap = new Map(allUsers.map((u: User) => [u.id, u]));

  // Ambil pertanyaan & kalkulasi progres tiap paket
  const allQuestions: Question[] = await db.select().from(questions);

  const enrichedPackages: PackageAdminItem[] = packagesList.map((pkg: QuestionPackage) => {
    const pkgQuestions = allQuestions.filter((q: Question) => q.paketId === pkg.id);
    const calculation = calculatePackageStatus(pkgQuestions);

    const authorUser = pkg.authorId ? userMap.get(pkg.authorId) : null;
    const validatorUser = pkg.assignedValidatorId ? userMap.get(pkg.assignedValidatorId) : null;

    return {
      id: pkg.id,
      code: pkg.code || pkg.id,
      nama: pkg.nama,
      jenjang: pkg.jenjang,
      mapel: pkg.mapel,
      tipeSumber: pkg.tipeSumber as "manual" | "ai",
      status: pkg.status,
      authorId: pkg.authorId,
      author: authorUser
        ? {
            id: authorUser.id,
            name: authorUser.name,
            email: authorUser.email,
            instansi: authorUser.instansi || undefined,
          }
        : null,
      assignedValidatorId: pkg.assignedValidatorId,
      assignedValidator: validatorUser
        ? {
            id: validatorUser.id,
            name: validatorUser.name,
            email: validatorUser.email,
            instansi: validatorUser.instansi || undefined,
          }
        : null,
      assignedAt: pkg.assignedAt ? new Date(pkg.assignedAt).toISOString() : null,
      createdAt: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : new Date().toISOString(),
      progress: calculation,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Manajemen Alur Kerja & Validasi Asesmen</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Penugasan Validator Paket Soal
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Tugaskan validator profesional untuk memeriksa dan menelaah paket naskah tryout (target 30 slot butir soal).
              Sistem secara otomatis menerapkan kebijakan <strong>Separation of Duties</strong> untuk mencegah penelaahan mandiri.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
              <p className="text-[10px] font-mono text-slate-400 uppercase">Kebijakan Sistem</p>
              <p className="text-xs font-bold text-indigo-700 font-mono">SoD Enforcement Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Table View with Pagination & Modal */}
      <PackageAssignmentView initialPackages={enrichedPackages} />
    </div>
  );
}
