import { requireRole } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import { users, userRoles, User, UserRole } from "@/db/schema";
import { desc } from "drizzle-orm";
import { UserManagementView, UserItem } from "./UserManagementView";
import { ShieldCheck, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireRole("admin");
  await ensureTablesCreated();

  const allUsers: User[] = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));

  const allRoles: UserRole[] = await db.select().from(userRoles);

  const formattedUsers: UserItem[] = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    instansi: u.instansi,
    isActive: u.isActive,
    assignedJenjang: (u.assignedJenjang as string[]) || [],
    assignedMapel: (u.assignedMapel as string[]) || [],
    roles: allRoles.filter((r) => r.userId === u.id).map((r) => r.role),
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Pusat Kendali Tim Internal AyoTKA</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Manajemen Pengguna, Peran & Penugasan
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Atur hak akses akun tim AyoTKA (Pembuat Soal, Validator Soal, atau Keduanya),
              lengkapi asal instansi sekolah/lembaga, serta tetapkan cakupan jenjang (SD, SMP, SMA, SMK)
              dan mata pelajaran (Matematika & Bahasa Indonesia).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-right">
              <p className="text-[10px] font-mono text-slate-400 uppercase">Peran Berlaku</p>
              <p className="text-xs font-bold text-indigo-700 font-mono">Multi-Role & SoD Enabled</p>
            </div>
          </div>
        </div>

        {/* Informational Policy Box */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            Akun yang memegang peran ganda (<strong>Keduanya: Pembuat Soal & Validator</strong>) tetap
            tunduk pada <em>Separation of Duties</em>. Sistem secara otomatis melarang seorang validator
            menelaah soal yang dibuat oleh dirinya sendiri.
          </p>
        </div>
      </div>

      {/* Interactive User Management View with Table, Pagination & Modals */}
      <UserManagementView initialUsers={formattedUsers} />
    </div>
  );
}
