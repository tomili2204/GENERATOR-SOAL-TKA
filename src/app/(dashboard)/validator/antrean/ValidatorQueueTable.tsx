"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, ShieldAlert, Loader2, Info } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";

interface QueueItem {
  id: string;
  code: string;
  jenjang: string;
  mapel: "Matematika" | "Bahasa Indonesia";
  elemen: string;
  status: any;
  authorId: string;
  authorName?: string | null;
  authorEmail?: string | null;
  createdAt: any;
  isSelfAuthored: boolean;
  canValidate: boolean;
  payload: any;
}

export function ValidatorQueueTable({
  initialItems,
  currentUserId,
}: {
  initialItems: QueueItem[];
  currentUserId: string;
}) {
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
    code?: number;
  } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleReview(questionId: string, decision: "disetujui" | "ditolak" | "perlu_revisi", notes?: string) {
    setProcessingId(questionId);
    setActionResult(null);

    try {
      const res = await fetch("/api/validator/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          decision,
          notes: notes || `Keputusan validasi "${decision}" dari panel validator.`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setActionResult({
          success: false,
          code: res.status,
          message: data.error || "Gagal memproses validasi.",
        });
        return;
      }

      setActionResult({
        success: true,
        code: 200,
        message: data.message || "Validasi berhasil diproses.",
      });

      // Update daftar lokal
      setItems((prev) => prev.filter((item) => item.id !== questionId));
    } catch (err) {
      setActionResult({
        success: false,
        code: 500,
        message: "Gagal menghubungi endpoint backend.",
      });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {actionResult && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-3 transition-all ${
            actionResult.success
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {actionResult.success ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <span className="font-bold uppercase tracking-wide">
              {actionResult.success ? "HTTP 200 OK — Validasi Diterima" : `HTTP ${actionResult.code || 403} FORBIDDEN — Ditolak Backend`}
            </span>
            <p className="leading-relaxed font-sans text-xs">{actionResult.message}</p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-500">
          Tidak ada soal yang sedang menunggu validasi saat ini.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Kode Soal</th>
                <th className="px-4 py-3">Jenjang & Mapel</th>
                <th className="px-4 py-3">Elemen Materi</th>
                <th className="px-4 py-3">Pengunggah (Author)</th>
                <th className="px-4 py-3">Status Pemisahan Tugas</th>
                <th className="px-4 py-3 text-right">Aksi Validasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.map((item) => {
                const isSelf = item.authorId === currentUserId;
                const isProcessing = processingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">
                      <div>{item.code}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {item.payload?.title || "Butir Soal Standar"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      <span className="font-semibold">{item.jenjang}</span> · {item.mapel}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-sans">{item.elemen}</td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-semibold border border-violet-200 text-[11px]">
                          Anda Sendiri
                        </span>
                      ) : (
                        <span className="text-slate-700 font-sans font-medium text-xs">
                          {item.authorName || (item as any).author?.name || "–"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      {isSelf ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          Dilarang Validasi (Soal Sendiri)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Memenuhi Syarat Telaah
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleReview(item.id, "disetujui")}
                            title="Mencoba memvalidasi soal sendiri untuk menguji penolakan HTTP 403 di backend"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-300 bg-rose-50 text-rose-700 text-[11px] font-semibold hover:bg-rose-100 transition-colors disabled:opacity-50"
                          >
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                            <span>Uji Coba Validasi (Harus Ditolak Backend)</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleReview(item.id, "disetujui")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                          >
                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            <span>Setujui</span>
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleReview(item.id, "perlu_revisi", "Mohon perbaiki pilihan distraktor.")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-orange-200 bg-orange-50 text-orange-800 text-[11px] font-semibold hover:bg-orange-100 transition-colors disabled:opacity-50"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Revisi</span>
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleReview(item.id, "ditolak", "Tidak sesuai standar kurikulum.")}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
