"use client";

import React, { useState } from "react";
import {
  Coins,
  FileEdit,
  ShieldCheck,
  Check,
  AlertCircle,
  Calculator,
  Save,
  HelpCircle,
  Sparkles,
  Info,
} from "lucide-react";
import { TarifSettings, SkemaTarif, DEFAULT_TARIF_SETTINGS } from "@/types/tarif";

interface TarifSettingsFormProps {
  initialSettings?: TarifSettings;
  onSaved?: (newSettings: TarifSettings) => void;
  showTitle?: boolean;
}

export function TarifSettingsForm({
  initialSettings = DEFAULT_TARIF_SETTINGS,
  onSaved,
  showTitle = true,
}: TarifSettingsFormProps) {
  const [pembuatanSkema, setPembuatanSkema] = useState<SkemaTarif>(
    initialSettings.pembuatan?.skema || "per_soal"
  );
  const [pembuatanNominal, setPembuatanNominal] = useState<number>(
    initialSettings.pembuatan?.nominal ?? 50000
  );
  const [pembuatanCatatan, setPembuatanCatatan] = useState<string>(
    initialSettings.pembuatan?.catatan || ""
  );

  const [validasiSkema, setValidasiSkema] = useState<SkemaTarif>(
    initialSettings.validasi?.skema || "per_soal"
  );
  const [validasiNominal, setValidasiNominal] = useState<number>(
    initialSettings.validasi?.nominal ?? 25000
  );
  const [validasiCatatan, setValidasiCatatan] = useState<string>(
    initialSettings.validasi?.catatan || ""
  );

  const [lastUpdated, setLastUpdated] = useState<{
    date?: string;
    byName?: string;
    byEmail?: string;
  }>({
    date: initialSettings.updatedAt,
    byName: initialSettings.updatedBy?.name,
    byEmail: initialSettings.updatedBy?.email,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        pembuatan: {
          skema: pembuatanSkema,
          nominal: Number(pembuatanNominal) || 0,
          catatan: pembuatanCatatan,
        },
        validasi: {
          skema: validasiSkema,
          nominal: Number(validasiNominal) || 0,
          catatan: validasiCatatan,
        },
      };

      const res = await fetch("/api/admin/settings/tarif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menyimpan pengaturan besaran biaya.");
      }

      setSuccessMsg(json.message || "Pengaturan besaran biaya berhasil disimpan!");
      if (json.data) {
        setLastUpdated({
          date: json.data.updatedAt,
          byName: json.data.updatedBy?.name,
          byEmail: json.data.updatedBy?.email,
        });
        if (onSaved) onSaved(json.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setIsLoading(false);
    }
  };

  // Simulasi kalkulasi 1 paket soal standar (30 soal)
  const STANDAR_SOAL_PER_PAKET = 30;
  const estimasiPembuatan1Paket =
    pembuatanSkema === "per_soal"
      ? pembuatanNominal * STANDAR_SOAL_PER_PAKET
      : pembuatanNominal;

  const estimasiValidasi1Paket =
    validasiSkema === "per_soal"
      ? validasiNominal * STANDAR_SOAL_PER_PAKET
      : validasiNominal;

  const totalBiaya1Paket = estimasiPembuatan1Paket + estimasiValidasi1Paket;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-8">
      {/* Header Info */}
      {showTitle && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-semibold uppercase tracking-wider mb-1">
              <Coins className="w-4 h-4" />
              <span>Standar Kebijakan Finansial</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Pengaturan Besaran Biaya (Tarif Honorarium)
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Tentukan mekanisme penetapan honorarium (per butir soal atau per paket utuh) beserta nominal
              biaya resmi untuk kegiatan pembuatan dan validasi soal.
            </p>
          </div>

          {lastUpdated.date && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-mono text-slate-400">Pembaruan Terakhir</p>
                <p className="font-semibold text-slate-700">
                  {new Date(lastUpdated.date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {lastUpdated.byName ? ` • ${lastUpdated.byName}` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Area */}
      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. SEKSI PEMBUATAN SOAL */}
          <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 p-6 space-y-5 transition-all hover:border-indigo-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <FileEdit className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase font-bold text-indigo-700 tracking-wider">
                  Kategori 1
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Pembuatan Soal (Penulis Soal)
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Honorarium untuk penulis/penyusun naskah butir soal baru atau paket soal lengkap.
            </p>

            {/* Pilihan Skema Biaya */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span>Skema Penetapan Biaya</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    pembuatanSkema === "per_soal"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-950 font-semibold shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Per Soal</span>
                    <input
                      type="radio"
                      name="pembuatanSkema"
                      value="per_soal"
                      checked={pembuatanSkema === "per_soal"}
                      onChange={() => setPembuatanSkema("per_soal")}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 font-normal leading-snug">
                    Dihitung per butir soal yang dibuat
                  </span>
                </label>

                <label
                  className={`flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    pembuatanSkema === "per_paket"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-950 font-semibold shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Per Paket</span>
                    <input
                      type="radio"
                      name="pembuatanSkema"
                      value="per_paket"
                      checked={pembuatanSkema === "per_paket"}
                      onChange={() => setPembuatanSkema("per_paket")}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 font-normal leading-snug">
                    Dihitung per paket soal utuh
                  </span>
                </label>
              </div>
            </div>

            {/* Input Nominal Biaya */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>Besaran Biaya (Rupiah)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-mono font-bold text-indigo-700">
                  {formatRupiah(pembuatanNominal)}{" "}
                  <span className="text-[11px] text-slate-500 font-normal">
                    {pembuatanSkema === "per_soal" ? "/ soal" : "/ paket"}
                  </span>
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                  Rp
                </div>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={pembuatanNominal || ""}
                  onChange={(e) => setPembuatanNominal(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Contoh: 50000"
                  required
                  className="w-full pl-11 pr-24 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono font-semibold text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-medium text-slate-500">
                  {pembuatanSkema === "per_soal" ? "/ Butir Soal" : "/ Paket Soal"}
                </div>
              </div>

              {/* Tombol Cepat (Preset) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">Preset:</span>
                {pembuatanSkema === "per_soal"
                  ? [25000, 35000, 50000, 75000, 100000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPembuatanNominal(preset)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                          pembuatanNominal === preset
                            ? "bg-indigo-600 text-white font-bold"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {(preset / 1000).toLocaleString("id-ID")}rb
                      </button>
                    ))
                  : [750000, 1000000, 1200000, 1500000, 2000000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPembuatanNominal(preset)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                          pembuatanNominal === preset
                            ? "bg-indigo-600 text-white font-bold"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {(preset / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 2 })}jt
                      </button>
                    ))}
              </div>
            </div>

            {/* Input Catatan */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">
                Catatan / Keterangan Kebijakan (Opsional)
              </label>
              <input
                type="text"
                value={pembuatanCatatan}
                onChange={(e) => setPembuatanCatatan(e.target.value)}
                placeholder="Misal: Termasuk penulisan stimulus & pembahasan"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
              />
            </div>
          </div>

          {/* 2. SEKSI VALIDASI SOAL */}
          <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 p-6 space-y-5 transition-all hover:border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase font-bold text-emerald-700 tracking-wider">
                  Kategori 2
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Validasi Soal (Validator / Reviewer)
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Honorarium untuk validator yang menelaah, memeriksa, menyetujui, atau memberi catatan revisi soal.
            </p>

            {/* Pilihan Skema Biaya */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <span>Skema Penetapan Biaya</span>
                <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    validasiSkema === "per_soal"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Per Soal</span>
                    <input
                      type="radio"
                      name="validasiSkema"
                      value="per_soal"
                      checked={validasiSkema === "per_soal"}
                      onChange={() => setValidasiSkema("per_soal")}
                      className="text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 font-normal leading-snug">
                    Dihitung per butir soal yang divalidasi
                  </span>
                </label>

                <label
                  className={`flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    validasiSkema === "per_paket"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Per Paket</span>
                    <input
                      type="radio"
                      name="validasiSkema"
                      value="per_paket"
                      checked={validasiSkema === "per_paket"}
                      onChange={() => setValidasiSkema("per_paket")}
                      className="text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 font-normal leading-snug">
                    Dihitung per paket soal yang selesai
                  </span>
                </label>
              </div>
            </div>

            {/* Input Nominal Biaya */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>Besaran Biaya (Rupiah)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {formatRupiah(validasiNominal)}{" "}
                  <span className="text-[11px] text-slate-500 font-normal">
                    {validasiSkema === "per_soal" ? "/ soal" : "/ paket"}
                  </span>
                </span>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                  Rp
                </div>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={validasiNominal || ""}
                  onChange={(e) => setValidasiNominal(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Contoh: 25000"
                  required
                  className="w-full pl-11 pr-24 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all outline-none"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-medium text-slate-500">
                  {validasiSkema === "per_soal" ? "/ Butir Soal" : "/ Paket Soal"}
                </div>
              </div>

              {/* Tombol Cepat (Preset) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-mono text-slate-400 mr-1">Preset:</span>
                {validasiSkema === "per_soal"
                  ? [15000, 20000, 25000, 35000, 50000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setValidasiNominal(preset)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                          validasiNominal === preset
                            ? "bg-emerald-600 text-white font-bold"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {(preset / 1000).toLocaleString("id-ID")}rb
                      </button>
                    ))
                  : [500000, 600000, 750000, 900000, 1000000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setValidasiNominal(preset)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                          validasiNominal === preset
                            ? "bg-emerald-600 text-white font-bold"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {(preset / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 2 })}jt
                      </button>
                    ))}
              </div>
            </div>

            {/* Input Catatan */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">
                Catatan / Keterangan Kebijakan (Opsional)
              </label>
              <input
                type="text"
                value={validasiCatatan}
                onChange={(e) => setValidasiCatatan(e.target.value)}
                placeholder="Misal: Diberikan untuk soal yang disetujui / final"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Live Simulation Card */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-slate-50/50 to-indigo-50/30 p-5">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs mb-3">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <span>Simulasi Alokasi Biaya per 1 Paket Soal Standar (30 Butir Soal)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <p className="text-[10px] font-mono uppercase text-slate-400">Alokasi Pembuatan Soal</p>
              <p className="text-base font-bold text-indigo-700 font-mono mt-0.5">
                {formatRupiah(estimasiPembuatan1Paket)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {pembuatanSkema === "per_soal"
                  ? `30 soal × ${formatRupiah(pembuatanNominal)}`
                  : `1 paket × ${formatRupiah(pembuatanNominal)}`}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <p className="text-[10px] font-mono uppercase text-slate-400">Alokasi Validasi Soal</p>
              <p className="text-base font-bold text-emerald-700 font-mono mt-0.5">
                {formatRupiah(estimasiValidasi1Paket)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                {validasiSkema === "per_soal"
                  ? `30 soal × ${formatRupiah(validasiNominal)}`
                  : `1 paket × ${formatRupiah(validasiNominal)}`}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <p className="text-[10px] font-mono uppercase text-slate-400">Total Biaya per Paket</p>
              <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
                {formatRupiah(totalBiaya1Paket)}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Pembuatan + Validasi tuntas
              </p>
            </div>
          </div>
        </div>

        {/* Notifikasi Sukses / Gagal */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 leading-relaxed">
            Perubahan besaran biaya akan langsung dijadikan dasar perhitungan estimasi honorarium pada seluruh laporan sistem.
          </p>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Besaran Biaya</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
