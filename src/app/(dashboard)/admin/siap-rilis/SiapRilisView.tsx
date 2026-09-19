"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Rocket,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  Send,
  Eye,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Search,
  ExternalLink,
} from "lucide-react";

export interface SiapRilisPackageItem {
  id: string;
  code: string;
  nama: string;
  jenjang: string;
  mapel: string;
  tipeSumber: "manual" | "ai";
  status: "siap_rilis" | "diterbitkan" | string;
  author?: { id: string; name: string; email: string; instansi?: string } | null;
  assignedValidator?: { id: string; name: string; email: string; instansi?: string } | null;
  createdAt: string;
  updatedAt?: string | null;
  progress: {
    totalSoal: number;
    filledSoal: number;
    disetujuiCount: number;
    percentageApproved: number;
    canPublish: boolean;
  };
}

interface SiapRilisViewProps {
  initialPackages: SiapRilisPackageItem[];
}

export function SiapRilisView({ initialPackages }: SiapRilisViewProps) {
  const [packages, setPackages] = useState<SiapRilisPackageItem[]>(initialPackages);
  const [activeTab, setActiveTab] = useState<"siap" | "diterbitkan">("siap");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/packages");
      const json = await res.json();
      if (json.success && json.data) {
        const relevant = json.data.filter(
          (p: any) => p.status === "siap_rilis" || p.status === "diterbitkan" || p.progress?.percentageApproved === 100
        );
        setPackages(relevant);
      }
    } catch (err) {
      console.error("Gagal memuat ulang data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (pkg: SiapRilisPackageItem) => {
    if (
      !confirm(
        `Konfirmasi Penerbitan Paket:\n\nApakah Anda yakin ingin menerbitkan paket "${pkg.code} - ${pkg.nama}"?\n\nSetelah diterbitkan, paket ini akan langsung AKTIF dan dapat diakses/dikerjakan oleh siswa di portal asesmen AyoTKA.`
      )
    ) {
      return;
    }

    try {
      setPublishingId(pkg.id);
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menerbitkan paket");
      }

      setSuccessMessage(
        `🎉 Selamat! Paket ${pkg.code} (${pkg.nama}) resmi DITERBITKAN dan kini telah tayang ke siswa!`
      );
      await refreshData();
      setActiveTab("diterbitkan");
    } catch (err: any) {
      alert(err.message || "Gagal menerbitkan paket");
    } finally {
      setPublishingId(null);
    }
  };

  // Filter paket berdasarkan tab dan pencarian
  const siapList = packages.filter(
    (p) => p.status === "siap_rilis" || (p.status !== "diterbitkan" && p.progress.percentageApproved === 100)
  );

  const diterbitkanList = packages.filter((p) => p.status === "diterbitkan");

  const currentList = activeTab === "siap" ? siapList : diterbitkanList;

  const filteredList = currentList.filter(
    (p) =>
      searchTerm.trim() === "" ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.assignedValidator?.name && p.assignedValidator.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Success Alert Banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-medium flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("siap")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "siap"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>Siap Diterbitkan</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === "siap" ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700 font-bold"
              }`}
            >
              {siapList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("diterbitkan")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "diterbitkan"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Telah Diterbitkan (Tayang)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                activeTab === "diterbitkan" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 font-bold"
              }`}
            >
              {diterbitkanList.length}
            </span>
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari kode, mapel, validator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <button
            onClick={refreshData}
            title="Segarkan Data"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* Content List */}
      {filteredList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            {activeTab === "siap" ? <Rocket className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            {activeTab === "siap"
              ? "Belum ada paket yang siap rilis saat ini"
              : "Belum ada paket yang diterbitkan"}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeTab === "siap"
              ? "Paket soal akan otomatis muncul di sini setelah seluruh 30 butir soal disetujui (100%) oleh validator penelaah."
              : "Paket yang telah Anda rilis ke siswa akan tercatat dan dapat dipantau di tab ini."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredList.map((pkg) => {
            const isReady = activeTab === "siap";
            const isPublishing = publishingId === pkg.id;

            return (
              <div
                key={pkg.id}
                className={`p-6 rounded-2xl border bg-white shadow-xs transition-all ${
                  isReady ? "border-indigo-200 hover:border-indigo-300" : "border-slate-200"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Info Paket */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-lg text-sm font-mono font-bold bg-slate-900 text-white tracking-wide">
                        {pkg.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          pkg.tipeSumber === "ai"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {pkg.tipeSumber === "ai" ? "AI Generator" : "Human Manual"}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>30 / 30 Disetujui (100% Lolos Telaah)</span>
                      </span>
                      {pkg.status === "diterbitkan" && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                          ● Tayang ke Siswa
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{pkg.nama}</h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        {pkg.jenjang} • {pkg.mapel}
                      </span>
                      <span>•</span>
                      <span>
                        Pembuat: <strong>{pkg.author?.name || "Sistem AyoTKA"}</strong>
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-emerald-800 font-medium">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Penelaah: <strong>{pkg.assignedValidator?.name || "Dr. Tomi Listiawan"}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Tombol Aksi Rilis / Pratinjau */}
                  <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
                    <Link
                      href={`/pembuat/paket/${pkg.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                      title="Buka Kisi 30 Butir Soal"
                    >
                      <Eye className="w-4 h-4 text-slate-500" />
                      <span>Lihat Kisi 30 Soal</span>
                    </Link>

                    {isReady && (
                      <button
                        onClick={() => handlePublish(pkg)}
                        disabled={isPublishing}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer transform active:scale-95 disabled:opacity-50"
                        title="Terbitkan Paket Sekarang agar Tayang ke Siswa"
                      >
                        <Rocket className="w-4 h-4" />
                        <span>
                          {isPublishing ? "Menerbitkan..." : "🚀 Terbitkan Paket (Tayang ke Siswa)"}
                        </span>
                      </button>
                    )}

                    {!isReady && (
                      <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Paket Telah Aktif di Portal Siswa</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SiapRilisView;
