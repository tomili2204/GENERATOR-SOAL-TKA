"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PackageSlotGrid, SlotData } from "@/components/packages/PackageSlotGrid";
import { SlotQuestionModal } from "@/components/packages/SlotQuestionModal";
import { PACKAGE_STATUS_CONFIGS } from "@/lib/tokens";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Send,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";

export default function PembuatPaketDetailPage() {
  const params = useParams();
  const packageId = params.id as string;

  const [packageData, setPackageData] = useState<any>(null);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Publish State
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackageDetails();
  }, [packageId]);

  const handleSlotClick = (slot: SlotData) => {
    setSelectedSlot(slot);
    setIsModalOpen(true);
  };

  const handlePublish = async () => {
    if (!progress?.canPublish) return;
    try {
      setIsPublishing(true);
      setPublishMessage("");
      const res = await fetch(`/api/packages/${packageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mempublikasikan paket.");
      }
      setPublishMessage(json.message);
      loadPackageDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
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
          href="/pembuat/paket"
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
      {/* Tombol Kembali & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/pembuat/paket"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Paket</span>
        </Link>

        <button
          onClick={loadPackageDetails}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang Data</span>
        </button>
      </div>

      {/* Banner Informasi Paket */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-sm font-mono font-bold bg-slate-900 text-white tracking-wide">
                {packageData.code}
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
              {packageData.jenjang} • {packageData.mapel} • Dibuat oleh: {packageData.author?.name || "Saya"}
            </p>
          </div>

          {/* Tombol Terbitkan Paket */}
          <div className="flex flex-col items-end gap-1.5">
            {packageData.status === "diterbitkan" ? (
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Paket Telah Diterbitkan (Tayang ke Siswa)</span>
              </div>
            ) : progress?.canPublish ? (
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md hover:shadow-lg cursor-pointer transform active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>{isPublishing ? "Memproses..." : "🚀 Terbitkan Paket (Siap Tayang)"}</span>
              </button>
            ) : (
              <button
                disabled
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terbitkan Paket (Siap Tayang)</span>
              </button>
            )}

            {!progress?.canPublish && packageData.status !== "diterbitkan" && (
              <span className="text-[11px] text-slate-400 font-mono">
                Wajib 30/30 butir disetujui untuk membuka tombol terbit ({progress?.disetujuiCount || 0}/30 disetujui).
              </span>
            )}
            {progress?.canPublish && packageData.status !== "diterbitkan" && (
              <span className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                <span>★</span> Seluruh 30 butir lolos telaah. Klik tombol di atas untuk merilis paket ke siswa.
              </span>
            )}
          </div>
        </div>

        {publishMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{publishMessage}</span>
          </div>
        )}

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
            <span className="text-rose-800 font-medium">Ditolak (Butuh Pengganti)</span>
            <span className="text-lg font-bold font-mono text-rose-700">{progress?.ditolakCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Grid 30 Slot */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Lembar Kerja 30 Slot Naskah</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Klik pada salah satu slot untuk melihat atau mengisi naskah soal.
          </span>
        </div>

        <PackageSlotGrid slots={slots} onSelectSlot={handleSlotClick} isValidator={false} />
      </div>

      {/* Modal View / Edit / Replace Slot */}
      {selectedSlot && (
        <SlotQuestionModal
          slot={selectedSlot}
          packageData={packageData}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            loadPackageDetails();
          }}
          currentUserId={packageData.authorId}
          isValidator={false}
        />
      )}
    </div>
  );
}
