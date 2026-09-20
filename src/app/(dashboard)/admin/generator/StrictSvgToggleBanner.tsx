"use client";

import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Check, X, Loader2, Info } from "lucide-react";

interface StrictSvgToggleBannerProps {
  onToggleChanged?: (isActive: boolean) => void;
}

export function StrictSvgToggleBanner({ onToggleChanged }: StrictSvgToggleBannerProps) {
  const [isStrict, setIsStrict] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/admin/settings/ai");
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setIsStrict(!!json.data.strictSvgMode);
        }
      } catch (err) {
        console.error("Gagal memuat status mode SVG:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStatus();
  }, []);

  async function handleToggle() {
    const nextVal = !isStrict;
    setIsUpdating(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strictSvgMode: nextVal }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setMsg({ type: "error", text: json.error || "Gagal mengubah mode visualisasi." });
        return;
      }

      setIsStrict(nextVal);
      setMsg({
        type: "success",
        text: nextVal
          ? "Mode SVG Ketat AKTIF: Seluruh generate (Manual & Cron Pagi) wajib menghasilkan diagram/visualisasi SVG."
          : "Mode SVG Fleksibel: AI dibebaskan menentukan kebutuhan visual (kembali ke perilaku hemat token).",
      });
      if (onToggleChanged) onToggleChanged(nextVal);
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "Terjadi kesalahan jaringan." });
    } finally {
      setIsUpdating(false);
      setTimeout(() => setMsg(null), 5000);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 shadow-sm ${
        isStrict
          ? "bg-gradient-to-r from-emerald-950/20 via-slate-900/40 to-indigo-950/30 border-emerald-500/40"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Info & Explanation */}
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                isStrict ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-50 text-indigo-600"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-800">
              Aturan Visualisasi Soal (SVG Diagram & Infografik)
            </span>
            {isLoading ? (
              <span className="text-[10px] text-slate-400 font-mono">Memuat...</span>
            ) : isStrict ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3 text-emerald-700" />
                MODE KETAT AKTIF
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">
                <X className="w-3 h-3 text-slate-400" />
                MODE FLEKSIBEL (BEBAS)
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            {isStrict ? (
              <span>
                <strong className="text-emerald-900">Mode Ketat Aktif:</strong> AI diwajibkan secara ketat
                menyertakan visualisasi SVG mandiri pada diagram data (batang/lingkaran), geometri/denah, model pecahan
                arsiran, dan kartu infografik (berlaku untuk <strong>Trigger Manual</strong> maupun{" "}
                <strong>Jadwal Cron Otomatis Pagi</strong>).
              </span>
            ) : (
              <span>
                <strong className="text-slate-800">Mode Fleksibel (Bebas):</strong> AI dibebaskan menentukan apakah butuh visual atau tidak (perilaku standar saat ini yang hemat token).
              </span>
            )}
          </p>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-sans">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>
              Anda dapat mengevaluasi kualitas visual soal. Jika tidak puas, cukup matikan tombol ini kapan saja dan
              sistem langsung kembali normal.
            </span>
          </div>
        </div>

        {/* Right: Switch Button */}
        <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-700">
              {isStrict ? "Aturan Ketat" : "Mode Bebas"}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={isStrict}
              onClick={handleToggle}
              disabled={isLoading || isUpdating}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                isStrict ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span className="sr-only">Toggle Mode SVG Ketat</span>
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                  isStrict ? "translate-x-7" : "translate-x-0"
                }`}
              >
                {isUpdating ? (
                  <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />
                ) : isStrict ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <X className="w-3.5 h-3.5 text-slate-400" />
                )}
              </span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-slate-400 hidden sm:block">
            {isStrict ? "Simpan otomatis ke DB" : "Klik untuk aktifkan"}
          </span>
        </div>
      </div>

      {/* Notification Toast/Feedback */}
      {msg && (
        <div
          className={`mt-3 p-2.5 rounded-xl text-xs font-mono flex items-center gap-2 transition-all ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {msg.type === "success" ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
