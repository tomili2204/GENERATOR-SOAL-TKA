import { requireRole } from "@/lib/auth/guards";
import { ManualQuestionForm } from "@/components/pembuat/ManualQuestionForm";
import { UploadCloud, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PembuatUploadPage() {
  const user = await requireRole("pembuat_soal", "admin");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Utilitarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              MODUL PEMBUAT SOAL
            </span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-medium text-slate-500">Unggah Manual</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-600" />
            Entri & Unggah Butir Soal Baru
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Susun butir soal TKA terstandarisasi dengan validasi taksonomi, rumus KaTeX real-time, dan keterkaitan stimulus.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Akun: <strong className="font-mono text-slate-800">{user.email}</strong></span>
        </div>
      </div>

      {/* Komponen Form Utama */}
      <ManualQuestionForm />
    </div>
  );
}
