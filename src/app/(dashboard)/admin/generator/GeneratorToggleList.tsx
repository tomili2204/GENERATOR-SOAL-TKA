"use client";

import React, { useState } from "react";
import { Check, X, Loader2, Zap, AlertCircle, CheckCircle, Package } from "lucide-react";
import Link from "next/link";

interface ConfigItem {
  id: string;
  jenjang: string;
  mapel: string;
  isAutoActive: boolean;
  dailyTargetQuota: number;
}

export function GeneratorToggleList({
  initialConfigs,
  onGenerateSuccess,
}: {
  initialConfigs: ConfigItem[];
  onGenerateSuccess?: () => void;
}) {
  const [configs, setConfigs] = useState<ConfigItem[]>(initialConfigs);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
    packageId?: string;
    packageCode?: string;
  } | null>(null);

  async function handleToggle(item: ConfigItem) {
    setUpdatingId(item.id);
    setFeedback(null);
    const newState = !item.isAutoActive;

    try {
      const res = await fetch("/api/admin/generator-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isAutoActive: newState }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({
          type: "error",
          message: `Error: ${data.error || "Gagal mengubah toggle status."}`,
        });
        return;
      }

      setConfigs((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, isAutoActive: newState } : c))
      );
      setFeedback({
        type: "success",
        message: `Generator otomatis ${item.jenjang} ${item.mapel} ${newState ? "BERHASIL DIAKTIFKAN" : "BERHASIL DINONAKTIFKAN"}.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: "Gagal menghubungi endpoint /api/admin/generator-toggle.",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleManualGenerate(item: ConfigItem, forceMock: boolean = false) {
    setGeneratingId(item.id);
    setFeedback({
      type: "info",
      message: `Sedang memproses generate ${item.dailyTargetQuota || 30} butir soal ${item.jenjang} ${item.mapel} dengan Gemini AI dan gerbang validasi BSKAP... Mohon tunggu (~20-35 detik).`,
    });

    try {
      const res = await fetch("/api/admin/generator/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenjang: item.jenjang,
          mapel: item.mapel,
          configId: item.id,
          totalSoal: item.dailyTargetQuota,
          forceMock,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({
          type: "error",
          message: `Gagal Generate: ${data.error || data.data?.errorMessage || "Terjadi kesalahan saat memanggil LLM atau gerbang sanitasi."}`,
        });
        return;
      }

      const result = data.data;
      setFeedback({
        type: "success",
        message: `Generate Selesai! Paket "${result.packageCode}" berhasil dibuat dengan ${result.totalLolos} butir lolos pemeriksaan (${result.totalGagal} ditolak). Butir yang lolos telah masuk ke antrean validasi.`,
        packageId: result.packageId,
        packageCode: result.packageCode,
      });

      if (onGenerateSuccess) {
        onGenerateSuccess();
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: `Terjadi kendala jaringan saat menghubungi server: ${err.message}`,
      });
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-3 transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : feedback.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-indigo-50 border-indigo-200 text-indigo-900"
          }`}
        >
          {feedback.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          {feedback.type === "error" && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
          {feedback.type === "info" && <Loader2 className="w-5 h-5 text-indigo-600 shrink-0 animate-spin mt-0.5" />}
          <div className="flex-1 space-y-1">
            <p className="leading-relaxed">{feedback.message}</p>
            {feedback.packageId && (
              <div className="pt-2">
                <Link
                  href={`/pembuat/paket/${feedback.packageId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 text-white font-sans text-xs font-semibold rounded-lg hover:bg-emerald-700 shadow-xs transition-colors"
                >
                  <Package className="w-3.5 h-3.5" />
                  Buka Paket Soal #{feedback.packageCode} &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Jenjang</th>
              <th className="px-4 py-3">Mata Pelajaran</th>
              <th className="px-4 py-3">Target Harian</th>
              <th className="px-4 py-3">Jadwal Harian</th>
              <th className="px-4 py-3 text-center">Toggle Cron</th>
              <th className="px-4 py-3 text-right">Pemicu Manual (On-Demand)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {configs.map((c) => {
              const isUpdating = updatingId === c.id;
              const isGenerating = generatingId === c.id;

              return (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10px]">
                      {c.jenjang}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-sans font-semibold text-slate-900 whitespace-nowrap">
                    {c.mapel}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {c.dailyTargetQuota} butir / batch
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {c.isAutoActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Aktif Setiap Pagi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleToggle(c)}
                      disabled={isUpdating || isGenerating}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                        c.isAutoActive
                          ? "border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
                          : "border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                      }`}
                      title={c.isAutoActive ? "Nonaktifkan jadwal otomatis" : "Aktifkan jadwal otomatis"}
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : c.isAutoActive ? (
                        <X className="w-3.5 h-3.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>{c.isAutoActive ? "Matikan" : "Nyalakan"}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => handleManualGenerate(c, false)}
                        disabled={isGenerating || isUpdating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 shadow-xs transition-colors"
                        title="Pemicu proses generate sekarang untuk pengujian atau pemulihan"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                        )}
                        <span>{isGenerating ? "Sedang Generate..." : "⚡ Generate Sekarang"}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
