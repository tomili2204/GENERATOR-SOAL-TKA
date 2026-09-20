"use client";

import React, { useState, useEffect } from "react";
import {
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Layers,
  BookOpen,
  Sparkles,
  Eye,
  Check,
} from "lucide-react";
import { QuestionReviewModal } from "./QuestionReviewModal";
import { TablePagination } from "@/components/ui/TablePagination";

interface ValidatorQueueViewProps {
  initialItems: any[];
  currentUserId: string;
}

export function ValidatorQueueView({
  initialItems,
  currentUserId,
}: ValidatorQueueViewProps) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [loading, setLoading] = useState(false);

  // Pagination States
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter States
  const [filterJenjang, setFilterJenjang] = useState("semua");
  const [filterMapel, setFilterMapel] = useState("semua");
  const [filterBentuk, setFilterBentuk] = useState("semua");
  const [filterSumber, setFilterSumber] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Review State
  const [inspectingQuestion, setInspectingQuestion] = useState<any | null>(null);

  // Feedback Notification Banner
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const params = new URLSearchParams();
      if (filterJenjang !== "semua") params.append("jenjang", filterJenjang);
      if (filterMapel !== "semua") params.append("mapel", filterMapel);
      if (filterBentuk !== "semua") params.append("bentuk_soal", filterBentuk);
      if (filterSumber !== "semua") params.append("sumber", filterSumber);

      const res = await fetch(`/api/validator/queue?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: "Gagal memuat antrean validasi." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [filterJenjang, filterMapel, filterBentuk, filterSumber]);

  const handleReviewSubmit = async (
    questionId: string,
    decision: "disetujui" | "ditolak" | "direvisi",
    notes?: string
  ) => {
    const res = await fetch("/api/validator/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, decision, notes }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Gagal memproses validasi.");
    }

    setFeedback({
      type: "success",
      message: json.message || "Keputusan validasi berhasil disimpan.",
    });

    // Keluarkan soal yang sudah divalidasi dari antrean lokal
    setItems((prev) => prev.filter((q) => q.id !== questionId));
  };

  // Reset ke halaman 1 saat filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterJenjang, filterMapel, filterBentuk, filterSumber, searchQuery]);

  // Filter teks pencarian lokal
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.code.toLowerCase().includes(query) ||
      item.elemen.toLowerCase().includes(query) ||
      (item.subElemen && item.subElemen.toLowerCase().includes(query)) ||
      (item.payload?.soal_text && item.payload.soal_text.toLowerCase().includes(query))
    );
  });

  // Perhitungan Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice(
    (validCurrentPage - 1) * pageSize,
    validCurrentPage * pageSize
  );

  return (
    <div className="space-y-5">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Bilah Filter Utilitarian */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Filter Antrean Telaah
            </h3>
          </div>
          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600 font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan Antrean</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          {/* Filter Mapel */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Mata Pelajaran
            </label>
            <select
              value={filterMapel}
              onChange={(e) => setFilterMapel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="semua">Semua Mata Pelajaran</option>
              <option value="Matematika">Matematika</option>
              <option value="Bahasa Indonesia">Bahasa Indonesia</option>
            </select>
          </div>

          {/* Filter Bentuk Soal */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Bentuk Soal
            </label>
            <select
              value={filterBentuk}
              onChange={(e) => setFilterBentuk(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="semua">Semua Bentuk</option>
              <option value="PG">Pilihan Ganda (PG)</option>
              <option value="PGK_MCMA">PGK MCMA</option>
              <option value="PGK_KATEGORI">PGK Kategori</option>
            </select>
          </div>

          {/* Pencarian Teks */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Cari Kode / Kata Kunci
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kode, elemen, teks..."
                className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg pl-8 pr-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabel / Daftar Antrean Soal */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-600 font-mono">
            Menampilkan <strong>{filteredItems.length}</strong> butir soal siap telaah
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Status: <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">menunggu_validasi</span>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">Tidak ada butir soal dalam antrean yang cocok dengan filter saat ini.</p>
            <p className="text-slate-400">Coba ubah kombinasi filter atau segarkan halaman.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Kode & Bentuk</th>
                  <th className="px-4 py-3">Jenjang & Mapel</th>
                  <th className="px-4 py-3">Elemen / Kisi-Kisi</th>
                  <th className="px-4 py-3">Pengunggah</th>
                  <th className="px-4 py-3">Pemisahan Tugas</th>
                  <th className="px-4 py-3 text-right">Aksi Telaah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedItems.map((item) => {
                  const isSelf = item.authorId === currentUserId;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Kode & Bentuk */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{item.code}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {item.bentukSoal || "PG"}
                          </span>
                          {item.jenisSoal === "grup" && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                              <BookOpen className="w-2.5 h-2.5" />
                              Grup
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Jenjang & Mapel */}
                      <td className="px-4 py-3 text-slate-800">
                        <span className="font-semibold">{item.jenjang}</span>
                        <div className="text-slate-500 text-[11px]">{item.mapel}</div>
                      </td>

                      {/* Elemen / Kisi-Kisi */}
                      <td className="px-4 py-3 font-sans text-slate-700 max-w-xs">
                        <div className="font-medium text-slate-900 truncate">{item.elemen}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {item.subElemen || item.kompetensi || "–"}
                        </div>
                      </td>

                      {/* Pengunggah */}
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-800 font-medium font-sans">
                          {isSelf ? (
                            <strong className="text-violet-700 font-mono">Anda Sendiri</strong>
                          ) : (
                            item.authorName || (item as any).author?.name || "Tim Penulis"
                          )}
                        </div>
                      </td>

                      {/* Status Pemisahan Tugas */}
                      <td className="px-4 py-3 font-sans">
                        {isSelf ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            Dilarang (Soal Sendiri)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            Dapat Ditelaah
                          </span>
                        )}
                      </td>

                      {/* Aksi Telaah */}
                      <td className="px-4 py-3 text-right font-sans">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setInspectingQuestion(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Telaah & Render</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TablePagination Component */}
        {filteredItems.length > 0 && (
          <TablePagination
            currentPage={validCurrentPage}
            totalPages={totalPages}
            totalItems={filteredItems.length}
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

      {/* Modal Review Render KaTeX & Aksi Validasi */}
      {inspectingQuestion && (
        <QuestionReviewModal
          question={inspectingQuestion}
          currentUserId={currentUserId}
          onClose={() => setInspectingQuestion(null)}
          onReviewSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
}
