"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Calendar,
  User,
  Layers,
  RotateCcw,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AuditLog, ValidationLog, GenerationLog } from "@/db/schema";
import { TablePagination } from "@/components/ui/TablePagination";
import { StatusBadge } from "@/components/ui/Badge";

interface AuditLogTableViewProps {
  initialAuditLogs: AuditLog[];
  initialValidationLogs: ValidationLog[];
  initialGenerationLogs: GenerationLog[];
  usersMap: Record<string, string>; // userId -> name
}

export function AuditLogTableView({
  initialAuditLogs,
  initialValidationLogs,
  initialGenerationLogs,
  usersMap,
}: AuditLogTableViewProps) {
  // Tab State: 'validasi' | 'generate' | 'audit'
  const [activeTab, setActiveTab] = useState<"validasi" | "generate" | "audit">("validasi");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterUser, setFilterUser] = useState("semua");
  const [filterJenjangMapel, setFilterJenjangMapel] = useState("semua");

  // Expanded row details for inspection
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Pagination states
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  const resetFilters = () => {
    setSearchQuery("");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterUser("semua");
    setFilterJenjangMapel("semua");
    setCurrentPage(1);
  };

  // Helper date checker
  const isWithinDateRange = (dateString?: string | Date | null) => {
    if (!dateString) return true;
    const d = new Date(dateString);
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      if (d < start) return false;
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  };

  // 1. Filtered Validation Logs
  const filteredValidationLogs = useMemo(() => {
    return initialValidationLogs.filter((l) => {
      if (!isWithinDateRange(l.createdAt)) return false;

      const validatorName = usersMap[l.validatorId] || "";
      if (filterUser !== "semua") {
        if (l.validatorEmail !== filterUser && l.validatorId !== filterUser) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = l.questionCode?.toLowerCase().includes(q);
        const matchEmail = l.validatorEmail?.toLowerCase().includes(q);
        const matchName = validatorName.toLowerCase().includes(q);
        const matchAction = l.action?.toLowerCase().includes(q);
        const matchNotes = l.notes?.toLowerCase().includes(q);
        if (!matchCode && !matchEmail && !matchName && !matchAction && !matchNotes) return false;
      }

      return true;
    });
  }, [initialValidationLogs, searchQuery, filterStartDate, filterEndDate, filterUser, usersMap]);

  // 2. Filtered Generation Logs
  const filteredGenerationLogs = useMemo(() => {
    return initialGenerationLogs.filter((l) => {
      if (!isWithinDateRange(l.startedAt)) return false;

      if (filterJenjangMapel !== "semua") {
        const combo = `${l.jenjang} - ${l.mapel}`;
        if (combo !== filterJenjangMapel && l.jenjang !== filterJenjangMapel && l.mapel !== filterJenjangMapel) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchJenjang = l.jenjang?.toLowerCase().includes(q);
        const matchMapel = l.mapel?.toLowerCase().includes(q);
        const matchPkg = l.packageCode?.toLowerCase().includes(q);
        const matchStatus = l.status?.toLowerCase().includes(q);
        const matchErr = l.errorMessage?.toLowerCase().includes(q);
        if (!matchJenjang && !matchMapel && !matchPkg && !matchStatus && !matchErr) return false;
      }

      return true;
    });
  }, [initialGenerationLogs, searchQuery, filterStartDate, filterEndDate, filterJenjangMapel]);

  // 3. Filtered System Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return initialAuditLogs.filter((l) => {
      if (!isWithinDateRange(l.createdAt)) return false;

      if (filterUser !== "semua") {
        if (l.userEmail !== filterUser && l.userId !== filterUser) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAction = l.action?.toLowerCase().includes(q);
        const matchEmail = l.userEmail?.toLowerCase().includes(q);
        const matchTarget = l.targetResource?.toLowerCase().includes(q);
        const matchIp = l.ipAddress?.toLowerCase().includes(q);
        if (!matchAction && !matchEmail && !matchTarget && !matchIp) return false;
      }

      return true;
    });
  }, [initialAuditLogs, searchQuery, filterStartDate, filterEndDate, filterUser]);

  // Active list based on activeTab
  const currentList = useMemo(() => {
    if (activeTab === "validasi") return filteredValidationLogs;
    if (activeTab === "generate") return filteredGenerationLogs;
    return filteredAuditLogs;
  }, [activeTab, filteredValidationLogs, filteredGenerationLogs, filteredAuditLogs]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(currentList.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, validCurrentPage, pageSize]);

  // Unique users for dropdown
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    initialValidationLogs.forEach((l) => {
      if (l.validatorEmail) set.add(l.validatorEmail);
    });
    initialAuditLogs.forEach((l) => {
      if (l.userEmail) set.add(l.userEmail);
    });
    return Array.from(set).sort();
  }, [initialValidationLogs, initialAuditLogs]);

  // Unique Jenjang-Mapel for dropdown
  const uniqueJenjangMapel = useMemo(() => {
    const set = new Set<string>();
    initialGenerationLogs.forEach((l) => {
      if (l.jenjang && l.mapel) set.add(`${l.jenjang} - ${l.mapel}`);
    });
    return Array.from(set).sort();
  }, [initialGenerationLogs]);

  // Export CSV Handler
  const handleExportCsv = () => {
    let csvContent = "";
    if (activeTab === "validasi") {
      csvContent = "Waktu,Kode Soal,Validator,Email,Aksi,Status Sebelum,Status Sesudah,Catatan\n";
      filteredValidationLogs.forEach((l) => {
        const time = new Date(l.createdAt).toISOString();
        const name = usersMap[l.validatorId] || "";
        const notes = (l.notes || "").replace(/"/g, '""');
        csvContent += `"${time}","${l.questionCode}","${name}","${l.validatorEmail}","${l.action}","${l.previousStatus}","${l.newStatus}","${notes}"\n`;
      });
    } else if (activeTab === "generate") {
      csvContent = "Waktu Mulai,Jenjang,Mapel,Kode Paket,Status,Diminta,Diterima,Lolos,Gagal,Pemicu,Pesan\n";
      filteredGenerationLogs.forEach((l) => {
        const time = new Date(l.startedAt).toISOString();
        const err = (l.errorMessage || "").replace(/"/g, '""');
        csvContent += `"${time}","${l.jenjang}","${l.mapel}","${l.packageCode || ""}","${l.status}",${l.totalDiminta},${l.totalDiterima},${l.totalLolos},${l.totalGagal},"${l.triggeredBy}","${err}"\n`;
      });
    } else {
      csvContent = "Waktu,Aksi,Pelaku,Resource,IP Address\n";
      filteredAuditLogs.forEach((l) => {
        const time = new Date(l.createdAt).toISOString();
        csvContent += `"${time}","${l.action}","${l.userEmail}","${l.targetResource}","${l.ipAddress || ""}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `log_${activeTab}_ayotka_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => {
              setActiveTab("validasi");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "validasi"
                ? "bg-white text-emerald-800 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Log Validasi Soal</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {filteredValidationLogs.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("generate");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "generate"
                ? "bg-white text-violet-800 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-violet-600" />
            <span>Log Generator AI</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {filteredGenerationLogs.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab("audit");
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "audit"
                ? "bg-white text-indigo-800 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Log Audit Sistem</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
              {filteredAuditLogs.length}
            </span>
          </button>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Filter Bar Terpadu */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Kata Kunci */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Pencarian Kata Kunci
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === "validasi"
                    ? "Cari kode soal, validator, catatan telaah..."
                    : activeTab === "generate"
                    ? "Cari jenjang, mapel, kode paket..."
                    : "Cari aksi, email, target resource..."
                }
                className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg pl-8 pr-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Tanggal Mulai */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Dari Tanggal</span>
            </label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filter Tanggal Selesai */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Sampai Tanggal</span>
            </label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Dropdown Filter Spesifik per Tab */}
          <div>
            {activeTab === "generate" ? (
              <>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  <span>Jenjang & Mapel</span>
                </label>
                <select
                  value={filterJenjangMapel}
                  onChange={(e) => setFilterJenjangMapel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="semua">Semua Jenjang / Mapel</option>
                  {uniqueJenjangMapel.map((jm) => (
                    <option key={jm} value={jm}>
                      {jm}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Pengguna / Pelaku</span>
                </label>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="semua">Semua Pengguna ({uniqueUsers.length})</option>
                  {uniqueUsers.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {(searchQuery || filterStartDate || filterEndDate || filterUser !== "semua" || filterJenjangMapel !== "semua") && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
            <span>Filter aktif diterapkan pada {currentList.length} data</span>
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Semua Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Kontainer Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {/* Header Tabel */}
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeTab === "validasi" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {activeTab === "generate" && <Cpu className="w-4 h-4 text-violet-600" />}
            {activeTab === "audit" && <ShieldCheck className="w-4 h-4 text-indigo-600" />}
            <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-700">
              {activeTab === "validasi" && `Riwayat Validasi Butir Soal (${filteredValidationLogs.length})`}
              {activeTab === "generate" && `Riwayat Proses Generator AI (${filteredGenerationLogs.length})`}
              {activeTab === "audit" && `Jejak Audit Aktivitas Sistem (${filteredAuditLogs.length})`}
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {activeTab === "validasi"
              ? "Append-Only Immutable Log"
              : activeTab === "generate"
              ? "AI Generation Trail"
              : "Audit Trail"}
          </span>
        </div>

        {currentList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-1">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">
              Tidak ada rekaman log yang cocok dengan kriteria filter saat ini.
            </p>
            <p className="text-slate-400">Coba ubah tanggal atau kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* TAB 1: Log Validasi Soal */}
            {activeTab === "validasi" && (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Kode Soal</th>
                    <th className="px-4 py-3">Validator</th>
                    <th className="px-4 py-3">Keputusan / Aksi</th>
                    <th className="px-4 py-3">Perubahan Status</th>
                    <th className="px-4 py-3">Catatan / Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(paginatedList as ValidationLog[]).map((l) => {
                    const validatorName = usersMap[l.validatorId] || l.validatorEmail;
                    const isApproved = l.action === "disetujui";
                    const isRejected = l.action === "ditolak";

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(l.createdAt).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {l.questionCode}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-sans font-semibold text-slate-800 text-xs">
                            {validatorName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {l.validatorEmail}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isApproved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isRejected
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {l.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-[10.5px]">
                            <span className="text-slate-400">{l.previousStatus}</span>
                            <span className="text-slate-300">→</span>
                            <span className="font-bold text-slate-800">{l.newStatus}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-sm">
                          <p className="text-slate-700 font-sans text-xs line-clamp-2">
                            {l.notes || <span className="text-slate-400 italic">Tanpa catatan</span>}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* TAB 2: Log Generator AI */}
            {activeTab === "generate" && (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Waktu Generate</th>
                    <th className="px-4 py-3">Jenjang & Mapel</th>
                    <th className="px-4 py-3">Paket Sasaran</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Hasil Sanitasi (Lolos / Gagal)</th>
                    <th className="px-4 py-3">Pemicu</th>
                    <th className="px-4 py-3">Rincian Evaluasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(paginatedList as GenerationLog[]).map((l) => {
                    const isExpanded = expandedLogId === l.id;
                    const detail = (l.detailPemeriksaan as any[]) || [];
                    const isSuccess = l.status === "berhasil";

                    return (
                      <React.Fragment key={l.id}>
                        <tr className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {new Date(l.startedAt).toLocaleString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{l.jenjang}</div>
                            <div className="text-[11px] text-slate-500">{l.mapel}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-indigo-600">
                              {l.packageCode || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isSuccess
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {l.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10.5px]">
                                {l.totalLolos} Lolos
                              </span>
                              {l.totalGagal > 0 && (
                                <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10.5px]">
                                  {l.totalGagal} Ditolak
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                              {l.triggeredBy}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {detail.length > 0 || l.errorMessage ? (
                              <button
                                onClick={() => setExpandedLogId(isExpanded ? null : l.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                              >
                                <span>{isExpanded ? "Tutup Detail" : "Lihat Detail"}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Semua lolos</span>
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/90">
                            <td colSpan={7} className="p-4 border-y border-slate-200">
                              <div className="space-y-2 max-w-2xl">
                                {l.errorMessage && (
                                  <div className="p-2.5 rounded bg-rose-100 border border-rose-200 text-rose-900 text-xs font-sans">
                                    <strong>Pesan Kendala:</strong> {l.errorMessage}
                                  </div>
                                )}
                                {detail.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="font-bold text-xs text-slate-800">
                                      Catatan Butir Ditolak Gerbang Sanitasi ({detail.length} butir):
                                    </span>
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                      {detail.map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="p-2 bg-white rounded border border-slate-200 text-xs text-slate-700 font-sans"
                                        >
                                          <strong className="text-amber-700">Butir #{item.index}:</strong>{" "}
                                          {item.reason}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* TAB 3: Log Audit Sistem */}
            {activeTab === "audit" && (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Aksi</th>
                    <th className="px-4 py-3">Pelaku</th>
                    <th className="px-4 py-3">Target Resource</th>
                    <th className="px-4 py-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(paginatedList as AuditLog[]).map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[10px]">
                          {l.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-mono">{l.userEmail}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-[11px] max-w-xs truncate">
                        {l.targetResource}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono">
                        {l.ipAddress || "127.0.0.1"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Paginasi Terpadu */}
        {currentList.length > 0 && (
          <TablePagination
            currentPage={validCurrentPage}
            totalPages={totalPages}
            totalItems={currentList.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30, 50, 100]}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
