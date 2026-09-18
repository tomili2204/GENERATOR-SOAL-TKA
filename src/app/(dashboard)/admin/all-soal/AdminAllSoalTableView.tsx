"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Question } from "@/db/schema";
import { StatusBadge } from "@/components/ui/Badge";
import { TablePagination } from "@/components/ui/TablePagination";
import { LatexPreview } from "@/components/ui/LatexPreview";
import { isJenjangMatch } from "@/lib/jenjang-utils";
import {
  Search,
  Filter,
  Eye,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ExternalLink,
  FileText,
  X,
  Layers,
  Sparkles,
  BookOpen,
} from "lucide-react";

interface UserInfo {
  name: string;
  email: string;
}

interface PackageInfo {
  code: string;
  nama: string;
}

interface StimulusInfo {
  tipe: string;
  konten: string;
}

interface AdminAllSoalTableViewProps {
  questions: Question[];
  usersMap: Record<string, UserInfo>;
  packagesMap: Record<string, PackageInfo>;
  stimuliMap: Record<string, StimulusInfo>;
}

export function AdminAllSoalTableView({
  questions,
  usersMap,
  packagesMap,
  stimuliMap,
}: AdminAllSoalTableViewProps) {
  // State Filter & Pencarian
  const [searchTerm, setSearchTerm] = useState("");
  const [jenjangFilter, setJenjangFilter] = useState("all");
  const [mapelFilter, setMapelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bentukFilter, setBentukFilter] = useState("all");
  const [kesulitanFilter, setKesulitanFilter] = useState("all");

  // State Paginasi
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // State Modal Pratinjau Soal
  const [selectedQuestion, setSelectedQuestion] = useState<(Question & { payload: any }) | null>(null);
  const [modalTab, setModalTab] = useState<"soal" | "pembahasan" | "metadata">("soal");

  // Statistik Ringkas (KPI)
  const stats = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let revision = 0;
    let draft = 0;

    questions.forEach((q) => {
      if (q.status === "disetujui") approved++;
      else if (q.status === "menunggu_validasi") pending++;
      else if (q.status === "perlu_revisi" || q.status === "ditolak") revision++;
      else if (q.status === "draft") draft++;
    });

    return { total: questions.length, approved, pending, revision, draft };
  }, [questions]);

  // Logika Filter Data
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // 1. Pencarian Teks
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const authorInfo = q.authorId ? usersMap[q.authorId] : null;
        const validatorInfo = q.validatorId ? usersMap[q.validatorId] : null;
        const pkgInfo = q.paketId ? packagesMap[q.paketId] : null;
        const payloadObj = (q.payload as any) || {};
        const payloadText = payloadObj.soal_text || payloadObj.questionText || "";

        const matchCode = q.code.toLowerCase().includes(term);
        const matchElemen = q.elemen.toLowerCase().includes(term);
        const matchSub = (q.subElemen || "").toLowerCase().includes(term);
        const matchMapel = q.mapel.toLowerCase().includes(term);
        const matchText = payloadText.toLowerCase().includes(term);
        const matchPkg = pkgInfo ? pkgInfo.code.toLowerCase().includes(term) || pkgInfo.nama.toLowerCase().includes(term) : false;
        const matchAuthor = authorInfo ? authorInfo.name.toLowerCase().includes(term) || authorInfo.email.toLowerCase().includes(term) : false;
        const matchValidator = validatorInfo ? validatorInfo.name.toLowerCase().includes(term) || validatorInfo.email.toLowerCase().includes(term) : false;

        if (!matchCode && !matchElemen && !matchSub && !matchMapel && !matchText && !matchPkg && !matchAuthor && !matchValidator) {
          return false;
        }
      }

      // 2. Dropdown Filter
      if (jenjangFilter !== "all" && !isJenjangMatch(q.jenjang, jenjangFilter)) return false;
      if (mapelFilter !== "all" && q.mapel !== mapelFilter) return false;
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (bentukFilter !== "all" && q.bentukSoal !== bentukFilter) return false;
      if (kesulitanFilter !== "all" && q.tingkatKesulitan !== kesulitanFilter) return false;

      return true;
    });
  }, [questions, searchTerm, jenjangFilter, mapelFilter, statusFilter, bentukFilter, kesulitanFilter, usersMap, packagesMap]);

  // Perhitungan Paginasi
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedQuestions = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredQuestions.slice(startIndex, startIndex + pageSize);
  }, [filteredQuestions, validCurrentPage, pageSize]);

  // Handler Ganti Halaman
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Handler Ganti Ukuran Halaman
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Reset Semua Filter
  const handleResetFilters = () => {
    setSearchTerm("");
    setJenjangFilter("all");
    setMapelFilter("all");
    setStatusFilter("all");
    setBentukFilter("all");
    setKesulitanFilter("all");
    setCurrentPage(1);
  };

  const isFilterActive =
    searchTerm.trim() !== "" ||
    jenjangFilter !== "all" ||
    mapelFilter !== "all" ||
    statusFilter !== "all" ||
    bentukFilter !== "all" ||
    kesulitanFilter !== "all";

  // Label Bentuk Soal
  const getBentukBadge = (bentuk: string) => {
    switch (bentuk) {
      case "PG":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">PG</span>;
      case "PGK_MCMA":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">PGK (Multi)</span>;
      case "PGK_KATEGORI":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">PGK (Tabel)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">{bentuk}</span>;
    }
  };

  // Label Kesulitan
  const getKesulitanBadge = (kesulitan: string | null) => {
    switch (kesulitan) {
      case "rendah":
        return <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Rendah</span>;
      case "sedang":
        return <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Sedang</span>;
      case "tinggi":
        return <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Tinggi</span>;
      default:
        return <span className="text-[10px] text-slate-400">–</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. KPI Cards Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">Total Bank Soal</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-500">butir</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider font-mono">Disetujui</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">{stats.approved}</span>
            <span className="text-xs text-emerald-600">siap tayang</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider font-mono">Menunggu Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-700">{stats.pending}</span>
            <span className="text-xs text-amber-600">antrean</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-rose-200 bg-rose-50/20 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider font-mono">Perlu Revisi/Draft</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-700">{stats.revision + stats.draft}</span>
            <span className="text-xs text-rose-600">butir</span>
          </div>
        </div>
      </div>

      {/* 2. Container Tabel Utama dengan Filter & Paging */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Seluruh Bank Soal Terdaftar ({filteredQuestions.length}{isFilterActive ? ` dari ${questions.length}` : ""})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola, telusuri, dan pratinjau butir soal lengkap dengan filter multi-parameter dan paginasi terpadu.
              </p>
            </div>

            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition-colors self-start sm:self-auto shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filter
              </button>
            )}
          </div>

          {/* Baris Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Input Pencarian */}
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari kode, materi, soal, author..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Jenjang */}
            <div>
              <select
                value={jenjangFilter}
                onChange={(e) => {
                  setJenjangFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer font-sans"
              >
                <option value="all">Semua Jenjang</option>
                <option value="SD/MI">SD/MI</option>
                <option value="SMP/MTs">SMP/MTs</option>
                <option value="SMA/MA">SMA/MA</option>
                <option value="SMK/MAK">SMK/MAK</option>
              </select>
            </div>

            {/* Filter Mapel */}
            <div>
              <select
                value={mapelFilter}
                onChange={(e) => {
                  setMapelFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer font-sans"
              >
                <option value="all">Semua Mapel</option>
                <option value="Matematika">Matematika</option>
                <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                <option value="Bahasa Inggris">Bahasa Inggris</option>
              </select>
            </div>

            {/* Filter Bentuk Soal */}
            <div>
              <select
                value={bentukFilter}
                onChange={(e) => {
                  setBentukFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer font-sans"
              >
                <option value="all">Semua Bentuk</option>
                <option value="PG">Pilihan Ganda (PG)</option>
                <option value="PGK_MCMA">PGK (Multi-Jawaban)</option>
                <option value="PGK_KATEGORI">PGK (Tabel/Kategori)</option>
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 cursor-pointer font-sans"
              >
                <option value="all">Semua Status</option>
                <option value="menunggu_validasi">Menunggu Validasi</option>
                <option value="disetujui">Disetujui</option>
                <option value="perlu_revisi">Perlu Revisi</option>
                <option value="draft">Draft</option>
                <option value="ditolak">Ditolak</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabel Soal */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-mono">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No.</th>
                <th className="px-4 py-3">Kode Soal</th>
                <th className="px-4 py-3">Paket Asal</th>
                <th className="px-4 py-3">Jenjang & Mapel</th>
                <th className="px-4 py-3">Elemen Materi</th>
                <th className="px-4 py-3">Bentuk & Kesulitan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pengunggah / Validator</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedQuestions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-600">Tidak ada data soal yang sesuai dengan kriteria filter.</p>
                      {isFilterActive && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                        >
                          Bersihkan Filter Pencarian
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedQuestions.map((q, idx) => {
                  const itemIndex = (validCurrentPage - 1) * pageSize + idx + 1;
                  const author = q.authorId ? usersMap[q.authorId] : null;
                  const validator = q.validatorId ? usersMap[q.validatorId] : null;
                  const pkg = q.paketId ? packagesMap[q.paketId] : null;

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* No. */}
                      <td className="px-4 py-3.5 text-center font-mono text-slate-400 text-[11px]">
                        {itemIndex}
                      </td>

                      {/* Kode Soal */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-slate-900">{q.code}</span>
                          {q.nomorUrut && (
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                              #{q.nomorUrut}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Paket Asal */}
                      <td className="px-4 py-3.5">
                        {pkg ? (
                          <Link
                            href={`/pembuat/paket/${q.paketId}`}
                            className="inline-flex items-center gap-1 font-mono text-indigo-600 hover:text-indigo-800 hover:underline text-[11.5px] font-medium"
                            title={pkg.nama}
                          >
                            {pkg.code}
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </Link>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">–</span>
                        )}
                      </td>

                      {/* Jenjang & Mapel */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{q.jenjang}</span>
                          <span className="text-[11px] text-slate-500">{q.mapel}</span>
                        </div>
                      </td>

                      {/* Elemen & Sub-Elemen */}
                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="truncate font-medium text-slate-700" title={q.elemen}>
                          {q.elemen}
                        </div>
                        {q.subElemen && (
                          <div className="truncate text-[11px] text-slate-400" title={q.subElemen}>
                            {q.subElemen}
                          </div>
                        )}
                      </td>

                      {/* Bentuk Soal & Kesulitan */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {getBentukBadge(q.bentukSoal)}
                          {getKesulitanBadge(q.tingkatKesulitan)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusBadge status={q.status} />
                      </td>

                      {/* Pengunggah & Validator */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] text-slate-700 font-medium">
                            {author ? author.name : `ID: ${q.authorId.slice(0, 8)}...`}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Val: {validator ? validator.name : "–"}
                          </span>
                        </div>
                      </td>

                      {/* Aksi: Pratinjau Soal */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => {
                            setSelectedQuestion(q);
                            setModalTab("soal");
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-colors shadow-xs"
                          title="Pratinjau Soal Lengkap"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Paginasi Terpadu */}
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

      {/* 3. Modal Pratinjau Soal Lengkap (Admin Inspection Modal) */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold font-mono text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                  {selectedQuestion.code}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                    {selectedQuestion.jenjang} · {selectedQuestion.mapel}
                  </span>
                  {getBentukBadge(selectedQuestion.bentukSoal)}
                  <StatusBadge status={selectedQuestion.status} />
                </div>
              </div>

              <button
                onClick={() => setSelectedQuestion(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                title="Tutup (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigasi Tab Modal */}
            <div className="flex border-b border-slate-200 px-6 bg-white gap-6 text-xs font-semibold">
              <button
                onClick={() => setModalTab("soal")}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  modalTab === "soal"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileText className="w-4 h-4" />
                Soal & Pilihan
              </button>
              <button
                onClick={() => setModalTab("pembahasan")}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  modalTab === "pembahasan"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Pembahasan & Solusi
              </button>
              <button
                onClick={() => setModalTab("metadata")}
                className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  modalTab === "metadata"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers className="w-4 h-4" />
                Metadata & Riwayat
              </button>
            </div>

            {/* Isi Konten Tab Modal */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {modalTab === "soal" && (
                <div className="space-y-4">
                  {/* Stimulus jika ada */}
                  {selectedQuestion.stimulusId && stimuliMap[selectedQuestion.stimulusId] && (
                    <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-2">
                      <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        Stimulus Pendukung
                      </span>
                      <div className="text-slate-800 text-xs leading-relaxed">
                        <LatexPreview content={stimuliMap[selectedQuestion.stimulusId].konten} />
                      </div>
                    </div>
                  )}

                  {/* Teks Butir Soal */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-500">
                      Teks Butir Soal
                    </span>
                    <div className="text-slate-900 text-sm leading-relaxed font-sans">
                      <LatexPreview content={selectedQuestion.payload?.soal_text || "_Tidak ada teks soal._"} />
                    </div>
                  </div>

                  {/* Diagram SVG jika ada */}
                  {selectedQuestion.payload?.gambar?.tipe === "svg" && selectedQuestion.payload.gambar.svg_content && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center">
                      <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-500 mb-2">
                        Diagram Geometri / Visual
                      </span>
                      <div
                        dangerouslySetInnerHTML={{ __html: selectedQuestion.payload.gambar.svg_content }}
                        className="max-w-full overflow-x-auto"
                      />
                    </div>
                  )}

                  {/* Pilihan Jawaban (Untuk PG & PGK_MCMA) */}
                  {selectedQuestion.payload?.opsi && selectedQuestion.payload.opsi.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-500">
                          Pilihan Jawaban
                        </span>
                        {selectedQuestion.bentukSoal === "PGK_MCMA" && (
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                            Multi-Kunci Benar
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {selectedQuestion.payload.opsi.map((op: any, i: number) => {
                          const isKey = selectedQuestion.payload.kunci_jawaban?.includes(op.label);
                          return (
                            <div
                              key={i}
                              className={`flex items-start gap-3 p-3 rounded-xl border text-xs font-sans transition-colors ${
                                isKey
                                  ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300"
                                  : "bg-slate-50/50 border-slate-200 text-slate-700"
                              }`}
                            >
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isKey ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {op.label}
                              </span>
                              <div className="flex-1 pt-0.5">
                                <LatexPreview content={op.text} />
                              </div>
                              {isKey && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                  Kunci Jawaban
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tabel Pernyataan (Khusus PGK_KATEGORI) */}
                  {selectedQuestion.payload?.pernyataan && selectedQuestion.payload.pernyataan.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-500">
                        Tabel Pernyataan & Respons (PGK Kategori)
                      </span>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[11px]">
                            <tr>
                              <th className="px-3 py-2 w-10 text-center">No</th>
                              <th className="px-3 py-2">Pernyataan</th>
                              <th className="px-3 py-2 w-28 text-center">Kunci</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {selectedQuestion.payload.pernyataan.map((item: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 text-center font-mono text-slate-400">{item.no || idx + 1}</td>
                                <td className="px-3 py-2 text-slate-800"><LatexPreview content={item.text} /></td>
                                <td className="px-3 py-2 text-center font-bold text-emerald-700 font-mono">
                                  {selectedQuestion.payload.kunci_jawaban?.[idx] || "–"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {modalTab === "pembahasan" && (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Pembahasan Lengkap & Solusi Prosedural
                  </span>
                  <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5">
                    <LatexPreview content={selectedQuestion.payload?.pembahasan || "_Belum ada pembahasan._"} />
                  </div>
                </div>
              )}

              {modalTab === "metadata" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-500 block">
                      Taksonomi & Kompetensi
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-slate-400">Elemen:</span>{" "}
                        <span className="font-semibold text-slate-800">{selectedQuestion.elemen}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Sub-Elemen:</span>{" "}
                        <span className="font-semibold text-slate-800">{selectedQuestion.subElemen || "–"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Kompetensi:</span>{" "}
                        <span className="text-slate-800">{selectedQuestion.kompetensi || "–"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Level Kognitif:</span>{" "}
                        <span className="font-semibold text-slate-800">{selectedQuestion.levelKognitif || "–"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Tingkat Kesulitan:</span>{" "}
                        <span className="font-semibold text-slate-800 capitalize">{selectedQuestion.tingkatKesulitan || "–"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-500 block">
                      Administrasi & Pelacakan
                    </span>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-slate-400">Paket Asal:</span>{" "}
                        <span className="font-mono font-semibold text-indigo-700">
                          {selectedQuestion.paketId && packagesMap[selectedQuestion.paketId]
                            ? packagesMap[selectedQuestion.paketId].code
                            : "–"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Author (Pengunggah):</span>{" "}
                        <span className="font-medium text-slate-800">
                          {selectedQuestion.authorId && usersMap[selectedQuestion.authorId]
                            ? usersMap[selectedQuestion.authorId].name
                            : "–"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Validator Penelaah:</span>{" "}
                        <span className="font-medium text-slate-800">
                          {selectedQuestion.validatorId && usersMap[selectedQuestion.validatorId]
                            ? `${usersMap[selectedQuestion.validatorId].name} (${usersMap[selectedQuestion.validatorId].email})`
                            : selectedQuestion.validatorId || "Belum ditelaah"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Catatan Validasi:</span>{" "}
                        <span className="text-slate-700 italic">
                          {selectedQuestion.validationNotes || "–"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Dibuat Pada:</span>{" "}
                        <span className="text-slate-700 font-mono">
                          {new Date(selectedQuestion.createdAt).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                ID: {selectedQuestion.id}
              </span>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
