"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Search,
  Filter,
} from "lucide-react";
import { TablePagination } from "@/components/ui/TablePagination";
import { isJenjangMatch } from "@/lib/jenjang-utils";

export interface HistoryRecord {
  id: string;
  questionId: string | null;
  questionCode: string | null;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  notes: string | null;
  createdAt: any;
  jenjang?: string | null;
  mapel?: string | null;
  elemen?: string | null;
  bentukSoal?: string | null;
  sumber?: string | null;
}

interface ValidatorRiwayatViewProps {
  records: HistoryRecord[];
  validatorEmail: string;
}

export function ValidatorRiwayatView({
  records,
  validatorEmail,
}: ValidatorRiwayatViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKeputusan, setFilterKeputusan] = useState("semua");
  const [filterJenjang, setFilterJenjang] = useState("semua");

  // Pagination states
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterKeputusan, filterJenjang]);

  // Filtering
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Filter search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = rec.questionCode?.toLowerCase().includes(q);
        const matchNotes = rec.notes?.toLowerCase().includes(q);
        const matchElemen = rec.elemen?.toLowerCase().includes(q);
        if (!matchCode && !matchNotes && !matchElemen) return false;
      }

      // Filter keputusan
      if (filterKeputusan !== "semua") {
        if (filterKeputusan === "disetujui" && rec.newStatus !== "disetujui") return false;
        if (
          filterKeputusan === "revisi" &&
          rec.newStatus !== "direvisi" &&
          rec.newStatus !== "perlu_revisi"
        )
          return false;
        if (filterKeputusan === "ditolak" && rec.newStatus !== "ditolak") return false;
      }

      // Filter jenjang
      if (filterJenjang !== "semua") {
        if (!isJenjangMatch(rec.jenjang, filterJenjang)) return false;
      }

      return true;
    });
  }, [records, searchQuery, filterKeputusan, filterJenjang]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, validCurrentPage, pageSize]);

  return (
    <div className="space-y-5">
      {/* Bilah Filter & Pencarian */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Filter Riwayat Telaah
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Pencarian */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Cari Kode Soal / Catatan
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kode soal, catatan..."
                className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg pl-8 pr-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Filter Keputusan */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Keputusan Validasi
            </label>
            <select
              value={filterKeputusan}
              onChange={(e) => setFilterKeputusan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="semua">Semua Keputusan</option>
              <option value="disetujui">Disetujui</option>
              <option value="revisi">Minta Revisi</option>
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

      {/* Kontainer Tabel Riwayat */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-700">
            Daftar Aksi Telaah ({filteredRecords.length})
          </h2>
          <div className="text-[11px] font-mono text-slate-500">
            Akun: <span className="font-semibold text-slate-700">{validatorEmail}</span>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">
              Tidak ada catatan validasi yang cocok dengan filter saat ini.
            </p>
            <p className="text-slate-400">
              Coba sesuaikan kata kunci pencarian atau kombinasi filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Kode Soal</th>
                  <th className="px-4 py-3">Jenjang & Mapel</th>
                  <th className="px-4 py-3">Perubahan Status</th>
                  <th className="px-4 py-3">Keputusan Anda</th>
                  <th className="px-4 py-3">Catatan / Alasan</th>
                  <th className="px-4 py-3 text-right">Waktu Eksekusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedRecords.map((rec) => {
                  const isApproved = rec.newStatus === "disetujui";
                  const isRevision =
                    rec.newStatus === "direvisi" || rec.newStatus === "perlu_revisi";
                  const isRejected = rec.newStatus === "ditolak";

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Kode Soal */}
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div>{rec.questionCode}</div>
                        {rec.bentukSoal && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {rec.bentukSoal}
                          </span>
                        )}
                      </td>

                      {/* Jenjang & Mapel */}
                      <td className="px-4 py-3 text-slate-800">
                        <span className="font-semibold">{rec.jenjang || "–"}</span>
                        <div className="text-[11px] text-slate-500">{rec.mapel || "–"}</div>
                      </td>

                      {/* Perubahan Status */}
                      <td className="px-4 py-3 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">{rec.previousStatus}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="font-bold text-slate-800">{rec.newStatus}</span>
                        </div>
                      </td>

                      {/* Keputusan */}
                      <td className="px-4 py-3">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Disetujui (Siap Tayang)
                          </span>
                        )}
                        {isRevision && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                            Minta Revisi
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Ditolak
                          </span>
                        )}
                      </td>

                      {/* Catatan / Alasan */}
                      <td className="px-4 py-3 text-slate-700 font-sans max-w-sm">
                        {rec.notes ? (
                          <div className="p-2 rounded bg-slate-50 border border-slate-200/80 text-[11.5px] leading-relaxed">
                            {rec.notes}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">–</span>
                        )}
                      </td>

                      {/* Waktu Eksekusi */}
                      <td className="px-4 py-3 text-right text-slate-500 font-mono text-[11px]">
                        {new Date(rec.createdAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TablePagination Component */}
        {filteredRecords.length > 0 && (
          <TablePagination
            currentPage={validCurrentPage}
            totalPages={totalPages}
            totalItems={filteredRecords.length}
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
