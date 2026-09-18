import { requireRole } from "@/lib/auth/guards";
import { FileQuestion, Plus } from "lucide-react";
import { db } from "@/db";
import { questions, Question } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { PembuatMySoalView } from "@/components/pembuat/PembuatMySoalView";

export const dynamic = "force-dynamic";

export default async function PembuatMySoalPage() {
  const user = await requireRole("pembuat_soal", "admin");

  const myQuestions: Question[] = await db
    .select()
    .from(questions)
    .where(eq(questions.authorId, user.id))
    .orderBy(desc(questions.createdAt));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Utilitarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              MODUL PEMBUAT SOAL
            </span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-medium text-slate-500">Koleksi Saya</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-indigo-600" />
            Soal Milik Saya & Status Validasi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar butir soal yang diunggah oleh akun Anda. Soal berstatus <strong className="text-slate-700">draft</strong> atau <strong className="text-slate-700">direvisi</strong> dapat diedit ulang untuk diajukan kembali ke antrean telaah.
          </p>
        </div>

        <Link
          href="/pembuat/upload"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Unggah Soal Baru</span>
        </Link>
      </div>

      {/* Tabel Koleksi dengan Filter & TablePagination */}
      <PembuatMySoalView questions={myQuestions} userEmail={user.email} />
    </div>
  );
}
