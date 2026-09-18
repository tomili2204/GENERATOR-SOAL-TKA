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
        const matchStatus = statusFilter === "all" || pkg.status === statusFilter;

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
    const readyToPublish = packages.filter((p) => p.status === "siap_rilis").length;
    return { total, assigned, unassigned, readyToPublish };
  }, [packages]);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-slate-500 font-semibold">Total Paket Soal</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Seluruh naskah asesmen</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-amber-600 font-semibold">Belum Ditugaskan</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.unassigned}</p>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">Perlu penetapan validator</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-emerald-600 font-semibold">Sudah Ditugaskan</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.assigned}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Dalam proses telaah</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-purple-600 font-semibold">Paket Siap Rilis</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.readyToPublish}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">100% soal tervalidasi</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

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
            <button
              onClick={refreshPackages}
              title="Segarkan Data"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Muat Ulang</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari kode paket, nama, author, validator..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400"
              />
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
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Kode & Nama Paket</th>
                <th className="px-4 py-3">Jenjang & Mapel</th>
                <th className="px-4 py-3">Pembuat (Author)</th>
                <th className="px-4 py-3">Progres 30 Butir Soal</th>
                <th className="px-4 py-3">Validator Bertanggung Jawab</th>
                <th className="px-4 py-3 text-right">Aksi Penugasan</th>
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
                      <td className="px-4 py-3 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {pkg.code}
                          </span>
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
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-700">{pkg.jenjang}</span>
                        <div className="text-slate-500 font-sans text-[11px]">{pkg.mapel}</div>
                      </td>

                      {/* Pembuat (Author) */}
                      <td className="px-4 py-3 font-sans">
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
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 font-sans">
                        {isAssigned && pkg.assignedValidator ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              {pkg.assignedValidator.name}
                            </span>
                            {pkg.assignedValidator.instansi && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1 pl-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span>{pkg.assignedValidator.instansi}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Belum Ditugaskan
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenAssign(pkg)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{isAssigned ? "Ubah Validator" : "Tugaskan"}</span>
                          </button>

                          <Link
                            href={`/validator/paket/${pkg.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                            title="Buka Lembar Kerja Paket"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
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
