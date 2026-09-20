"use client";

import React from "react";
import Link from "next/link";
import { PACKAGE_STATUS_CONFIGS } from "@/lib/tokens";
import { PaketSoalStatusType } from "@/db/schema";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Layers,
  Sparkles,
  UserCheck,
  UserPlus,
  Building2,
} from "lucide-react";

interface PackageCardProps {
  pkg: {
    id: string;
    code: string;
    nama: string;
    jenjang: string;
    mapel: string;
    tipeSumber: "manual" | "ai";
    status: PaketSoalStatusType;
    createdAt: string;
    authorId?: string | null;
    author?: { name: string; email: string } | null;
    assignedValidatorId?: string | null;
    assignedValidator?: { name: string; email: string; instansi?: string } | null;
    progress: {
      totalSoal: number;
      filledSoal: number;
      disetujuiCount: number;
      direvisiCount: number;
      ditolakCount: number;
      menungguCount: number;
      percentageApproved: number;
      canPublish: boolean;
    };
  };
  basePath: string; // e.g. "/pembuat/paket" or "/validator/paket"
  actionLabel?: string;
  currentUserId?: string;
  onAssignClick?: (pkg: any) => void;
  showSourceBadge?: boolean;
}

export function PackageCard({
  pkg,
  basePath,
  actionLabel = "Kelola Lembar Kerja",
  currentUserId,
  onAssignClick,
  showSourceBadge = false,
}: PackageCardProps) {
  const statusCfg = PACKAGE_STATUS_CONFIGS[pkg.status] || PACKAGE_STATUS_CONFIGS.draft;
  const p = pkg.progress;
  const isAssignedToMe = currentUserId && pkg.assignedValidatorId === currentUserId;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between">
      <div>
        {/* Header Kartu: Kode & Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-900 text-white tracking-wide">
              {pkg.code}
            </span>

            {/* Badge Tipe Sumber (HANYA ditampilkan untuk Admin) */}
            {showSourceBadge && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                  pkg.tipeSumber === "ai"
                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {pkg.tipeSumber === "ai" ? <Sparkles className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                <span>{pkg.tipeSumber === "ai" ? "AI Generated" : "Manual / Human"}</span>
              </span>
            )}

            {/* Badge Khusus Validator jika Ditugaskan ke Dirinya */}
            {isAssignedToMe && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3" />
                Ditugaskan kepada Anda
              </span>
            )}
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusCfg.bgClass} ${statusCfg.textClass} ${statusCfg.borderClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
            <span>{statusCfg.label}</span>
          </span>
        </div>

        {/* Nama & Taksonomi */}
        <h3 className="text-base font-bold text-slate-900 mb-1">{pkg.nama}</h3>
        <p className="text-xs text-slate-500 font-mono mb-3">
          {pkg.jenjang} • {pkg.mapel}
        </p>

        {/* Status Penugasan Validator & Author */}
        <div className="mb-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-[11px] text-slate-400">Pembuat:</span>
            <span className="font-medium text-slate-800 font-sans">
              {pkg.author?.name || "Sistem AyoTKA"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Validator:</span>
            {pkg.assignedValidator ? (
              <span className="font-semibold text-emerald-800 font-sans inline-flex items-center gap-1 text-[11px]">
                <UserCheck className="w-3 h-3 text-emerald-600" />
                {pkg.assignedValidator.name}
              </span>
            ) : (
              <span className="text-slate-400 text-[11px] italic">Belum ditugaskan</span>
            )}
          </div>
        </div>

        {/* Progress Bar Agregasi 30 Slot */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              {p.disetujuiCount} / {p.totalSoal} Butir Disetujui
            </span>
            <span className="font-mono text-slate-500 font-bold">{p.percentageApproved}%</span>
          </div>

          {/* Segmented Multi-Color Progress Bar */}
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
            {/* Hijau: Disetujui */}
            <div
              style={{ width: `${(p.disetujuiCount / p.totalSoal) * 100}%` }}
              className="bg-emerald-500 transition-all duration-300"
              title={`Disetujui: ${p.disetujuiCount}`}
            />
            {/* Kuning: Menunggu Validasi */}
            <div
              style={{ width: `${(p.menungguCount / p.totalSoal) * 100}%` }}
              className="bg-amber-400 transition-all duration-300"
              title={`Menunggu: ${p.menungguCount}`}
            />
            {/* Orange: Perlu Revisi */}
            <div
              style={{ width: `${(p.direvisiCount / p.totalSoal) * 100}%` }}
              className="bg-orange-400 transition-all duration-300"
              title={`Perlu Revisi: ${p.direvisiCount}`}
            />
            {/* Merah: Ditolak */}
            <div
              style={{ width: `${(p.ditolakCount / p.totalSoal) * 100}%` }}
              className="bg-rose-500 transition-all duration-300"
              title={`Ditolak: ${p.ditolakCount}`}
            />
          </div>
        </div>

        {/* Rincian Kotak Status Slot */}
        <div className="grid grid-cols-4 gap-2 mb-5 text-[11px] font-mono">
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2 text-center">
            <span className="text-emerald-700 font-bold block text-sm">{p.disetujuiCount}</span>
            <span className="text-emerald-800 text-[10px]">Disetujui</span>
          </div>
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2 text-center">
            <span className="text-amber-700 font-bold block text-sm">{p.menungguCount}</span>
            <span className="text-amber-800 text-[10px]">Menunggu</span>
          </div>
          <div className="bg-orange-50/70 border border-orange-200/80 rounded-lg p-2 text-center">
            <span className="text-orange-700 font-bold block text-sm">{p.direvisiCount}</span>
            <span className="text-orange-800 text-[10px]">Revisi</span>
          </div>
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-lg p-2 text-center">
            <span className="text-rose-700 font-bold block text-sm">{p.ditolakCount}</span>
            <span className="text-rose-800 text-[10px]">Ditolak</span>
          </div>
        </div>
      </div>

      {/* Footer Aksi */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {onAssignClick ? (
          <button
            type="button"
            onClick={() => onAssignClick(pkg)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>{pkg.assignedValidatorId ? "Ubah Validator" : "Tugaskan Validator"}</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-400 font-mono">
            {p.totalSoal - p.filledSoal === 0 ? "30 slot terisi" : `${p.totalSoal - p.filledSoal} slot kosong`}
          </span>
        )}

        <Link
          href={`${basePath}/${pkg.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
