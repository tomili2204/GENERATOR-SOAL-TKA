"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  BookOpen,
  HelpCircle,
  Sparkles,
  Info,
  Layers,
  FileText,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { LatexPreview } from "@/components/ui/LatexPreview";

interface QuestionReviewModalProps {
  question: any;
  currentUserId: string;
  onClose: () => void;
  onReviewSubmit: (questionId: string, decision: "disetujui" | "ditolak" | "direvisi", notes?: string) => Promise<void>;
}

export function QuestionReviewModal({
  question,
  currentUserId,
  onClose,
  onReviewSubmit,
}: QuestionReviewModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<"none" | "setujui" | "tolak" | "revisi">("none");
  const [actionNotes, setActionNotes] = useState("");
  const [actionError, setActionError] = useState("");

  const isSelf = question.authorId === currentUserId;
  const payload = question.payload || {};

  const handleAction = async (decision: "disetujui" | "ditolak" | "direvisi") => {
    setActionError("");

    // Validasi input catatan untuk tolak dan revisi
    if (decision === "ditolak" && !actionNotes.trim()) {
      setActionError("Alasan penolakan wajib diisi.");
      return;
    }
    if (decision === "direvisi" && !actionNotes.trim()) {
      setActionError("Catatan perbaikan teknis untuk pembuat soal wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      await onReviewSubmit(question.id, decision, actionNotes.trim());
      onClose();
    } catch (err: any) {
      setActionError(err.message || "Gagal memproses validasi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-900">{question.code}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
                  {question.bentukSoal || "PG"}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                  {question.sumber === "ai_generated" ? "AI Generated" : "Manual Upload"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {question.jenjang} · {question.mapel} · Elemen: <strong>{question.elemen}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Isi Review (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Banner Pemisahan Tugas Jika Soal Sendiri */}
          {isSelf && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-rose-900 block">
                  Pemisahan Tugas (Separation of Duties): Aksi Validasi Dinonaktifkan
                </strong>
                <p className="text-[11.5px] mt-0.5 text-rose-700 leading-relaxed">
                  Anda adalah pengunggah (author) dari butir soal ini. Sesuai prinsip integritas asesmen, validator dilarang menelaah, menyetujui, atau menolak butir soal ciptaannya sendiri. Tombol aksi telah dinonaktifkan dan API backend akan menolak segala upaya validasi.
                </p>
              </div>
            </div>
          )}

          {/* Rincian Taksonomi & Kisi-Kisi */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Sub Elemen
              </span>
              <span className="font-medium text-slate-800">{question.subElemen || "–"}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Level Kognitif
              </span>
              <span className="font-medium text-slate-800">{question.levelKognitif || "–"}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Tingkat Kesulitan
              </span>
              <span className="font-medium text-slate-800 capitalize">{question.tingkatKesulitan || "–"}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Pengunggah
              </span>
              <span className="font-medium text-slate-800 text-xs">
                {question.authorName || question.author?.name || "–"}
              </span>
            </div>
          </div>

          {/* Stimulus Grup Lengkap (Jika Soal Bertipe Grup) */}
          {question.stimulus && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <BookOpen className="w-4 h-4 text-amber-700" />
                  <span>Stimulus Bacaan / Data Grup: {question.stimulus.judul}</span>
                </div>
                <span className="text-[11px] font-mono text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                  Tipe: {question.stimulus.tipe} · {question.stimulus.jumlahKata || 0} kata
                </span>
              </div>
              <div className="bg-white border border-amber-200/60 rounded-lg p-3 text-xs">
                <LatexPreview content={question.stimulus.konten} />
              </div>
            </div>
          )}

          {/* RENDER AKHIR TEKS SOAL (KaTeX) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Butir Soal (Render KaTeX):</span>
            </h4>
            <div className="p-4 bg-white border border-slate-200 rounded-xl text-slate-900 shadow-2xs">
              <LatexPreview content={payload.soal_text || "_Tidak ada teks soal._"} />
            </div>
          </div>

          {/* Gambar Ilustrasi (Jika Ada) */}
          {payload.gambar && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Ilustrasi / Gambar Pendukung:
              </span>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                {payload.gambar.tipe === "url" && payload.gambar.url && (
                  <img
                    src={payload.gambar.url}
                    alt={payload.gambar.deskripsi_alt || "Gambar Soal"}
                    className="max-h-48 mx-auto rounded object-contain border border-slate-200"
                  />
                )}
                {payload.gambar.tipe === "svg" && payload.gambar.svg_content && (
                  <div
                    className="max-h-48 overflow-auto mx-auto inline-block"
                    dangerouslySetInnerHTML={{ __html: payload.gambar.svg_content }}
                  />
                )}
                {payload.gambar.tipe === "perlu_ilustrasi" && (
                  <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded border border-amber-200 inline-block font-mono">
                    Catatan: Butir soal ini ditandai memerlukan pembuatan ilustrasi visual.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pilihan Opsi & Kunci Jawaban (Render KaTeX) */}
          {(question.bentukSoal === "PG" || question.bentukSoal === "PGK_MCMA") && payload.opsi && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pilihan Jawaban (Kunci Ditandai Hijau):</span>
              </h4>
              <div className="space-y-2">
                {payload.opsi.map((op: any) => {
                  const isCorrect = Array.isArray(payload.kunci_jawaban)
                    ? payload.kunci_jawaban.includes(op.label)
                    : payload.kunci_jawaban === op.label;

                  return (
                    <div
                      key={op.label}
                      className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isCorrect
                          ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300/60"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      <span
                        className={`font-mono font-bold text-xs px-2.5 py-1 rounded shrink-0 ${
                          isCorrect
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {op.label}
                      </span>
                      <div className="flex-1 text-xs">
                        <LatexPreview content={op.text} />
                      </div>
                      {isCorrect && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          KUNCI BENAR
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matriks PGK Kategori */}
          {question.bentukSoal === "PGK_KATEGORI" && payload.pernyataan && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Matriks Pernyataan & Kunci Respons:</span>
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center font-mono">No</th>
                      <th className="py-2.5 px-3">Teks Pernyataan</th>
                      <th className="py-2.5 px-3 w-40 text-center font-mono">Kunci Jawaban</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {payload.pernyataan.map((item: any, idx: number) => {
                      const answer = Array.isArray(payload.kunci_jawaban)
                        ? payload.kunci_jawaban[idx]
                        : "–";

                      // Determine if the answer is semantically "wrong/false"
                      const isNegative =
                        answer === "Salah" ||
                        answer === "Tidak Sesuai" ||
                        answer === "Tidak" ||
                        answer === "False";

                      const badgeClass = isNegative
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700";

                      return (
                        <tr key={item.no} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                            {item.no}
                          </td>
                          <td className="py-2.5 px-3">
                            <LatexPreview content={item.text} />
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded border ${badgeClass}`}>
                              {answer}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RENDER AKHIR PEMBAHASAN (KaTeX) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pembahasan & Kunci Konsep:</span>
            </h4>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs">
              <LatexPreview content={payload.pembahasan || "_Tidak ada pembahasan._"} />
            </div>
          </div>

          {/* SOAL LAIN DALAM GRUP STIMULUS YANG SAMA (Penilaian Simultan) */}
          {question.groupQuestions && question.groupQuestions.length > 1 && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Butir Soal Lain dalam Grup Stimulus Ini ({question.groupQuestions.length - 1} soal lain):
                </h4>
              </div>
              <p className="text-[11.5px] text-slate-500">
                Validator dapat menilai apakah seluruh butir pertanyaan dalam kelompok stimulus ini telah bervariasi dan mencakup seluruh substansi bacaan secara proporsional.
              </p>

              <div className="space-y-2">
                {question.groupQuestions
                  .filter((gq: any) => gq.id !== question.id)
                  .map((gq: any) => (
                    <div
                      key={gq.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <span className="font-bold text-slate-800">{gq.code}</span>
                        <span>Bentuk: {gq.bentukSoal} · Status: {gq.status}</span>
                      </div>
                      <div className="text-slate-800">
                        <LatexPreview content={gq.payload?.soal_text || ""} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer & Aksi Validasi */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 shrink-0 space-y-3">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Form Modal Catatan untuk Aksi Tolak / Minta Revisi */}
          {activeAction === "revisi" && (
            <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-xl space-y-2 animate-in fade-in">
              <label className="block text-xs font-bold text-orange-900">
                Catatan Perbaikan Teknis untuk Pembuat Soal <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Tuliskan bagian butir soal atau stimulus yang perlu direvisi secara spesifik..."
                className="w-full text-xs font-sans border border-orange-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveAction("none")}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting || !actionNotes.trim()}
                  onClick={() => handleAction("direvisi")}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg shadow-xs"
                >
                  {submitting ? "Memproses..." : "Kirim Permintaan Revisi"}
                </button>
              </div>
            </div>
          )}

          {activeAction === "tolak" && (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2 animate-in fade-in">
              <label className="block text-xs font-bold text-rose-900">
                Alasan Penolakan Butir Soal <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Tuliskan alasan penolakan secara jelas (mis. tidak sesuai kaidah asesmen, plagiarisme, dll)..."
                className="w-full text-xs font-sans border border-rose-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveAction("none")}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting || !actionNotes.trim()}
                  onClick={() => handleAction("ditolak")}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg shadow-xs"
                >
                  {submitting ? "Memproses..." : "Konfirmasi Tolak Soal"}
                </button>
              </div>
            </div>
          )}

          {/* Tombol Utama Jika Form Input Aksi Sedang Tutup */}
          {activeAction === "none" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg"
              >
                Tutup Pratinjau
              </button>

              {isSelf ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Aksi Validasi Dinonaktifkan (Soal Sendiri)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setActiveAction("tolak")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Tolak Soal</span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setActiveAction("revisi")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-orange-800 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-lg transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <span>Minta Revisi</span>
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleAction("disetujui")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Setujui (Layak Tayang)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
