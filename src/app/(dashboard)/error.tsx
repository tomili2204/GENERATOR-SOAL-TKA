"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string; statusCode?: number };
  reset: () => void;
}) {
  const isAuthForbidden =
    error.message.includes("Akses ditolak") ||
    error.message.includes("403") ||
    error.message.includes("Pemisahan tugas");

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
        <div className="inline-flex p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-rose-600 font-bold">
            {isAuthForbidden ? "Otorisasi Backend Ditolak (403)" : "Terjadi Kesalahan Sistem"}
          </span>
          <h2 className="mt-1 text-xl font-bold text-slate-900 tracking-tight">
            {isAuthForbidden ? "Akses Tidak Diizinkan" : "Halaman Tidak Dapat Dimuat"}
          </h2>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-mono bg-slate-50 p-3 rounded-lg border border-slate-200 text-left">
          {error.message || "Anda tidak memiliki wewenang untuk mengakses rute atau modul ini."}
        </p>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Muat Ulang Halaman</span>
          </button>
        </div>
      </div>
    </div>
  );
}
