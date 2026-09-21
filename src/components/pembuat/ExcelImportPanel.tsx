"use client";

import React, { useRef, useState } from "react";
import { FileSpreadsheet, X, UploadCloud, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface RowError {
  rowNumber: number;
  no: string;
  errors: string[];
}

interface ImportResult {
  importedCount: number;
  duplicateCount: number;
  capacityCount: number;
}

interface ExcelImportPanelProps {
  packageId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExcelImportPanel({ packageId, isOpen, onClose, onSuccess }: ExcelImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setFileName("");
    setErrorMessage("");
    setRowErrors([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setErrorMessage("Pilih file .xlsx terlebih dahulu.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");
    setRowErrors([]);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/packages/${packageId}/import-excel`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (Array.isArray(data.rowErrors) && data.rowErrors.length > 0) {
          setRowErrors(data.rowErrors);
        }
        setErrorMessage(data.error || "Gagal mengimpor file.");
        return;
      }

      setResult(data.data);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan jaringan saat mengunggah file.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold">Impor Massal Soal dari Excel</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!result && (
            <>
              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 leading-relaxed">
                File harus mengikuti template resmi: sheet <strong>"Soal"</strong> (data butir soal) dan{" "}
                <strong>"Referensi Kompetensi"</strong> (kamus kode kompetensi). Soal baru akan ditambahkan ke slot
                kosong; soal dengan teks persis sama seperti yang sudah ada di paket ini otomatis dilewati.
              </div>

              <label className="block border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                />
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  {fileName || "Klik untuk memilih file .xlsx"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Maksimal 10 MB, maksimal 300 soal per file.</p>
              </label>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {rowErrors.length > 0 && (
                <div className="border border-rose-200 rounded-xl overflow-hidden">
                  <div className="bg-rose-50 px-3.5 py-2 text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                    {rowErrors.length} Baris Bermasalah — Tidak Ada yang Disimpan
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-rose-100">
                    {rowErrors.map((re) => (
                      <div key={re.rowNumber} className="p-3 text-xs">
                        <span className="font-bold font-mono text-rose-700">
                          Baris {re.rowNumber} (No. {re.no}):
                        </span>
                        <ul className="mt-1 list-disc list-inside text-rose-600 space-y-0.5">
                          {re.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <p className="font-bold">{result.importedCount} soal berhasil diimpor</p>
                  <p className="mt-0.5">Status soal: menunggu validasi, sama seperti alur unggah manual.</p>
                </div>
              </div>
              {result.duplicateCount > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{result.duplicateCount} soal dilewati karena teksnya sama persis dengan soal yang sudah ada.</span>
                </div>
              )}
              {result.capacityCount > 0 && (
                <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{result.capacityCount} soal dilewati karena paket sudah penuh (30/30 slot).</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-end gap-2">
          {result ? (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              Tutup
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                <span>{isUploading ? "Mengunggah..." : "Unggah & Impor"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExcelImportPanel;
