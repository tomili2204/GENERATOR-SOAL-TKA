import { requireRole } from "@/lib/auth/guards";
import { History, Shield } from "lucide-react";
import { db } from "@/db";
import { validationLogs, questions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ValidatorRiwayatView } from "@/components/validator/ValidatorRiwayatView";

export const dynamic = "force-dynamic";

export default async function ValidatorRiwayatPage() {
  const user = await requireRole("validator_soal", "admin");

  // Ambil catatan riwayat dari tabel append-only validation_logs
  const historyRecords: any[] = await db
    .select({
      id: validationLogs.id,
      questionId: validationLogs.questionId,
      questionCode: validationLogs.questionCode,
      action: validationLogs.action,
      previousStatus: validationLogs.previousStatus,
      newStatus: validationLogs.newStatus,
      notes: validationLogs.notes,
      createdAt: validationLogs.createdAt,
      jenjang: questions.jenjang,
      mapel: questions.mapel,
      elemen: questions.elemen,
      bentukSoal: questions.bentukSoal,
      sumber: questions.sumber,
    })
    .from(validationLogs)
    .leftJoin(questions, eq(validationLogs.questionId, questions.id))
    .where(eq(validationLogs.validatorId, user.id))
    .orderBy(desc(validationLogs.createdAt));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Utilitarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              MODUL VALIDATOR SOAL
            </span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-medium text-slate-500">Riwayat Validasi</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Riwayat Validasi Saya (Append-Only Log)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log permanen keputusan telaah yang telah Anda berikan (Setujui, Minta Revisi, atau Tolak). Tercatat secara tidak dapat diubah (append-only) untuk integritas audit platform.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600">
          <Shield className="w-3.5 h-3.5 text-indigo-600" />
          <span>Validator: <strong className="font-mono text-slate-800">{user.email}</strong></span>
        </div>
      </div>

      {/* Tabel Riwayat dengan Filter & TablePagination */}
      <ValidatorRiwayatView records={historyRecords} validatorEmail={user.email} />
    </div>
  );
}
