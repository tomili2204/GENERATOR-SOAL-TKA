"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PackageSlotGrid, SlotData } from "@/components/packages/PackageSlotGrid";
import { QuestionReviewModal } from "@/components/validator/QuestionReviewModal";
import { PACKAGE_STATUS_CONFIGS } from "@/lib/tokens";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FolderCheck,
  Layers,
  Sparkles,
  UserCheck,
} from "lucide-react";

export default function ValidatorPaketDetailPage() {
  const params = useParams();
  const packageId = params.id as string;

  const [packageData, setPackageData] = useState<any>(null);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Review Modal State
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const loadPackageDetails = async () => {
    try {
      setIsLoading(true);
      setError("");
      const res = await fetch(`/api/packages/${packageId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memuat detail paket.");
      }

      setPackageData(json.data.package);
      setSlots(json.data.slots);
      setProgress(json.data.progress);
      if (json.data.currentUserId) {
        setCurrentUserId(json.data.currentUserId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackageDetails();
  }, [packageId]);

  const handleSelectSlot = (slot: SlotData) => {
    if (!slot.question) {
      alert(`Slot #${slot.nomorUrut} belum diisi oleh pembuat soal.`);
      return;
    }
    setSelectedQuestion(slot.question);
    setIsReviewOpen(true);
  };

  const handleReviewSubmit = async (
    questionId: string,
    decision: "disetujui" | "ditolak" | "direvisi",
    notes?: string
  ) => {
    const res = await fetch("/api/validator/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, decision, notes }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Gagal memproses telaah validasi.");
    }

    loadPackageDetails();
    setIsReviewOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="h-32 bg-white rounded-xl border border-slate-200 p-6" />
        <div className="grid grid-cols-5 gap-3.5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !packageData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Terjadi Kesalahan</h2>
        <p className="text-xs text-slate-500">{error || "Paket tidak ditemukan."}</p>
        <Link
          href="/validator/paket"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Paket</span>
        </Link>
      </div>
    );
  }

  const statusCfg =
    (PACKAGE_STATUS_CONFIGS as Record<string, any>)[packageData.status] || PACKAGE_STATUS_CONFIGS.draft;

  return (
    <div className="space-y-6">
      {/* Header & Back */}
      <div className="flex items-center justify-between">
        <Link
          href="/validator/paket"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Paket Validator</span>
        </Link>

        <button
          onClick={loadPackageDetails}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang Data</span>
        </button>
      </div>

      {/* Banner Ringkasan Telaah */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-sm font-mono font-bold bg-slate-900 text-white tracking-wide">
                {packageData.code}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                  packageData.tipeSumber === "ai"
                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {packageData.tipeSumber === "ai" ? <Sparkles className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                <span>{packageData.tipeSumber === "ai" ? "AI Generated" : "Manual / Human"}</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusCfg.bgClass} ${statusCfg.textClass} ${statusCfg.borderClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                <span>{statusCfg.label}</span>
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{packageData.nama}</h1>
            <p className="text-xs text-slate-500 font-mono">
              {packageData.jenjang} • {packageData.mapel} • Pembuat: {packageData.author?.name || "Tim Penulis"}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 block font-mono">Status Kelulusan Naskah:</span>
            <span className="text-2xl font-bold font-mono text-slate-900">
              {progress?.disetujuiCount || 0} / 30 Butir
            </span>
            <span className="text-xs text-emerald-600 font-bold block">
              ({progress?.percentageApproved || 0}% Lolos)
            </span>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <span className="text-emerald-800 font-medium">Disetujui</span>
            <span className="text-lg font-bold font-mono text-emerald-700">{progress?.disetujuiCount || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <span className="text-amber-800 font-medium">Menunggu Telaah</span>
            <span className="text-lg font-bold font-mono text-amber-700">{progress?.menungguCount || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200 flex items-center justify-between">
            <span className="text-orange-800 font-medium">Perlu Revisi</span>
            <span className="text-lg font-bold font-mono text-orange-700">{progress?.direvisiCount || 0}</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
            <span className="text-rose-800 font-medium">Ditolak</span>
            <span className="text-lg font-bold font-mono text-rose-700">{progress?.ditolakCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Grid 30 Slot */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Daftar 30 Slot Naskah Tryout</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Pilih butir soal untuk membuka modal telaah akhir KaTeX.
          </span>
        </div>

        <PackageSlotGrid slots={slots} onSelectSlot={handleSelectSlot} isValidator={true} />
      </div>

      {/* Modal Telaah Validator (dengan KaTeX Render & Separation of Duties) */}
      {selectedQuestion && isReviewOpen && (
        <QuestionReviewModal
          question={selectedQuestion}
          currentUserId={currentUserId}
          onClose={() => setIsReviewOpen(false)}
          onReviewSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
}
