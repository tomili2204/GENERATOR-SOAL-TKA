import { requireRole } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import { questionPackages, questions, users, QuestionPackage, Question, User } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { calculatePackageStatus } from "@/lib/validations/package-blueprint";
import { SiapRilisView, type SiapRilisPackageItem } from "./SiapRilisView";
import { Rocket, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSiapRilisPage() {
  await requireRole("admin");
  await ensureTablesCreated();

  // Ambil semua paket soal
  const packagesList: QuestionPackage[] = await db
    .select()
    .from(questionPackages)
    .orderBy(desc(questionPackages.createdAt));

  // Ambil daftar users untuk mapping author & validator
  const allUsers: User[] = await db.select().from(users);
  const userMap = new Map(allUsers.map((u: User) => [u.id, u]));

  // Ambil seluruh pertanyaan untuk menghitung progres 30 butir
  const allQuestions: Question[] = await db.select().from(questions);

  const relevantPackages: SiapRilisPackageItem[] = [];

  for (const pkg of packagesList) {
    const pkgQuestions = allQuestions.filter((q: Question) => q.paketId === pkg.id);
    const calculation = calculatePackageStatus(pkgQuestions, pkg.status);

    // Sinkronisasi status di database jika ada perbedaan (misal baru tuntas 30/30)
    if (pkg.status !== calculation.status && pkg.status !== "diterbitkan") {
      await db
        .update(questionPackages)
        .set({ status: calculation.status, updatedAt: new Date() })
        .where(eq(questionPackages.id, pkg.id));
    }

    // Hanya ambil paket yang siap_rilis, diterbitkan, atau sudah 100% disetujui
    const isSiap = calculation.status === "siap_rilis" || calculation.percentageApproved === 100;
    const isDiterbitkan = pkg.status === "diterbitkan" || calculation.status === "diterbitkan";

    if (isSiap || isDiterbitkan) {
      const authorUser = pkg.authorId ? userMap.get(pkg.authorId) : null;
      const validatorUser = pkg.assignedValidatorId ? userMap.get(pkg.assignedValidatorId) : null;

      relevantPackages.push({
        id: pkg.id,
        code: pkg.code || pkg.id,
        nama: pkg.nama,
        jenjang: pkg.jenjang,
        mapel: pkg.mapel,
        tipeSumber: pkg.tipeSumber as "manual" | "ai",
        status: isDiterbitkan ? "diterbitkan" : "siap_rilis",
        author: authorUser
          ? {
              id: authorUser.id,
              name: authorUser.name,
              email: authorUser.email,
              instansi: authorUser.instansi || undefined,
            }
          : null,
        assignedValidator: validatorUser
          ? {
              id: validatorUser.id,
              name: validatorUser.name,
              email: validatorUser.email,
              instansi: validatorUser.instansi || undefined,
            }
          : null,
        createdAt: pkg.createdAt ? new Date(pkg.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: pkg.updatedAt ? new Date(pkg.updatedAt).toISOString() : null,
        progress: calculation,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
              <Rocket className="w-4 h-4" />
              <span>Manajemen Publikasi Asesmen</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Penerbitan & Rilis Paket Soal Siswa
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Daftar paket naskah tryout yang telah <strong>100% tuntas divalidasi</strong> oleh validator penelaah.
              Klik tombol <strong>Terbitkan</strong> pada paket yang diinginkan agar naskah asesmen resmi tayang dan dapat diakses siswa.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-right">
              <p className="text-[10px] font-mono text-indigo-400 uppercase font-semibold">Siap Ditayangkan</p>
              <p className="text-lg font-bold text-indigo-700 font-mono">
                {relevantPackages.filter((p) => p.status === "siap_rilis").length} Paket
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Siap Rilis View */}
      <SiapRilisView initialPackages={relevantPackages} />
    </div>
  );
}
