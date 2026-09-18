import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/db";
import { questions, users, generatorConfigs, auditLogs, questionPackages, Question, AuditLog } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { StatCard } from "@/components/ui/StatCard";
import { RoleBadge, StatusBadge } from "@/components/ui/Badge";
import { hasRole } from "@/lib/auth/guards";
import Link from "next/link";
import {
  FileQuestion,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Cpu,
  ShieldCheck,
  ArrowRight,
  UploadCloud,
  CheckSquare,
  AlertCircle,
  FileSpreadsheet,
  UserCheck,
  Wallet,
  Coins,
} from "lucide-react";
import { BankSoalTableWithPaging } from "@/components/dashboard/BankSoalTableWithPaging";
import { AdminStatisticsOverview } from "@/components/admin/AdminStatisticsOverview";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const isAdmin = hasRole(user, "admin");
  const isPembuat = hasRole(user, "pembuat_soal");
  const isValidator = hasRole(user, "validator_soal");

  // Ambil metrik ringkasan dari basis data secara efisien
  const allQuestions: Question[] = await db.select().from(questions);
  const allPackages = await db.select().from(questionPackages).orderBy(desc(questionPackages.createdAt));
  const allUsersList = await db.select({ id: users.id, name: users.name }).from(users);
  const usersMap: Record<string, string> = Object.fromEntries(
    allUsersList.map((u: { id: string; name: string }) => [u.id, u.name])
  );
  const myQuestions = allQuestions.filter((q) => q.authorId === user.id);
  const queueQuestions = allQuestions.filter((q) => q.status === "menunggu_validasi");
  const canReviewQueue = queueQuestions.filter((q) => q.authorId !== user.id);
  const selfAuthoredQueue = queueQuestions.filter((q) => q.authorId === user.id);

  // Metrik khusus tugas validator (berdasarkan penugasan paket)
  let validatorAssignedPkgs: any[] = [];
  let validatorAssignedQuestions: Question[] = [];
  let validatorWaiting: Question[] = [];
  let validatorApproved: Question[] = [];
  let validatorRevised: Question[] = [];
  let validatorCanReview: Question[] = [];
  let validatorSelfAuthored: Question[] = [];

  if (isValidator) {
    if (isAdmin) {
      validatorAssignedQuestions = allQuestions;
      validatorWaiting = queueQuestions;
      validatorApproved = allQuestions.filter((q) => q.status === "disetujui");
      validatorRevised = allQuestions.filter(
        (q) => q.status === "direvisi" || q.status === "perlu_revisi"
      );
      validatorCanReview = canReviewQueue;
      validatorSelfAuthored = selfAuthoredQueue;
    } else {
      validatorAssignedPkgs = await db
        .select()
        .from(questionPackages)
        .where(eq(questionPackages.assignedValidatorId, user.id));
      const assignedPkgIds = new Set(validatorAssignedPkgs.map((p: any) => p.id));

      validatorAssignedQuestions = allQuestions.filter(
        (q) => q.paketId && assignedPkgIds.has(q.paketId)
      );
      validatorWaiting = validatorAssignedQuestions.filter(
        (q) => q.status === "menunggu_validasi"
      );
      validatorApproved = validatorAssignedQuestions.filter(
        (q) => q.status === "disetujui"
      );
      validatorRevised = validatorAssignedQuestions.filter(
        (q) => q.status === "direvisi" || q.status === "perlu_revisi"
      );
      validatorCanReview = validatorWaiting.filter((q) => q.authorId !== user.id);
      validatorSelfAuthored = validatorWaiting.filter((q) => q.authorId === user.id);
    }
  }

  const totalUsers: any[] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const activeGenerators: any[] = await db
    .select({ count: sql<number>`count(*)` })
    .from(generatorConfigs)
    .where(eq(generatorConfigs.isAutoActive, true));

  const recentLogs: AuditLog[] = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(5);

  return (
    <div className="space-y-8">
      {/* Welcome Banner Utilitarian */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-indigo-600 font-semibold">
                Selamat Datang di Panel Kerja Tim AyoTKA
              </span>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-xs text-slate-500">soal.ayotka.id</span>
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Halo, {user.name}
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Anda masuk dengan email <strong className="font-mono text-slate-800">{user.email}</strong>.
              Menu dan kapabilitas di sidebar kiri telah disesuaikan secara otomatis dengan izin peran Anda.
            </p>
          </div>

          {/* Role Status Tag */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2 min-w-[240px]">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500">
              Peran Terdaftar ({user.roles.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {user.roles.map((r) => (
                <RoleBadge key={r} role={r} />
              ))}
            </div>
          </div>
        </div>

        {/* Separation of Duties Rule Info Banner */}
        <div className="mt-6 p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3.5">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-indigo-950">
              Penegakan Kebijakan Pemisahan Tugas (Separation of Duties):
            </span>
            <p className="text-indigo-900/80 leading-relaxed">
              Sistem secara ketat menerapkan aturan: seorang validator <strong>tidak dapat menyetujui, menolak, atau merevisi soal yang diunggah oleh dirinya sendiri</strong>.
              Aturan ini diverifikasi langsung pada level backend guard (`assertCanValidateQuestion`) dengan status HTTP 403 Forbidden.
            </p>
          </div>
        </div>
      </div>

      {/* Widget Metrik Sesuai Peran */}
      <div className="space-y-6">
        {/* Metrik Khusus Validator Soal (Jika Memiliki Peran Validator dan Bukan Admin) */}
        {isValidator && !isAdmin && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-600 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>
                  Metrik Tugas Validator ({validatorAssignedPkgs.length > 0 ? validatorAssignedPkgs.map((p: any) => p.code).join(", ") : "Paket Tugas"})
                </span>
              </h2>
              <span className="text-xs font-mono text-slate-400">Pembaruan Real-Time</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Antrean Validasi"
                value={validatorWaiting.length}
                description="Butir soal menunggu keputusan telaah Anda"
                icon={Clock}
                badgeText={`${validatorCanReview.length} siap ditelaah`}
                badgeVariant="amber"
              />
              <StatCard
                title="Soal Disetujui"
                value={validatorApproved.length}
                description="Telah disetujui pada paket tugas Anda"
                icon={CheckCircle2}
                badgeText="Resmi Terverifikasi"
                badgeVariant="emerald"
              />
              <StatCard
                title="Perlu Revisi"
                value={validatorRevised.length}
                description="Memerlukan perbaikan dari pembuat soal"
                icon={AlertTriangle}
                badgeText={validatorRevised.length > 0 ? "Tindakan Diperlukan" : "Tidak Ada"}
                badgeVariant={validatorRevised.length > 0 ? "amber" : "slate"}
              />
              <StatCard
                title="Total Soal Paket Tugas"
                value={validatorAssignedQuestions.length}
                description={`Terbagi dalam ${validatorAssignedPkgs.length} paket tugas resmi`}
                icon={FileQuestion}
                badgeText={validatorAssignedPkgs[0]?.code || "Paket Tugas"}
                badgeVariant="indigo"
              />
            </div>

            {validatorSelfAuthored.length > 0 && (
              <div className="mt-2">
                <StatCard
                  title="Soal Buatan Sendiri dalam Antrean"
                  value={validatorSelfAuthored.length}
                  description="Dilarang divalidasi oleh Anda (Kebijakan Pemisahan Tugas)"
                  icon={AlertCircle}
                  badgeText="Pemisahan Tugas Aktif"
                  badgeVariant="amber"
                />
              </div>
            )}
          </div>
        )}

        {/* Metrik Pembuat Soal:
            - Ditampilkan sebagai metrik utama jika BUKAN validator
            - Jika juga merangkap validator, hanya ditampilkan jika user memiliki riwayat unggahan soal (myQuestions.length > 0) */}
        {isPembuat && (!isValidator || myQuestions.length > 0) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-600 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-violet-600" />
                <span>Karya Soal Saya (Pembuat Soal)</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">Total {myQuestions.length} butir diunggah</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Soal Saya (Menunggu)"
                value={myQuestions.filter((q) => q.status === "menunggu_validasi").length}
                description="Sedang di antrean telaah validator"
                icon={Clock}
                badgeText="Status: Antrean"
                badgeVariant="amber"
              />
              <StatCard
                title="Soal Saya (Disetujui)"
                value={myQuestions.filter((q) => q.status === "disetujui").length}
                description="Siap masuk paket asesmen tryout"
                icon={CheckCircle2}
                badgeText="Resmi Terverifikasi"
                badgeVariant="emerald"
              />
              <StatCard
                title="Soal Saya (Perlu Revisi)"
                value={myQuestions.filter((q) => q.status === "direvisi" || q.status === "perlu_revisi").length}
                description="Memerlukan perbaikan stimulus/opsi"
                icon={AlertTriangle}
                badgeText="Tindakan Diperlukan"
                badgeVariant="amber"
              />
              <StatCard
                title="Total Karya Soal"
                value={myQuestions.length}
                description="Seluruh butir yang Anda unggah"
                icon={FileQuestion}
                badgeText="Karya Mandiri"
                badgeVariant="indigo"
              />
            </div>
          </div>
        )}

        {/* Metrik Administrator */}
        {isAdmin && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-600 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Ringkasan Global Sistem (Administrator)</span>
              </h2>
              <span className="text-xs font-mono text-slate-400">Pembaruan Real-Time</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Bank Soal"
                value={allQuestions.length}
                description="Seluruh soal lintas jenjang & status"
                icon={FileQuestion}
                badgeText="Bank Data Utama"
                badgeVariant="indigo"
              />
              <StatCard
                title="Antrean Validasi Sistem"
                value={queueQuestions.length}
                description="Total butir menunggu telaah tim"
                icon={CheckSquare}
                badgeText={`${canReviewQueue.length} dapat ditelaah`}
                badgeVariant="amber"
              />
              <StatCard
                title="Soal Terverifikasi"
                value={allQuestions.filter((q) => q.status === "disetujui").length}
                description="Telah disetujui & siap tryout"
                icon={CheckCircle2}
                badgeText="Lolos Uji Kualitas"
                badgeVariant="emerald"
              />
              <StatCard
                title="Generator Otomatis Aktif"
                value={`${activeGenerators[0]?.count ?? 0} dari 4`}
                description="SD & SMP Matematika / B.Indo"
                icon={Cpu}
                badgeText="Pipeline AI"
                badgeVariant="violet"
              />
            </div>

            {/* Dasbor Statistik Menyeluruh (Live Direct Query) */}
            <AdminStatisticsOverview
              questions={allQuestions}
              packages={allPackages}
              lastFetchedAt={new Date().toISOString()}
            />
          </div>
        )}
      </div>

      {/* Akses Cepat / Modul Panel Sesuai Peran */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Modul Pembuat Soal */}
        {isPembuat && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-violet-50 text-violet-700 border border-violet-100">
                  <UploadCloud className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Area Pembuat Soal</h3>
                  <p className="text-xs text-slate-500 font-mono">Unggah & Pantau Soal Mandiri</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-2">
                Kelola butir soal TKA jenjang SD/SMP untuk materi Bahasa Indonesia dan Matematika.
                Pantau status validasi dan catatan masukan dari validator secara transparan.
              </p>
            </div>
            <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-3">
              <Link
                href="/pembuat/upload"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors shadow-sm"
              >
                <span>Unggah Soal Manual</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/pembuat/my-soal"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <span>Lihat Soal Milik Saya ({myQuestions.length})</span>
              </Link>
            </div>
          </div>
        )}

        {/* Modul Validator Soal */}
        {isValidator && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <CheckSquare className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Area Validator Soal</h3>
                  <p className="text-xs text-slate-500 font-mono">Antrean Telaah & Keputusan Validasi</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-2">
                Periksa butir soal yang masuk, pastikan kesesuaian dengan kisi-kisi resmi Kemendikdasmen,
                kualitas stimulus, kunci jawaban, dan distribusi pengecoh.
              </p>
            </div>
            <div className="pt-5 mt-5 border-t border-slate-100 flex items-center gap-3">
              <Link
                href="/validator/antrean"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <span>Buka Antrean Validasi ({isAdmin ? queueQuestions.length : validatorWaiting.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/validator/riwayat"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <span>Riwayat Telaah Saya</span>
              </Link>
            </div>
          </div>
        )}

        {/* Modul Administrator */}
        {isAdmin && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between md:col-span-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pusat Kendali Administrator</h3>
                  <p className="text-xs text-slate-500 font-mono">Manajemen Sistem & Konfigurasi Global</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-2">
                Kelola akun tim dan penetapan peran, aktifkan/nonaktifkan generator otomatis per jenjang + mapel,
                kelola daftar taksonomi nilai tetap (elemen materi TKA), dan pantau seluruh jejak audit log.
              </p>
            </div>
            <div className="pt-5 mt-5 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Pengguna & Peran</span>
              </Link>
              <Link
                href="/admin/generator"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Toggle Generator</span>
              </Link>
              <Link
                href="/admin/taxonomy"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <span>Nilai Tetap (Elemen)</span>
              </Link>
              <Link
                href="/admin/all-soal"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <span>Semua Soal ({allQuestions.length})</span>
              </Link>
              <Link
                href="/admin/penugasan"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Penugasan Validator</span>
              </Link>
              <Link
                href="/admin/tarif"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <Coins className="w-3.5 h-3.5 text-indigo-600" />
                <span>Besaran Biaya (Tarif)</span>
              </Link>
              <Link
                href="/admin/honorarium"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Laporan Validasi & HR</span>
              </Link>
              <Link
                href="/admin/audit-log"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                <span>Log Audit</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Tabel Contoh Data Soal Fondasi dengan Paginasi Dinamis (10, 20, 30, 50, 100) */}
      <BankSoalTableWithPaging
        questions={allQuestions}
        currentUserId={user.id}
        currentUserName={user.name}
        usersMap={usersMap}
      />
    </div>
  );
}
