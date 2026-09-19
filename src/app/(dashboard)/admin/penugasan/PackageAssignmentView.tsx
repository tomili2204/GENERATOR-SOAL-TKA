"use client";

import React, { useState, useMemo } from "react";
import { TablePagination } from "@/components/ui/TablePagination";
import { AssignValidatorModal } from "@/components/packages/AssignValidatorModal";
import {
  UserCheck,
  Search,
  Building2,
  CheckCircle2,
  Clock,
  RefreshCw,
  UserPlus,
  Package,
  ArrowRight,
  Send,
  X,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import { isJenjangMatch } from "@/lib/jenjang-utils";

export interface PackageAdminItem {
  id: string;
  code: string;
  nama: string;
  jenjang: string;
  mapel: string;
  tipeSumber: "manual" | "ai";
  status: any;
  authorId?: string | null;
  author?: { id: string; name: string; email: string; instansi?: string } | null;
  assignedValidatorId?: string | null;
  assignedValidator?: { id: string; name: string; email: string; instansi?: string } | null;
  assignedAt?: string | null;
  createdAt: string;
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
}

interface PackageAssignmentViewProps {
  initialPackages: PackageAdminItem[];
}

export function PackageAssignmentView({ initialPackages }: PackageAssignmentViewProps) {
  const [packages, setPackages] = useState<PackageAdminItem[]>(initialPackages);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState("all"); // 'all' | 'unassigned' | 'assigned'
  const [jenjangFilter, setJenjangFilter] = useState("all");
  const [mapelFilter, setMapelFilter] = useState("all");
  const [tipeSumberFilter, setTipeSumberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Paging
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal Assign
  const [selectedPkg, setSelectedPkg] = useState<PackageAdminItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);

  const refreshPackages = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/packages");
      const json = await res.json();
      if (json.success) {
        setPackages(json.data || []);
      }
    } catch (e) {
      console.error("Gagal refresh paket:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAssign = (pkg: PackageAdminItem) => {
    setSelectedPkg(pkg);
    setIsModalOpen(true);
  };

  const handleDirectPublish = async (pkg: PackageAdminItem) => {
    if (
      !confirm(
        `Konfirmasi Penerbitan Paket:\n\nApakah Anda yakin ingin menerbitkan paket "${pkg.code} - ${pkg.nama}"?\n\nSetelah diterbitkan, paket ini akan langsung aktif dan tayang ke siswa.`
      )
    ) {
      return;
    }

    try {
      setIsPublishing(pkg.id);
      const res = await fetch(`/api/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menerbitkan paket");
      }
      setPublishSuccessMsg(`Paket ${pkg.code} (${pkg.nama}) berhasil diterbitkan dan resmi tayang ke siswa!`);
      refreshPackages();
    } catch (err: any) {
      alert(err.message || "Gagal menerbitkan paket");
    } finally {
      setIsPublishing(null);
    }
  };

  // Filter & Pengurutan: Terbaru ke Terlama (createdAt DESC)
  const filteredPackages = useMemo(() => {
    return packages
      .filter((pkg) => {
        const matchSearch =
          searchTerm.trim() === "" ||
          pkg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pkg.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pkg.mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (pkg.author?.name && pkg.author.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (pkg.assignedValidator?.name &&
            pkg.assignedValidator.name.toLowerCase().includes(searchTerm.toLowerCase()));

        let matchAssign = true;
        if (assignmentFilter === "unassigned") {
          matchAssign = !pkg.assignedValidatorId;
        } else if (assignmentFilter === "assigned") {
          matchAssign = Boolean(pkg.assignedValidatorId);
        }

        const matchJenjang = jenjangFilter === "all" || isJenjangMatch(pkg.jenjang, jenjangFilter);
        const matchMapel =
          mapelFilter === "all" || pkg.mapel.toLowerCase().trim() === mapelFilter.toLowerCase().trim();
        const matchSumber = tipeSumberFilter === "all" || pkg.tipeSumber === tipeSumberFilter;
        
        let matchStatus = true;
        if (statusFilter === "siap_rilis") {
          matchStatus = pkg.status === "siap_rilis" || pkg.progress?.canPublish || pkg.progress?.percentageApproved === 100;
        } else if (statusFilter === "diterbitkan") {
          matchStatus = pkg.status === "diterbitkan";
        } else if (statusFilter !== "all") {
          matchStatus = pkg.status === statusFilter;
        }

        return matchSearch && matchAssign && matchJenjang && matchMapel && matchSumber && matchStatus;
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [packages, searchTerm, assignmentFilter, jenjangFilter, mapelFilter, tipeSumberFilter, statusFilter]);

  // Paging Calculation
  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPackages = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredPackages.slice(startIndex, startIndex + pageSize);
  }, [filteredPackages, validCurrentPage, pageSize]);

  // Metrics
  const metrics = useMemo(() => {
    const total = packages.length;
    const assigned = packages.filter((p) => p.assignedValidatorId).length;
    const unassigned = packages.filter((p) => !p.assignedValidatorId).length;
    const readyToPublish = packages.filter(
      (p) => p.status === "siap_rilis" || (p.status !== "diterbitkan" && p.progress?.percentageApproved === 100)
    ).length;
    const published = packages.filter((p) => p.status === "diterbitkan").length;
    return { total, assigned, unassigned, readyToPublish, published };
  }, [packages]);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => {
            setAssignmentFilter("all");
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer hover:shadow-md ${
            assignmentFilter === "all" && statusFilter === "all"
              ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-200"
              : "border-slate-200 bg-white shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase text-slate-500 font-semibold">Total Paket Soal</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Klik untuk tampilkan semua</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setAssignmentFilter("unassigned");
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer hover:shadow-md ${
            assignmentFilter === "unassigned"
              ? "border-amber-500 bg-amber-50/40 ring-2 ring-amber-200"
              : "border-slate-200 bg-white shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase text-amber-600 font-semibold">Belum Ditugaskan</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.unassigned}</p>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Klik untuk filter data ini</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setAssignmentFilter("assigned");
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer hover:shadow-md ${
            assignmentFilter === "assigned" && statusFilter === "all"
              ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-200"
              : "border-slate-200 bg-white shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase text-emerald-600 font-semibold">Sudah Ditugaskan</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.assigned}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Klik untuk filter data ini</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setAssignmentFilter("all");
            setStatusFilter("siap_rilis");
            setCurrentPage(1);
          }}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer hover:shadow-md ${
            statusFilter === "siap_rilis"
              ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-300"
              : "border-purple-200 bg-purple-50/20 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase text-purple-600 font-bold flex items-center gap-1">
                <span>🚀 Paket Siap Rilis</span>
              </p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{metrics.readyToPublish}</p>
              <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
                ★ Klik untuk filter siap rilis!
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Rocket className="w-5 h-5" />
            </div>
          </div>
        </button>
      </div>

      {publishSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{publishSuccessMsg}</span>
          </div>
          <button
            onClick={() => setPublishSuccessMsg(null)}
            className="p-1 text-emerald-600 hover:text-emerald-900 rounded-md hover:bg-emerald-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
                Daftar Paket Soal & Penugasan Validator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tetapkan validator penelaah untuk masing-masing paket naskah soal dengan penegakan aturan Separation of Duties
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                href="/admin/siap-rilis"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
                title="Buka Halaman Khusus Publikasi Paket Siap Rilis"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Menu Siap Rilis ({metrics.readyToPublish})</span>
              </Link>
              <button
                onClick={refreshPackages}
                title="Segarkan Data"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Muat Ulang</span>
              </button>
            </div>
          </div>

          {/* Quick Filter Buttons Pill */}
          <div className="flex flex-wrap items-center gap-2 pb-3 pt-1 border-b border-slate-100">
            <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase mr-1">Filter Cepat:</span>
            <button
              onClick={() => {
                setAssignmentFilter("all");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                assignmentFilter === "all" && statusFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Semua Paket ({metrics.total})
            </button>
            <button
              onClick={() => {
                setAssignmentFilter("unassigned");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                assignmentFilter === "unassigned"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              Belum Ditugaskan ({metrics.unassigned})
            </button>
            <button
              onClick={() => {
                setAssignmentFilter("assigned");
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                assignmentFilter === "assigned" && statusFilter === "all"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              Sudah Ditugaskan ({metrics.assigned})
            </button>
            <button
              onClick={() => {
                setAssignmentFilter("all");
                setStatusFilter("siap_rilis");
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "siap_rilis"
                  ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-300"
                  : "bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200"
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>🚀 Siap Rilis ({metrics.readyToPublish})</span>
            </button>
            <button
              onClick={() => {
                setAssignmentFilter("all");
                setStatusFilter("diterbitkan");
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === "diterbitkan"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Diterbitkan ({metrics.published})</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari kode, nama, author..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Status Rilis */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-medium ${
                  statusFilter === "siap_rilis"
                    ? "bg-purple-50 border-purple-300 text-purple-800 font-bold"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <option value="all">Semua Status Rilis</option>
                <option value="siap_rilis">🚀 Siap Rilis (100% Selesai)</option>
                <option value="diterbitkan">✔ Sudah Diterbitkan</option>
                <option value="dalam_validasi">Dalam Validasi</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            {/* Filter Penugasan */}
            <div className="relative">
              <select
                value={assignmentFilter}
                onChange={(e) => {
                  setAssignmentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Penugasan</option>
                <option value="unassigned">Belum Ditugaskan</option>
                <option value="assigned">Sudah Ditugaskan</option>
              </select>
            </div>

            {/* Filter Jenjang */}
            <div className="relative">
              <select
                value={jenjangFilter}
                onChange={(e) => {
                  setJenjangFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Jenjang</option>
                <option value="SD/MI">SD/MI</option>
                <option value="SMP/MTs">SMP/MTs</option>
                <option value="SMA/MA">SMA/MA</option>
                <option value="SMK/MAK">SMK/MAK</option>
              </select>
            </div>

            {/* Filter Mapel */}
            <div className="relative">
              <select
                value={mapelFilter}
                onChange={(e) => {
                  setMapelFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Mata Pelajaran</option>
                <option value="Matematika">Matematika</option>
                <option value="Bahasa Indonesia">Bahasa Indonesia</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">Kode & Nama Paket</th>
                <th className="px-4 py-3 min-w-[130px]">Jenjang & Mapel</th>
                <th className="px-4 py-3 min-w-[160px]">Pembuat (Author)</th>
                <th className="px-4 py-3 min-w-[170px]">Progres 30 Butir Soal</th>
                <th className="px-4 py-3 min-w-[210px]">Validator Bertanggung Jawab</th>
                <th className="px-4 py-3 text-right min-w-[320px]">Aksi Penugasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedPackages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-sans text-xs">
                    Tidak ada paket soal yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedPackages.map((pkg) => {
                  const p = pkg.progress;
                  const isAssigned = Boolean(pkg.assignedValidatorId);

                  return (
                    <tr key={pkg.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Kode & Nama Paket */}
                      <td className="px-4 py-3 font-sans min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/pembuat/paket/${pkg.id}`}
                            className="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 border border-slate-200 transition-colors"
                            title={`Buka Lembar Paket ${pkg.code}`}
                          >
                            {pkg.code}
                          </Link>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                              pkg.tipeSumber === "ai"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {pkg.tipeSumber === "ai" ? "AI" : "Human"}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 text-xs mt-1">{pkg.nama}</div>
                      </td>

                      {/* Jenjang & Mapel */}
                      <td className="px-4 py-3 min-w-[130px]">
                        <span className="font-semibold text-slate-700">{pkg.jenjang}</span>
                        <div className="text-slate-500 font-sans text-[11px]">{pkg.mapel}</div>
                      </td>

                      {/* Pembuat (Author) */}
                      <td className="px-4 py-3 font-sans min-w-[160px]">
                        <div className="font-medium text-slate-800">
                          {pkg.author?.name || "Sistem AyoTKA"}
                        </div>
                        {pkg.author?.instansi && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            <span>{pkg.author.instansi}</span>
                          </div>
                        )}
                      </td>

                      {/* Progres Soal */}
                      <td className="px-4 py-3 min-w-[170px]">
                        <div className="flex items-center gap-2 mb-1 text-[11px]">
                          <span className="font-bold text-emerald-700">{p.disetujuiCount} / {p.totalSoal} Disetujui</span>
                          <span className="text-slate-400 font-mono text-[10px]">({p.percentageApproved}%)</span>
                        </div>
                        <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${(p.disetujuiCount / p.totalSoal) * 100}%` }}
                            className="bg-emerald-500"
                          />
                          <div
                            style={{ width: `${(p.menungguCount / p.totalSoal) * 100}%` }}
                            className="bg-amber-400"
                          />
                          <div
                            style={{ width: `${(p.direvisiCount / p.totalSoal) * 100}%` }}
                            className="bg-orange-400"
                          />
                          <div
                            style={{ width: `${(p.ditolakCount / p.totalSoal) * 100}%` }}
                            className="bg-rose-500"
                          />
                        </div>
                      </td>

                      {/* Validator */}
                      <td className="px-4 py-3 pr-6 font-sans min-w-[210px]">
                        {isAssigned && pkg.assignedValidator ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 whitespace-nowrap shadow-2xs">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{pkg.assignedValidator.name}</span>
                            </span>
                            {pkg.assignedValidator.instansi && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 pl-0.5">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[180px]">{pkg.assignedValidator.instansi}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            Belum Ditugaskan
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 pl-4 text-right whitespace-nowrap min-w-[320px]">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => handleOpenAssign(pkg)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                            title={isAssigned ? "Ubah Penugasan Validator" : "Tugaskan Validator"}
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{isAssigned ? "Ubah Validator" : "Tugaskan"}</span>
                          </button>

                          {pkg.status === "siap_rilis" ? (
                            <button
                              onClick={() => handleDirectPublish(pkg)}
                              disabled={Boolean(isPublishing)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow cursor-pointer shrink-0 disabled:opacity-50"
                              title="Terbitkan Paket Langsung ke Siswa"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{isPublishing === pkg.id ? "Memproses..." : "🚀 Terbitkan"}</span>
                            </button>
                          ) : pkg.status === "diterbitkan" ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shrink-0"
                              title="Paket Telah Diterbitkan (Tayang ke Siswa)"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Diterbitkan</span>
                            </span>
                          ) : null}

                          <Link
                            href={`/pembuat/paket/${pkg.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-colors shrink-0"
                            title="Buka Kisi 30 Butir Soal"
                          >
                            <span>Lembar Soal</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer with 10, 20, 30, 50, 100 rows per page */}
        <TablePagination
          currentPage={validCurrentPage}
          totalPages={totalPages}
          totalItems={filteredPackages.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 30, 50, 100]}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Modal Assign Validator */}
      <AssignValidatorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pkg={selectedPkg}
        onSuccess={() => {
          refreshPackages();
        }}
      />
    </div>
  );
}

export default PackageAssignmentView;
