"use client";

import React, { useState, useMemo } from "react";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  Wallet,
  CheckCircle2,
  Clock,
  Search,
  Building2,
  DollarSign,
  Package,
  FileCheck,
  CreditCard,
  Calendar,
  FileText,
  X,
  Check,
  RefreshCw,
  AlertTriangle,
  History,
  Coins,
} from "lucide-react";
import { TarifSettings } from "@/types/tarif";
import { TarifSettingsForm } from "@/components/admin/TarifSettingsForm";

export interface ValidatorReportItem {
  userId: string;
  name: string;
  email: string;
  instansi?: string | null;
  roles: string[];
  assignedJenjang: string[];
  assignedMapel: string[];
  totalSoalDivalidasi: number;
  disetujuiCount: number;
  perluRevisiCount: number;
  ditolakCount: number;
  totalPaketDivalidasi: number;
  paketSiapRilisCount: number;
  tarifPerItem: number;
  estimasiNominal: number;
  statusBayar: "belum_dibayar" | "sudah_dibayar";
  tanggalBayar?: string | null;
  catatanBayar?: string | null;
  latestHrRecordId?: string | null;
  historyRecords?: Array<{
    id: string;
    periode: string;
    totalSoal: number;
    totalPaket: number;
    tarifPerItem: number;
    totalNominal: number;
    statusBayar: string;
    tanggalBayar?: string | null;
    catatanBayar?: string | null;
    createdAt: string;
  }>;
}

interface HonorariumReportViewProps {
  initialData: ValidatorReportItem[];
  initialSummary: {
    totalValidator: number;
    totalSoalDivalidasi: number;
    totalPaketDivalidasi: number;
    totalNominalSudahDibayar: number;
    totalNominalBelumDibayar: number;
  };
  initialTarifSettings?: TarifSettings;
}

export function HonorariumReportView({
  initialData,
  initialSummary,
  initialTarifSettings,
}: HonorariumReportViewProps) {
  const [dataList, setDataList] = useState<ValidatorReportItem[]>(initialData);
  const [summary, setSummary] = useState(initialSummary);
  const [tarifSettings, setTarifSettings] = useState<TarifSettings | undefined>(initialTarifSettings);
  const [activeTab, setActiveTab] = useState<"laporan" | "tarif">("laporan");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusBayarFilter, setStatusBayarFilter] = useState("all");

  // Paging State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedValidator, setSelectedValidator] = useState<ValidatorReportItem | null>(null);

  // Form State
  const [formPeriode, setFormPeriode] = useState("Maret 2026");
  const [formTarif, setFormTarif] = useState(25000);
  const [formStatusBayar, setFormStatusBayar] = useState<"belum_dibayar" | "sudah_dibayar">("sudah_dibayar");
  const [formTanggalBayar, setFormTanggalBayar] = useState(new Date().toISOString().split("T")[0]);
  const [formCatatan, setFormCatatan] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isPerPaket = tarifSettings?.validasi?.skema === "per_paket";

  const refreshReport = async () => {
    try {
      const res = await fetch("/api/admin/honorarium");
      const json = await res.json();
      if (json.success) {
        setDataList(json.data);
        setSummary(json.summary);
        if (json.tarifSettings) {
          setTarifSettings(json.tarifSettings);
        }
      }
    } catch (e) {
      console.error("Error refreshing honorarium report:", e);
    }
  };

  const openPaymentModal = (val: ValidatorReportItem) => {
    setSelectedValidator(val);
    setFormPeriode("Maret 2026");
    const defaultTarif = tarifSettings?.validasi?.nominal || 25000;
    setFormTarif(val.tarifPerItem || defaultTarif);
    setFormStatusBayar(val.statusBayar === "sudah_dibayar" ? "sudah_dibayar" : "sudah_dibayar");
    setFormTanggalBayar(
      val.tanggalBayar
        ? new Date(val.tanggalBayar).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setFormCatatan(val.catatanBayar || "");
    setErrorMsg("");
    setSuccessMsg("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedValidator(null);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const calculatedNominal = useMemo(() => {
    if (!selectedValidator) return 0;
    return isPerPaket
      ? selectedValidator.totalPaketDivalidasi * formTarif
      : selectedValidator.totalSoalDivalidasi * formTarif;
  }, [selectedValidator, formTarif, isPerPaket]);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedValidator) return;

    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const payload = {
        userId: selectedValidator.userId,
        jenisTugas: "validasi_soal",
        periode: formPeriode,
        totalSoal: selectedValidator.totalSoalDivalidasi,
        totalPaket: selectedValidator.totalPaketDivalidasi,
        tarifPerItem: formTarif,
        skema: isPerPaket ? "per_paket" : "per_soal",
        totalNominal: calculatedNominal,
        statusBayar: formStatusBayar,
        tanggalBayar: formStatusBayar === "sudah_dibayar" ? formTanggalBayar : null,
        catatanBayar: formCatatan,
      };

      const res = await fetch("/api/admin/honorarium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menyimpan status honorarium.");
      }

      setSuccessMsg(json.message || "Status honorarium berhasil disimpan!");
      await refreshReport();
      setTimeout(() => closeModal(), 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter Data
  const filteredData = useMemo(() => {
    return dataList.filter((item) => {
      const matchSearch =
        searchTerm.trim() === "" ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.instansi && item.instansi.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus =
        statusBayarFilter === "all" || item.statusBayar === statusBayarFilter;

      return matchSearch && matchStatus;
    });
  }, [dataList, searchTerm, statusBayarFilter]);

  // Paging Calculation
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, validCurrentPage, pageSize]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigasi */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("laporan")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "laporan"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span>Laporan Honorarium Validator</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-white/20 text-white">
            {filteredData.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tarif")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "tarif"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Pengaturan Besaran Biaya</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-100 text-indigo-700 font-semibold">
            {isPerPaket ? "Per Paket" : "Per Soal"}
          </span>
        </button>
      </div>

      {activeTab === "tarif" ? (
        <TarifSettingsForm
          initialSettings={tarifSettings}
          onSaved={(newSettings) => {
            setTarifSettings(newSettings);
            refreshReport();
          }}
          showTitle={false}
        />
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Soal Selesai Divalidasi */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-slate-500 font-semibold">Total Soal Divalidasi</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalSoalDivalidasi}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Butir soal terverifikasi</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Paket Divalidasi */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-indigo-600 font-semibold">Total Paket Divalidasi</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalPaketDivalidasi}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Paket 30 nomor terdata</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* HR Sudah Dibayar */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-emerald-600 font-semibold">HR Sudah Dibayar</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {formatRupiah(summary.totalNominalSudahDibayar)}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Lunas terverifikasi</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* HR Belum Dibayar */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-amber-600 font-semibold">HR Belum Dibayar</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {formatRupiah(summary.totalNominalBelumDibayar)}
            </p>
            <p className="text-[11px] text-amber-600 font-medium mt-0.5">Menunggu pencairan</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header & Controls */}
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
                Laporan Kinerja Validasi & Status Honorarium (HR)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pantau jumlah soal dan paket yang divalidasi tiap validator beserta status pembayaran honorariumnya
              </p>
            </div>
            <button
              onClick={refreshReport}
              title="Muat Ulang Laporan"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan Data</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari validator, email, instansi..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Status Bayar */}
            <div className="relative">
              <select
                value={statusBayarFilter}
                onChange={(e) => {
                  setStatusBayarFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Status Pembayaran HR</option>
                <option value="belum_dibayar">Belum Dibayar</option>
                <option value="sudah_dibayar">Sudah Dibayar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Validator & Instansi</th>
                <th className="px-4 py-3 text-center">Soal Divalidasi</th>
                <th className="px-4 py-3 text-center">Paket Divalidasi</th>
                <th className="px-4 py-3 text-right">Estimasi HR</th>
                <th className="px-4 py-3 text-center">Status HR</th>
                <th className="px-4 py-3">Keterangan Transfer</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-sans text-xs">
                    Tidak ada data validator yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const isPaid = item.statusBayar === "sudah_dibayar";

                  return (
                    <tr key={item.userId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Validator */}
                      <td className="px-4 py-3 font-sans">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.email}</div>
                        {item.instansi && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-slate-600 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>{item.instansi}</span>
                          </div>
                        )}
                      </td>

                      {/* Soal Divalidasi */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-slate-900 text-sm block">
                          {item.totalSoalDivalidasi} Soal
                        </span>
                        <div className="flex items-center justify-center gap-1 mt-1 font-mono text-[10px]">
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200" title="Disetujui">
                            {item.disetujuiCount} ACC
                          </span>
                          <span className="text-orange-700 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200" title="Perlu Revisi">
                            {item.perluRevisiCount} Rev
                          </span>
                          <span className="text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200" title="Ditolak">
                            {item.ditolakCount} Tlk
                          </span>
                        </div>
                      </td>

                      {/* Paket Divalidasi */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-slate-900 text-sm block">
                          {item.totalPaketDivalidasi} Paket
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.paketSiapRilisCount} Siap Rilis
                        </span>
                      </td>

                      {/* Estimasi HR */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-slate-900 font-mono text-sm block">
                          {formatRupiah(item.estimasiNominal)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          @{formatRupiah(item.tarifPerItem)} / soal
                        </span>
                      </td>

                      {/* Status Pembayaran */}
                      <td className="px-4 py-3 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Sudah Dibayar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                            <Clock className="w-3.5 h-3.5" />
                            Belum Dibayar
                          </span>
                        )}
                      </td>

                      {/* Keterangan Transfer */}
                      <td className="px-4 py-3 font-sans text-xs">
                        {isPaid ? (
                          <div>
                            <span className="text-slate-800 font-medium block">
                              {item.catatanBayar || "Transfer Selesai"}
                            </span>
                            {item.tanggalBayar && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Tgl: {new Date(item.tanggalBayar).toLocaleDateString("id-ID")}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Menunggu pemrosesan</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openPaymentModal(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isPaid ? "Ubah Status" : "Proses Bayar"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <TablePagination
          currentPage={validCurrentPage}
          totalPages={totalPages}
          totalItems={filteredData.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 30, 50, 100]}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>
    </>
  )}

  {/* MODAL PROSES PEMBAYARAN HONORARIUM (HR) */}
      {isModalOpen && selectedValidator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Proses Pembayaran Honorarium (HR)
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Validator: {selectedValidator.name}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Rincian Kinerja Validator */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Asal Instansi:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedValidator.instansi || "–"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Soal Divalidasi:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {selectedValidator.totalSoalDivalidasi} Butir Soal
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Paket Terlibat:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {selectedValidator.totalPaketDivalidasi} Paket
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-700">Total Nominal HR:</span>
                  <span className="font-bold text-emerald-700 font-mono text-base">
                    {formatRupiah(calculatedNominal)}
                  </span>
                </div>
              </div>

              {/* Input Periode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Periode Penugasan / Anggaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Maret 2026 atau Gelombang 1"
                  value={formPeriode}
                  onChange={(e) => setFormPeriode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                />
              </div>

              {/* Input Tarif per Soal / Paket */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tarif per {isPerPaket ? "Paket Soal" : "Butir Soal"} (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={1000}
                  value={formTarif}
                  onChange={(e) => setFormTarif(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                />
                <span className="text-[10px] text-slate-500 mt-1 block font-mono">
                  Nominal dihitung: {isPerPaket ? `${selectedValidator.totalPaketDivalidasi} paket` : `${selectedValidator.totalSoalDivalidasi} soal`} × {formatRupiah(formTarif)} = {formatRupiah(calculatedNominal)}
                </span>
              </div>

              {/* Status Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Status Pembayaran <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formStatusBayar === "sudah_dibayar"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="statusBayar"
                      value="sudah_dibayar"
                      checked={formStatusBayar === "sudah_dibayar"}
                      onChange={() => setFormStatusBayar("sudah_dibayar")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Sudah Dibayar</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formStatusBayar === "belum_dibayar"
                        ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="statusBayar"
                      value="belum_dibayar"
                      checked={formStatusBayar === "belum_dibayar"}
                      onChange={() => setFormStatusBayar("belum_dibayar")}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Belum Dibayar</span>
                  </label>
                </div>
              </div>

              {/* Tanggal Bayar */}
              {formStatusBayar === "sudah_dibayar" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pencairan / Transfer
                  </label>
                  <input
                    type="date"
                    value={formTanggalBayar}
                    onChange={(e) => setFormTanggalBayar(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                  />
                </div>
              )}

              {/* Catatan / No Referensi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Pembayaran / No. Bukti Transfer
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ref Transfer Mandiri #TRX-982173 / Kwitansi #08"
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Status HR</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
