"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp, Package, ShieldCheck, Sparkles, Camera } from "lucide-react";
import Link from "next/link";
import { TablePagination } from "@/components/ui/TablePagination";

const NANO_BANANA_MARKER = "__NANO_BANANA_STATS__";

interface NanoBananaStats {
  converted: number;
  fallback: number;
  fallbackReasons: Record<string, number>;
}

function parseNanoBananaStats(
  detailPemeriksaan: Array<{ index: number; reason: string; itemTitle?: string }> | null
): NanoBananaStats | null {
  const entry = detailPemeriksaan?.find((f) => f.itemTitle === NANO_BANANA_MARKER);
  if (!entry) return null;
  try {
    return JSON.parse(entry.reason);
  } catch {
    return null;
  }
}

function formatDate(d: Date | string) {
  try {
    const date = new Date(d);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(d);
  }
}

export interface GenerationLogItem {
  id: string;
  configId: string | null;
  jenjang: string;
  mapel: string;
  packageId: string | null;
  packageCode: string | null;
  status: "berhasil" | "gagal" | "sebagian";
  totalDiminta: number;
  totalDiterima: number;
  totalLolos: number;
  totalGagal: number;
  detailPemeriksaan: Array<{ index: number; reason: string; itemTitle?: string }> | null;
  errorMessage: string | null;
  triggeredBy: string;
  temaKonteks?: string | null;
  distribusiTema?: Record<string, number> | null;
  startedAt: string | Date;
  completedAt: string | Date | null;
}

export function GenerationLogsTable({
  initialLogs,
}: {
  initialLogs: GenerationLogItem[];
}) {
  const [logs, setLogs] = useState<GenerationLogItem[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Pagination states
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLogs = logs.slice(
    (validCurrentPage - 1) * pageSize,
    validCurrentPage * pageSize
  );

  async function refreshLogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/generator/logs");
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error("Gagal memperbarui log:", err);
    } finally {
      setLoading(false);
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Riwayat Log Eksekusi Generator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mencatat seluruh proses generate AI harian dan manual, lengkap dengan audit butir lolos dan butir yang ditolak gerbang sanitasi otomatis.
          </p>
        </div>
        <button
          onClick={refreshLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Segarkan
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center text-slate-400 font-mono text-xs">
          Belum ada riwayat proses generate soal AI. Klik tombol &quot;⚡ Generate Sekarang&quot; pada salah satu kombinasi di atas untuk memulai.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Waktu Mulai</th>
                <th className="px-4 py-3">Kombinasi</th>
                <th className="px-4 py-3">Tema Konteks</th>
                <th className="px-4 py-3">Pemicu</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Hasil Lolos / Gagal</th>
                <th className="px-4 py-3">Paket Dihasilkan</th>
                <th className="px-4 py-3 text-right">Detail Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedLogs.map((log) => {
                const isExpanded = expandedId === log.id;
                const nanoBananaStats = parseNanoBananaStats(log.detailPemeriksaan);
                const rejectedItems = (log.detailPemeriksaan || []).filter((f) => f.itemTitle !== NANO_BANANA_MARKER);
                const hasFailedItems = rejectedItems.length > 0;
                const startDate = new Date(log.startedAt);

                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(startDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] mr-1.5">
                          {log.jenjang}
                        </span>
                        <span className="font-sans font-semibold text-slate-900">{log.mapel}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.temaKonteks ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-sans font-semibold">
                            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="max-w-[180px] truncate" title={log.temaKonteks}>
                              {log.temaKonteks}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-sans">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[11px] text-slate-500">
                          {log.triggeredBy === "schedule" ? "🕒 Jadwal Cron" : "👤 Manual Admin"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.status === "berhasil" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Berhasil Penuh
                          </span>
                        )}
                        {log.status === "sebagian" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            Sebagian Lolos
                          </span>
                        )}
                        {log.status === "gagal" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            Gagal Sanitasi
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-emerald-700">{log.totalLolos} lolos</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className={log.totalGagal > 0 ? "font-semibold text-rose-700" : "text-slate-500"}>
                          {log.totalGagal} gagal
                        </span>
                        <span className="text-slate-400 text-[10px] ml-1">
                          (target {log.totalDiminta})
                        </span>
                        {nanoBananaStats && (nanoBananaStats.converted > 0 || nanoBananaStats.fallback > 0) && (
                          <span
                            className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold"
                            title={`Nano Banana: ${nanoBananaStats.converted} dikonversi ke ilustrasi kontekstual, ${nanoBananaStats.fallback} fallback ke SVG`}
                          >
                            <Camera className="w-3 h-3" />
                            {nanoBananaStats.converted}/{nanoBananaStats.fallback}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.packageId ? (
                          <Link
                            href={`/validator/paket/${log.packageId}`}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                          >
                            <Package className="w-3.5 h-3.5" />
                            {log.packageCode || log.packageId.slice(0, 8)}
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-xs">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <span>Tutup</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <span>Lihat Log</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable row for inspection details */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="space-y-3">
                            {log.temaKonteks && (
                              <div className="p-3 bg-white border border-indigo-200 rounded-lg text-xs font-sans space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800 flex items-center gap-1.5 font-mono">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                    Tema Konteks Terpilih: <span className="text-indigo-700 font-bold">{log.temaKonteks}</span>
                                  </span>
                                </div>
                                {log.distribusiTema && Object.keys(log.distribusiTema).length > 0 && (
                                  <div>
                                    <span className="text-[11px] font-mono text-slate-500 block mb-1">
                                      Sebaran Sub-Konteks Aktual ({Object.keys(log.distribusiTema).length} variasi):
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {Object.entries(log.distribusiTema).map(([k, v]) => (
                                        <span
                                          key={k}
                                          className={`px-2 py-0.5 rounded-md text-[11px] border font-mono ${
                                            v > 6
                                              ? "bg-amber-50 border-amber-300 text-amber-900 font-bold"
                                              : "bg-slate-50 border-slate-200 text-slate-700"
                                          }`}
                                        >
                                          {k}: <strong>{v} butir</strong>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {log.errorMessage && (
                              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-mono">
                                <strong>Pesan Error Sistem:</strong> {log.errorMessage}
                              </div>
                            )}

                            {nanoBananaStats && (nanoBananaStats.converted > 0 || nanoBananaStats.fallback > 0) && (
                              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs font-sans space-y-1.5">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5 font-mono">
                                  <Camera className="w-3.5 h-3.5 text-amber-600" />
                                  Konversi Ilustrasi Kontekstual Nano Banana Pro
                                </span>
                                <p className="text-slate-700">
                                  <strong className="text-emerald-700">{nanoBananaStats.converted} butir</strong> berhasil
                                  dikonversi menjadi ilustrasi kontekstual,{" "}
                                  <strong className={nanoBananaStats.fallback > 0 ? "text-orange-700" : "text-slate-500"}>
                                    {nanoBananaStats.fallback} butir
                                  </strong>{" "}
                                  fallback ke SVG standar.
                                </p>
                                {nanoBananaStats.fallback > 0 && Object.keys(nanoBananaStats.fallbackReasons).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {Object.entries(nanoBananaStats.fallbackReasons).map(([reason, count]) => (
                                      <span
                                        key={reason}
                                        className="px-2 py-0.5 rounded-md text-[11px] border border-orange-300 bg-orange-50 text-orange-800 font-mono"
                                      >
                                        {reason}: <strong>{count}</strong>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {hasFailedItems && (
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                  Daftar Butir yang Ditolak oleh Gerbang Sanitasi Otomatis ({rejectedItems.length} butir):
                                </h4>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                                  {rejectedItems.map((f, i) => (
                                    <div
                                      key={i}
                                      className="p-2.5 bg-white border border-amber-200 rounded-lg text-xs"
                                    >
                                      <div className="flex items-center justify-between font-semibold text-slate-900 mb-1">
                                        <span>Butir #{f.index} {f.itemTitle ? `— ${f.itemTitle}` : ""}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-mono">
                                          Gagal Gerbang Sanitasi
                                        </span>
                                      </div>
                                      <p className="text-rose-700 font-mono text-[11px] leading-relaxed">
                                        {f.reason}
                                      </p>
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
        </div>
      )}

      {/* TablePagination Component */}
      {logs.length > 0 && (
        <TablePagination
          currentPage={validCurrentPage}
          totalPages={totalPages}
          totalItems={logs.length}
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
  );
}
