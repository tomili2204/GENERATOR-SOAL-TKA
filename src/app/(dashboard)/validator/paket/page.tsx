"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PackageCard } from "@/components/packages/PackageCard";
import { TablePagination } from "@/components/ui/TablePagination";
import { AssignValidatorModal } from "@/components/packages/AssignValidatorModal";
import { FolderCheck, RefreshCw, AlertCircle, Filter, Search, ShieldCheck, UserCheck } from "lucide-react";

export default function ValidatorPaketListPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jenjangFilter, setJenjangFilter] = useState("all");
  const [tipeSumberFilter, setTipeSumberFilter] = useState("all");
  const [adminScope, setAdminScope] = useState<"all" | "assigned">("all");

  // Paging
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Assign Modal
  const [assignPkg, setAssignPkg] = useState<any>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Load current user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCurrentUser(data.user);
      })
      .catch((err) => console.error(err));
  }, []);

  const loadPackages = async () => {
    try {
      setIsLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (jenjangFilter !== "all") params.append("jenjang", jenjangFilter);
      if (tipeSumberFilter !== "all") params.append("tipeSumber", tipeSumberFilter);
      if (adminScope === "assigned") params.append("assignedOnly", "true");

      const res = await fetch(`/api/packages?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat paket.");
      }
      setPackages(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, [statusFilter, jenjangFilter, tipeSumberFilter, adminScope]);

  // Client-side search filter & sort (Terbaru ke Terlama)
  const filteredPackages = useMemo(() => {
    return packages
      .filter((pkg) => {
        const matchSearch =
          searchTerm.trim() === "" ||
          pkg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pkg.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pkg.mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (pkg.assignedValidator?.name &&
            pkg.assignedValidator.name.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchSearch;
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [packages, searchTerm]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPackages = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredPackages.slice(startIndex, startIndex + pageSize);
  }, [filteredPackages, validCurrentPage, pageSize]);

  const isAdmin = currentUser?.roles?.includes("admin");

  const handleOpenAssign = (pkg: any) => {
    setAssignPkg(pkg);
    setIsAssignOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Telaah Per Paket Soal</h1>
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              Validator Workspace
            </span>
            {!isAdmin && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Khusus Paket Ditugaskan</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {!isAdmin
              ? "Menampilkan paket soal yang ditugaskan secara resmi kepada Anda oleh Administrator untuk ditelaah."
              : "Penelaahan naskah tryout terstruktur 30 nomor secara komprehensif untuk paket buatan Human (H) maupun AI (A)."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {isAdmin && (
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setAdminScope("all");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  adminScope === "all"
                    ? "bg-white text-slate-900 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semua Paket
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminScope("assigned");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  adminScope === "assigned"
                    ? "bg-white text-slate-900 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ditugaskan ke Saya
              </button>
            </div>
          )}

          <button
            onClick={loadPackages}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Muat Ulang</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "all", label: "Semua Status" },
              { key: "dalam_validasi", label: "Perlu Validasi" },
              { key: "perlu_revisi", label: "Perlu Revisi" },
              { key: "siap_rilis", label: "Siap Rilis" },
              { key: "draft", label: "Draft" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setStatusFilter(tab.key);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-slate-900 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tipeSumberFilter}
              onChange={(e) => {
                setTipeSumberFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs cursor-pointer"
            >
              <option value="all">Semua Sumber (H & A)</option>
              <option value="manual">Human (H)</option>
              <option value="ai">AI Generated (A)</option>
            </select>

            <select
              value={jenjangFilter}
              onChange={(e) => {
                setJenjangFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono text-xs cursor-pointer"
            >
              <option value="all">Semua Jenjang</option>
              <option value="SD/MI">SD/MI</option>
              <option value="SMP/MTs">SMP/MTs</option>
              <option value="SMA/MA">SMA/MA</option>
              <option value="SMK/MAK">SMK/MAK</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari kode paket, nama paket, mata pelajaran, validator..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Paket */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-xl border border-slate-200 p-5 h-64 animate-pulse" />
          ))}
        </div>
      ) : paginatedPackages.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed space-y-3">
          <FolderCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">
            {!isAdmin ? "Belum Ada Paket yang Ditugaskan" : "Tidak Ada Paket yang Sesuai Filter"}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {!isAdmin
              ? "Administrator belum menugaskan paket soal untuk Anda telaah. Paket yang ditugaskan kepada Anda akan otomatis muncul di sini."
              : "Belum ada paket soal yang memerlukan telaah pada filter saat ini."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                basePath="/validator/paket"
                actionLabel="Telaah Naskah"
                currentUserId={currentUser?.id}
                onAssignClick={isAdmin ? handleOpenAssign : undefined}
              />
            ))}
          </div>

          {/* TablePagination Component with 10, 20, 30, 50, 100 options */}
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
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
        </div>
      )}

      {/* Assign Validator Modal for Admin */}
      <AssignValidatorModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        pkg={assignPkg}
        onSuccess={() => {
          loadPackages();
        }}
      />
    </div>
  );
}
