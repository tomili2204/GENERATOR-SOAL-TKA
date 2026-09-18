"use client";

import React, { useState, useMemo } from "react";
import { Question } from "@/db/schema";
import { StatusBadge } from "@/components/ui/Badge";
import { TablePagination } from "@/components/ui/TablePagination";
import { isJenjangMatch } from "@/lib/jenjang-utils";
import { Search, Filter, Layers, BookOpen } from "lucide-react";

interface BankSoalTableWithPagingProps {
  questions: Question[];
  currentUserId: string;
  currentUserName: string;
  usersMap?: Record<string, string>;
}

export function BankSoalTableWithPaging({
  questions,
  currentUserId,
  currentUserName,
  usersMap = {},
}: BankSoalTableWithPagingProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [jenjangFilter, setJenjangFilter] = useState("all");
  const [mapelFilter, setMapelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter questions based on search & dropdowns
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSearch =
        searchTerm.trim() === "" ||
        q.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.elemen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.subElemen && q.subElemen.toLowerCase().includes(searchTerm.toLowerCase())) ||
        q.mapel.toLowerCase().includes(searchTerm.toLowerCase());

      const matchJenjang = jenjangFilter === "all" || isJenjangMatch(q.jenjang, jenjangFilter);
      const matchMapel =
        mapelFilter === "all" || q.mapel.toLowerCase().trim() === mapelFilter.toLowerCase().trim();
      const matchStatus = statusFilter === "all" || q.status === statusFilter;

      return matchSearch && matchJenjang && matchMapel && matchStatus;
    });
  }, [questions, searchTerm, jenjangFilter, mapelFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedQuestions = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredQuestions.slice(startIndex, startIndex + pageSize);
  }, [filteredQuestions, validCurrentPage, pageSize]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header & Controls */}
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
              Sampel Data Bank Soal & Status Pemisahan Tugas
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola dan pantau butir soal dengan fasilitas paginasi dinamis (10, 20, 30, 50, 100)
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium self-start sm:self-auto">
            Total {filteredQuestions.length} dari {questions.length} Butir Soal
          </span>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {/* Pencarian */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari kode, elemen, mapel..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />
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

          {/* Filter Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-700 cursor-pointer"
            >
              <option value="all">Semua Status Validasi</option>
              <option value="menunggu_validasi">Menunggu Validasi</option>
              <option value="disetujui">Disetujui</option>
              <option value="perlu_revisi">Perlu Revisi</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Kode Soal</th>
              <th className="px-4 py-3">Jenjang</th>
              <th className="px-4 py-3">Mata Pelajaran</th>
              <th className="px-4 py-3">Elemen Materi</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Pengunggah (Author)</th>
              <th className="px-4 py-3 text-right">Aturan Validasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedQuestions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-sans text-xs">
                  Tidak ada data soal yang sesuai dengan kriteria filter.
                </td>
              </tr>
            ) : (
              paginatedQuestions.map((q) => {
                const isAuthorCurrent = q.authorId === currentUserId;

                return (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{q.code}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                        {q.jenjang}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-sans font-medium">{q.mapel}</td>
                    <td className="px-4 py-3 text-slate-600 font-sans">{q.elemen}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="px-4 py-3">
                      {isAuthorCurrent ? (
                        <span className="font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200 text-[11px]">
                          Anda ({currentUserName.split(" ")[0]})
                        </span>
                      ) : (
                        <span className="text-slate-700 font-medium text-xs font-sans">
                          {usersMap[q.authorId] || "–"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-sans">
                      {q.status === "menunggu_validasi" ? (
                        isAuthorCurrent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            ⛔ Dilarang Validasi Sendiri
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ Dapat Divalidasi
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px]">Telah diproses</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <TablePagination
        currentPage={validCurrentPage}
        totalPages={totalPages}
        totalItems={filteredQuestions.length}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 30, 50, 100]}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
