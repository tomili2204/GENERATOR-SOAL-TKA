"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  FileQuestion,
  Edit,
  AlertCircle,
  Lock,
  Plus,
  Search,
  Filter,
} from "lucide-react";
import { Question } from "@/db/schema";
import { StatusBadge } from "@/components/ui/Badge";
import { TablePagination } from "@/components/ui/TablePagination";
import { isJenjangMatch } from "@/lib/jenjang-utils";

interface PembuatMySoalViewProps {
  questions: Question[];
  userEmail: string;
}

export function PembuatMySoalView({ questions, userEmail }: PembuatMySoalViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterJenjang, setFilterJenjang] = useState("semua");

  // Pagination states
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterJenjang]);

  // Filtering
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchCode = q.code?.toLowerCase().includes(query);
        const matchElemen = q.elemen?.toLowerCase().includes(query);
        const matchText = (q.payload as any)?.soal_text?.toLowerCase().includes(query);
        if (!matchCode && !matchElemen && !matchText) return false;
      }

      // Filter status
      if (filterStatus !== "semua") {
        if (filterStatus === "revisi") {
          if (q.status !== "direvisi" && q.status !== "perlu_revisi") return false;
        } else if (q.status !== filterStatus) {
          return false;
        }
      }

      // Filter jenjang
      if (filterJenjang !== "semua" && !isJenjangMatch(q.jenjang, filterJenjang)) {
        return false;
      }

      return true;
    });
  }, [questions, searchQuery, filterStatus, filterJenjang]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedQuestions = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, validCurrentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* Bilah Filter & Pencarian */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Filter Koleksi Soal Saya
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Pencarian */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Cari Kode Soal / Materi
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kode soal, elemen..."
                className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg pl-8 pr-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Status Validasi
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="semua">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="menunggu_validasi">Menunggu Validasi</option>
              <option value="revisi">Perlu Revisi</option>
              <option value="disetujui">Disetujui</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>

          {/* Filter Jenjang */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Jenjang
            </label>
            <select
              value={filterJenjang}
              onChange={(e) => setFilterJenjang(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="semua">Semua Jenjang</option>
              <option value="SD/MI">SD / MI</option>
              <option value="SMP/MTs">SMP / MTs</option>
              <option value="SMA/MA">SMA / MA</option>
              <option value="SMK/MAK">SMK / MAK</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kontainer Tabel Soal */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-700">
            Daftar Soal Saya ({filteredQuestions.length})
          </h2>
          <div className="text-[11px] font-mono text-slate-500">
            Pembuat: <span className="font-semibold text-slate-700">{userEmail}</span>
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl space-y-3">
            <FileQuestion className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">
              Tidak ada butir soal yang cocok dengan filter saat ini.
            </p>
            <Link
              href="/pembuat/upload"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
            >
              <Plus className="w-3.5 h-3.5" />
              Mulai Unggah Soal Baru
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Kode Soal</th>
                  <th className="px-4 py-3">Jenjang & Mapel</th>
                  <th className="px-4 py-3">Bentuk & Jenis</th>
                  <th className="px-4 py-3">Status Validasi</th>
                  <th className="px-4 py-3">Catatan Revisi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedQuestions.map((q) => {
                  const canEdit =
                    q.status === "draft" ||
                    q.status === "direvisi" ||
                    q.status === "perlu_revisi";

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">{q.code}</td>
                      <td className="px-4 py-3 text-slate-800">
                        <span className="font-semibold">{q.jenjang}</span> · {q.mapel}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-sans">
                        <span className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {q.bentukSoal || "PG"}
                        </span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="text-slate-600 text-[11px]">
                          {q.jenisSoal === "grup" ? "Grup (Stimulus)" : "Tunggal"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-sans max-w-xs">
                        {q.validationNotes ? (
                          <div className="flex items-start gap-1 text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <span>{q.validationNotes}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-sans">
                        {canEdit ? (
                          <Link
                            href={`/pembuat/upload?edit=${q.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded border border-indigo-200 transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                            Edit & Ajukan Ulang
                          </Link>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded"
                            title="Soal berstatus ini tidak dapat diedit sepihak oleh pembuat."
                          >
                            <Lock className="w-3 h-3" />
                            Terkunci
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TablePagination Component */}
        {filteredQuestions.length > 0 && (
          <TablePagination
            currentPage={validCurrentPage}
            totalPages={totalPages}
            totalItems={filteredQuestions.length}
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

