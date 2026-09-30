"use client";

import React, { useState } from "react";
import {
  DollarSign,
  TrendingDown,
  Calendar,
  Sparkles,
  BarChart3,
  Layers,
  BookOpen,
  Info,
  RefreshCw,
  Coins,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface DailyItem {
  tanggal: string;
  totalBatch: number;
  totalPaket: number;
  totalLolos: number;
  totalGagal: number;
  inputTokens: number;
  outputTokens: number;
  biayaUsd: number;
  biayaIdr: number;
}

interface MapelItem {
  mapel: string;
  totalSoal: number;
  biayaIdr: number;
}

interface JenjangItem {
  jenjang: string;
  totalSoal: number;
  biayaIdr: number;
}

interface BiayaAiData {
  summary: {
    modelAktif: string;
    kursUsd: number;
    hariIniIdr: number;
    hariIniSoal: number;
    tujuhHariIdr: number;
    tujuhHariSoal: number;
    bulanIniIdr: number;
    bulanIniSoal: number;
    totalKumulatifIdr: number;
    totalKumulatifUsd: number;
    totalSoalLolos: number;
    rataRataPerSoalIdr: number;
    rataRataPerPaketIdr: number;
  };
  tarif: {
    inputPerM: number;
    outputPerM: number;
    avgInputTokensPerSoal: number;
    avgOutputTokensPerSoal: number;
  };
  daily: DailyItem[];
  byMapel: MapelItem[];
  byJenjang: JenjangItem[];
}

export default function BiayaAiView({ initialData }: { initialData: BiayaAiData }) {
  const [data, setData] = useState<BiayaAiData>(initialData);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"riwayat" | "breakdown">("riwayat");

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatTanggalIndonesia = (tglStr: string) => {
    if (!tglStr) return "-";
    const [year, month, day] = tglStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const reloadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/biaya-ai");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Gagal reload data biaya AI:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDaily = data.daily.filter((d) => {
    if (!searchTerm) return true;
    return (
      d.tanggal.includes(searchTerm) ||
      formatTanggalIndonesia(d.tanggal).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const maxBiayaHarian = Math.max(...data.daily.map((d) => d.biayaIdr), 1);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Laporan Biaya & Pengeluaran AI
              </h1>
              <p className="text-sm text-slate-500">
                Pantau estimasi pengeluaran API Google Gemini untuk seluruh pembuatan soal secara real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{data.summary.modelAktif}</span>
          </div>
          <button
            onClick={reloadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition shadow-sm"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Ringkasan Kartu Metrik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hari Ini */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-sm relative overflow-hidden">
          <div className="absolute right-2 -bottom-2 opacity-10">
            <Calendar className="w-28 h-28" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-100">
              Hari Ini
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-medium">
              {data.summary.hariIniSoal} butir soal
            </span>
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {formatRupiah(data.summary.hariIniIdr)}
          </div>
          <p className="mt-2 text-xs text-emerald-100 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {data.summary.hariIniSoal > 0
                ? `${data.summary.hariIniSoal} soal berhasil lolos`
                : "Belum ada batch generate hari ini"}
            </span>
          </p>
        </div>

        {/* 7 Hari Terakhir */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
              7 Hari Terakhir
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
              {data.summary.tujuhHariSoal} soal
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatRupiah(data.summary.tujuhHariIdr)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Aktivitas 1 minggu terakhir
          </p>
        </div>

        {/* Bulan Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
              Bulan Berjalan
            </span>
            <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-semibold">
              {data.summary.bulanIniSoal} soal
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatRupiah(data.summary.bulanIniIdr)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Total biaya siklus bulan aktif
          </p>
        </div>

        {/* Total Kumulatif Seluruh Waktu */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
              Total Seluruh Waktu
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold">
              {data.summary.totalSoalLolos} soal
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatRupiah(data.summary.totalKumulatifIdr)}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Setara ~${data.summary.totalKumulatifUsd} USD
          </p>
        </div>
      </div>

      {/* Rata-rata Biaya Satuan Info Terkalibrasi */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-indigo-950">
                Kalkulasi Riil Terkalibrasi (Google Cloud Billing)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                Tersinkronisasi Riil
              </span>
            </div>
            <p className="text-xs text-indigo-800 mt-1 leading-relaxed max-w-2xl">
              Perhitungan telah dikalibrasi dengan beban kerja faktual: <span className="font-semibold">System Prompt BSKAP utuh (~10rb token/chunk)</span>, output pembahasan langkah bertahap + kode SVG, siklus regenerasi butir gagal (retry), serta ilustrasi visual.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 bg-white rounded-xl border border-indigo-200 text-center shadow-xs">
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Estimasi / Soal</span>
            <span className="text-sm font-bold text-indigo-700">
              {formatRupiah(data.summary.rataRataPerSoalIdr || 670)}
            </span>
          </div>
          <div className="px-4 py-2.5 bg-white rounded-xl border border-indigo-200 text-center shadow-xs">
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Estimasi / Paket (30)</span>
            <span className="text-sm font-bold text-emerald-700">
              {formatRupiah(data.summary.rataRataPerPaketIdr || 15000)}
            </span>
          </div>
        </div>
      </div>

      {/* Visualisasi Tren Grafik 10 Hari Terakhir */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Tren Pengeluaran Harian (10 Hari Terakhir)
            </h2>
          </div>
          <span className="text-xs text-slate-400">Nilai dalam Rupiah (IDR)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 pt-2">
          {data.daily.slice(0, 10).reverse().map((d) => {
            const heightPercent = Math.max(12, Math.round((d.biayaIdr / maxBiayaHarian) * 100));
            const isToday =
              d.tanggal ===
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Jakarta",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date());

            return (
              <div key={d.tanggal} className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-bold text-slate-700">
                  {formatRupiah(d.biayaIdr)}
                </span>
                <div className="w-full bg-slate-100 rounded-t-lg h-28 flex items-end justify-center p-1">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      isToday
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : "bg-indigo-500 hover:bg-indigo-600"
                    }`}
                    title={`${d.tanggal}: ${formatRupiah(d.biayaIdr)} (${d.totalLolos} soal lolos)`}
                  />
                </div>
                <span
                  className={`text-[11px] font-medium truncate max-w-[70px] ${
                    isToday ? "text-emerald-700 font-bold" : "text-slate-500"
                  }`}
                >
                  {isToday ? "Hari Ini" : d.tanggal.substring(5)}
                </span>
                <span className="text-[10px] text-slate-400 -mt-1">
                  {d.totalLolos} soal
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "riwayat"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tabel Riwayat Harian ({data.daily.length} Hari)
          </button>
          <button
            onClick={() => setActiveTab("breakdown")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "breakdown"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Breakdown Mapel & Jenjang
          </button>
        </div>

        {activeTab === "riwayat" && (
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari tanggal (contoh: 2026-09 atau Sep)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-xs"
            />
          </div>
        )}
      </div>

      {/* Tab Content: Tabel Riwayat Harian */}
      {activeTab === "riwayat" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tanggal (WIB)</th>
                  <th className="py-3 px-4 text-center">Batch Sesi</th>
                  <th className="py-3 px-4 text-center">Paket Dihasilkan</th>
                  <th className="py-3 px-4 text-center">Soal Lolos</th>
                  <th className="py-3 px-4 text-center">Soal Gagal / Retry</th>
                  <th className="py-3 px-4 text-right">Estimasi Token</th>
                  <th className="py-3 px-4 text-right">Biaya (USD)</th>
                  <th className="py-3 px-4 text-right">Total Biaya (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDaily.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada riwayat pengeluaran yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredDaily.map((d) => (
                    <tr key={d.tanggal} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTanggalIndonesia(d.tanggal)}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({d.tanggal})</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600">
                        {d.totalBatch} batch
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {d.totalPaket} paket
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />
                          {d.totalLolos}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {d.totalGagal > 0 ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded-md">
                            <AlertCircle className="w-3 h-3" />
                            {d.totalGagal}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        <span title={`Input: ${d.inputTokens.toLocaleString('id-ID')} | Output: ${d.outputTokens.toLocaleString('id-ID')}`}>
                          {(d.inputTokens + d.outputTokens).toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        ${d.biayaUsd.toFixed(4)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                        <span className="inline-block bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                          {formatRupiah(d.biayaIdr)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Breakdown Mapel & Jenjang */}
      {activeTab === "breakdown" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Breakdown per Mata Pelajaran */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Pengeluaran per Mata Pelajaran
              </h2>
            </div>
            <div className="space-y-3">
              {data.byMapel.map((m) => (
                <div key={m.mapel} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{m.mapel}</h3>
                    <p className="text-[11px] text-slate-500">{m.totalSoal} butir soal di-generate</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                      {formatRupiah(m.biayaIdr)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown per Jenjang */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-5 h-5 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Pengeluaran per Jenjang Pendidikan
              </h2>
            </div>
            <div className="space-y-3">
              {data.byJenjang.map((j) => (
                <div key={j.jenjang} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{j.jenjang}</h3>
                    <p className="text-[11px] text-slate-500">{j.totalSoal} butir soal di-generate</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                      {formatRupiah(j.biayaIdr)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Catatan Transparansi Skema Billing Google */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-3">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <Info className="w-4 h-4 text-indigo-600" />
          <span>Faktor Penyusun Tagihan Google Cloud Billing (Riil ~Rp 1,91 Juta / Sep 2026)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <h4 className="font-semibold text-slate-800 mb-1">1. System Prompt & Konteks BSKAP Utuh</h4>
            <p className="leading-relaxed text-slate-500">
              Setiap kali batch di-generate (terbagi 2 sub-batch), sistem mengirim prompt panduan kurikulum BSKAP, aturan LaTeX ketat, exemplar acuan, dan memori sliding window (~8.000 - 12.000 token input per request).
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <h4 className="font-semibold text-slate-800 mb-1">2. Output Terstruktur & Kode SVG Visual</h4>
            <p className="leading-relaxed text-slate-500">
              Setiap butir menghasilkan opsi jawaban, kunci, pembahasan langkah bertahap lengkap rumus LaTeX, serta kode gambar visual SVG utuh (~1.200 token output per butir soal).
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <h4 className="font-semibold text-slate-800 mb-1">3. Loop Validasi Otomatis & Regenerasi (Retry)</h4>
            <p className="leading-relaxed text-slate-500">
              Jika ada butir yang tidak lolos validasi otomatis 4 lapis (LaTeX rusak, kemiripan n-gram, wacana BSKAP), sistem melakukan regenerasi otomatis butir pengganti dengan prompt utuh.
            </p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <h4 className="font-semibold text-slate-800 mb-1">4. Model Ilustrasi (Nano Banana / Gemini Image) & PPN</h4>
            <p className="leading-relaxed text-slate-500">
              Generasi ilustrasi kontekstual memanggil model keluarga Gemini Image (~$0.03/gambar). Selain itu, invoice resmi Google Cloud Billing mencakup PPN 11%.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 italic pt-1">
          * Catatan: Dengan total ~2.129 butir soal lolos verifikasi dari 127 batch, biaya riil rata-rata adalah <strong>~Rp 15.000/paket</strong> atau <strong>~Rp 670/butir soal</strong>, jauh lebih hemat dibanding honor penyusunan soal manual manusia (Rp 25.000 - Rp 50.000 per butir).
        </p>
      </div>
    </div>
  );
}
