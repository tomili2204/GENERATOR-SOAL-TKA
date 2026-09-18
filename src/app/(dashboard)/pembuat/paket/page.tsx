"use client";

import React, { useState, useEffect, useMemo } from "react";
import { PackageCard } from "@/components/packages/PackageCard";
import { TablePagination } from "@/components/ui/TablePagination";
import { Plus, Filter, Package, AlertCircle, RefreshCw, X, Search } from "lucide-react";

export default function PembuatPaketListPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jenjangFilter, setJenjangFilter] = useState("all");

  // Paging State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newJenjang, setNewJenjang] = useState("SD/MI");
  const [newMapel, setNewMapel] = useState("Matematika");
  const [customNama, setCustomNama] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadPackages = async () => {
    try {
      setIsLoading(true);
      setError("");
      const params = new URLSearchParams({
        authorOnly: "true",
        tipeSumber: "manual",
      });
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (jenjangFilter !== "all") params.append("jenjang", jenjangFilter);

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
  }, [statusFilter, jenjangFilter]);

  // Search Filter & Sort (Terbaru ke Terlama)
  const filteredPackages = useMemo(() => {
    return packages
      .filter((pkg) => {
        const matchSearch =
          searchTerm.trim() === "" ||
          pkg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pkg.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pkg.mapel.toLowerCase().includes(searchTerm.toLowerCase());

        return matchSearch;
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [packages, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedPackages = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredPackages.slice(startIndex, startIndex + pageSize);
  }, [filteredPackages, validCurrentPage, pageSize]);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    try {
      setIsCreating(true);
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenjang: newJenjang,
          mapel: newMapel,
          tipeSumber: "manual",
          customNama,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal membuat paket.");
      }
      setIsCreateOpen(false);
      setCustomNama("");
      loadPackages();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Manajemen Paket Soal (H)</h1>
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              Human Upload
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Organisasi naskah ujian tryout utuh (target 30 slot per paket) dengan pemantauan kelulusan validasi real-time.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Paket Baru (H)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Tab */}
            {[
              { key: "all", label: "Semua Status" },
              { key: "draft", label: "Draft" },
              { key: "dalam_validasi", label: "Dalam Validasi" },
              { key: "perlu_revisi", label: "Perlu Revisi / Pengganti" },
              { key: "siap_rilis", label: "Siap Rilis (100%)" },
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

          <div className="flex items-center gap-2">
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
            </select>

            <button
              onClick={loadPackages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Muat Ulang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari kode paket, nama paket, mata pelajaran..."
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
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Belum Ada Paket Soal</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Mulai naskah tryout baru dengan membuat paket naskah berisi 30 slot kisi-kisi terstandarisasi.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Paket Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPackages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} basePath="/pembuat/paket" />
            ))}
          </div>

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

      {/* Modal Pembuatan Paket Baru */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold">Buat Paket Soal Baru (H)</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePackage} className="p-5 space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                  {createError}
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jenjang Pendidikan</label>
                <select
                  value={newJenjang}
                  onChange={(e) => setNewJenjang(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                >
                  <option value="SD/MI">SD/MI</option>
                  <option value="SMP/MTs">SMP/MTs</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mata Pelajaran</label>
                <select
                  value={newMapel}
                  onChange={(e) => setNewMapel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                >
                  <option value="Matematika">Matematika</option>
                  <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Paket <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={customNama}
                  onChange={(e) => setCustomNama(e.target.value)}
                  placeholder="Kosongkan untuk otomatis (mis: Paket H1 SD Matematika)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Struktur Paket:</p>
                <p>• Kuota: Tepat 30 butir soal (15 PG, 8 PGK MCMA, 7 PGK Kategori)</p>
                <p>• Kode: Format otomatis `H01-...`, `H02-...`</p>
                <p>• Gerbang: Siap Terbit saat 30/30 butir disetujui validator</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isCreating ? "Membuat..." : "Buat Paket 30 Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
