import { requireRole } from "@/lib/auth/guards";
import { ensureTablesCreated } from "@/db";
import { getTarifSettings } from "@/lib/tarif-settings";
import { TarifSettingsForm } from "@/components/admin/TarifSettingsForm";
import Link from "next/link";
import { Wallet, ArrowLeft, Coins, CheckCircle2, ShieldCheck, FileEdit } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTarifPage() {
  await requireRole("admin");
  await ensureTablesCreated();

  const currentSettings = await getTarifSettings();

  return (
    <div className="space-y-6">
      {/* Top Banner & Navigation */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
              <Coins className="w-4 h-4" />
              <span>Manajemen Keuangan & Kebijakan Tarif</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Besaran Biaya Pembuatan & Validasi Soal
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Atur besaran honorarium pembuatan naskah soal dan penelaahan validasi soal.
              Admin dapat memilih skema penetapan tarif per butir soal atau per paket soal secara terpisah.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/honorarium"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Buka Laporan Honorarium</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <TarifSettingsForm initialSettings={currentSettings} />
    </div>
  );
}
