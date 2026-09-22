"use client";

import React, { useState, useEffect } from "react";
import { Camera, Check, X, Loader2, Info } from "lucide-react";

interface NanoBananaToggleBannerProps {
  onToggleChanged?: (isActive: boolean) => void;
}

export function NanoBananaToggleBanner({ onToggleChanged }: NanoBananaToggleBannerProps) {
  const [isNanoBanana, setIsNanoBanana] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/admin/settings/ai");
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setIsNanoBanana(!!json.data.nanoBananaEnabled);
        }
      } catch (err) {
        console.error("Gagal memuat status mode Nano Banana:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStatus();
  }, []);

  async function handleToggle() {
    const nextVal = !isNanoBanana;
    setIsUpdating(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nanoBananaEnabled: nextVal }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setMsg({ type: "error", text: json.error || "Gagal mengubah mode ilustrasi kontekstual." });
        return;
      }

      setIsNanoBanana(nextVal);
      setMsg({
        type: "success",
        text: nextVal
          ? "Nano Banana Pro AKTIF: soal geometri/pemodelan akan menghasilkan ilustrasi kontekstual foto/adegan nyata."
          : "Mode Standar: AI kembali menggambar diagram geometri lewat kode SVG seperti biasa.",
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
        isNanoBanana
          ? "bg-gradient-to-r from-amber-950/20 via-slate-900/40 to-orange-950/30 border-amber-500/40"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Info & Explanation */}
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                isNanoBanana ? "bg-amber-500/20 text-amber-400" : "bg-indigo-50 text-indigo-600"
              }`}
            >
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-800">
              Ilustrasi Kontekstual Nano Banana (Geometri & Pemodelan)
            </span>
            {isLoading ? (
              <span className="text-[10px] text-slate-400 font-mono">Memuat...</span>
            ) : isNanoBanana ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3 text-amber-700" />
                NANO BANANA AKTIF
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full">
                <X className="w-3 h-3 text-slate-400" />
                MODE STANDAR (SVG GEOMETRI)
              </span>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            {isNanoBanana ? (
              <span>
                <strong className="text-amber-900">Nano Banana Aktif:</strong> Untuk soal geometri/pemodelan (bukan
                diagram data batang/lingkaran/pecahan/garis bilangan), AI akan menghasilkan ilustrasi kontekstual
                berupa gambar skenario nyata (foto/ilustrasi adegan) alih-alih diagram geometri abstrak, supaya
                siswa tetap harus menyusun sendiri model matematisnya.
              </span>
            ) : (
              <span>
                <strong className="text-slate-800">Mode Standar (SVG Geometri):</strong> AI menggambar diagram
                geometri secara abstrak lewat kode SVG seperti biasa. Ilustrasi kontekstual foto/scene nyata tidak
                diaktifkan.
              </span>
            )}
          </p>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-sans">
            <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>
              Jika dimatikan, sistem langsung kembali ke perilaku SVG standar tanpa memengaruhi soal yang sudah
              tersimpan.
            </span>
          </div>
        </div>

        {/* Right: Switch Button */}
        <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-700">
              {isNanoBanana ? "Nano Banana" : "SVG Standar"}
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={isNanoBanana}
              onClick={handleToggle}
              disabled={isLoading || isUpdating}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 ${
                isNanoBanana ? "bg-amber-600" : "bg-slate-300"
              }`}
            >
              <span className="sr-only">Toggle Mode Nano Banana</span>
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                  isNanoBanana ? "translate-x-7" : "translate-x-0"
                }`}
              >
                {isUpdating ? (
                  <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />
                ) : isNanoBanana ? (
                  <Check className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <X className="w-3.5 h-3.5 text-slate-400" />
                )}
              </span>
            </button>
          </div>

          <span className="text-[10px] font-mono text-slate-400 hidden sm:block">
            {isNanoBanana ? "Simpan otomatis ke DB" : "Klik untuk aktifkan"}
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
