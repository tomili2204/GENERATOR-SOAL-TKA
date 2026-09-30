"use client";

import React, { useState } from "react";
import { FileDown, Loader2, Clock, XCircle } from "lucide-react";

export interface TemplateComboOption {
  jenjang: string;
  mapel: string;
  available: boolean;
}

export function UnduhTemplateGrid({ combos }: { combos: TemplateComboOption[] }) {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDownload = async (jenjang: string, mapel: string) => {
    const key = `${jenjang}__${mapel}`;
    setDownloadingKey(key);
    setErrorMessage("");
    try {
      const params = new URLSearchParams({ jenjang, mapel });
      const res = await fetch(`/api/import-template?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || "Gagal mengunduh template.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template-impor-soal-${mapel}-${jenjang}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan jaringan saat mengunduh template.");
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {combos.map((c) => {
          const key = `${c.jenjang}__${c.mapel}`;
          const isDownloading = downloadingKey === key;
          return (
            <div
              key={key}
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                c.available ? "bg-white border-slate-200" : "bg-slate-50 border-slate-200/70"
              }`}
            >
              <div>
                <p className="text-sm font-bold text-slate-900">{c.mapel}</p>
                <p className="text-xs text-slate-500">{c.jenjang}</p>
              </div>
              {c.available ? (
                <button
                  type="button"
                  onClick={() => handleDownload(c.jenjang, c.mapel)}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs shrink-0 cursor-pointer"
                >
                  {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                  <span>Unduh</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 bg-slate-100 rounded-lg shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Segera tersedia</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UnduhTemplateGrid;
