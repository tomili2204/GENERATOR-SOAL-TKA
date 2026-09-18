"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  RefreshCw,
  Cpu,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileQuestion,
  Package,
  Layers,
  Sparkles,
  Database,
  ArrowUpRight,
} from "lucide-react";
import { Question, QuestionPackage } from "@/db/schema";
import Link from "next/link";
import { normalizeJenjang } from "@/lib/jenjang-utils";

interface AdminStatisticsOverviewProps {
  questions: Question[];
  packages: QuestionPackage[];
  lastFetchedAt: string;
}

export function AdminStatisticsOverview({
  questions,
  packages,
  lastFetchedAt,
}: AdminStatisticsOverviewProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // 1. Agregasi Status Validasi per Jenjang & Mapel
  // Kelompokkan unik: (jenjang, mapel)
  type GroupKey = `${string}__${string}`;
  const matrixMap = new Map<
    GroupKey,
    {
      jenjang: string;
      mapel: string;
      draft: number;
      menunggu: number;
      direvisi: number;
      disetujui: number;
      ditolak: number;
      total: number;
      aiCount: number;
      manualCount: number;
      paketCount: number;
    }
  >();

  let totalDraft = 0;
  let totalMenunggu = 0;
  let totalDirevisi = 0;
  let totalDisetujui = 0;
  let totalDitolak = 0;
  let totalAi = 0;
  let totalManual = 0;

  questions.forEach((q) => {
    const normJ = normalizeJenjang(q.jenjang);
    const key: GroupKey = `${normJ}__${q.mapel}`;
    if (!matrixMap.has(key)) {
      matrixMap.set(key, {
        jenjang: normJ,
        mapel: q.mapel,
        draft: 0,
        menunggu: 0,
        direvisi: 0,
        disetujui: 0,
        ditolak: 0,
        total: 0,
        aiCount: 0,
        manualCount: 0,
        paketCount: 0,
      });
    }

    const row = matrixMap.get(key)!;
    row.total += 1;

    // Normalisasi status
    const st = q.status;
    if (st === "draft") {
      row.draft += 1;
      totalDraft += 1;
    } else if (st === "menunggu_validasi") {
      row.menunggu += 1;
      totalMenunggu += 1;
    } else if (st === "direvisi" || st === "perlu_revisi") {
      row.direvisi += 1;
      totalDirevisi += 1;
    } else if (st === "disetujui") {
      row.disetujui += 1;
      totalDisetujui += 1;
    } else if (st === "ditolak") {
      row.ditolak += 1;
      totalDitolak += 1;
    }

    // Sumber
    if (q.sumber === "ai_generated") {
      row.aiCount += 1;
      totalAi += 1;
    } else {
      row.manualCount += 1;
      totalManual += 1;
    }
  });

  const matrixRows = Array.from(matrixMap.values()).sort((a, b) => {
    if (a.jenjang === b.jenjang) return a.mapel.localeCompare(b.mapel);
    return a.jenjang.localeCompare(b.jenjang);
  });

  // Hitung jumlah paket per (jenjang, mapel) dari prop packages
  packages.forEach((p) => {
    const normJ = normalizeJenjang(p.jenjang);
    const key: GroupKey = `${normJ}__${p.mapel}`;
    if (matrixMap.has(key)) {
      matrixMap.get(key)!.paketCount += 1;
    } else {
      // Kombinasi muncul di packages tapi tidak di questions — tetap tambahkan ke matrix
      matrixMap.set(key, {
        jenjang: normJ,
        mapel: p.mapel,
        draft: 0,
        menunggu: 0,
        direvisi: 0,
        disetujui: 0,
        ditolak: 0,
        total: 0,
        aiCount: 0,
        manualCount: 0,
        paketCount: 1,
      });
    }
  });
  const totalPaket = packages.length;


  // Ambil daftar kombinasi unik dari packages dan questions
  const comboSet = new Set<string>();
  packages.forEach((p) => comboSet.add(`${normalizeJenjang(p.jenjang)}__${p.mapel}`));
  questions.forEach((q) => comboSet.add(`${normalizeJenjang(q.jenjang)}__${q.mapel}`));

  const latestPackagesPerCombo = Array.from(comboSet)
    .map((combo) => {
      const [jenjang, mapel] = combo.split("__");
      // Cari paket terbaru untuk kombinasi ini
      const matchingPkgs = packages
        .filter((p) => normalizeJenjang(p.jenjang) === jenjang && p.mapel === mapel)
        .sort(
          (a, b) =>
            new Date(b.tanggalGenerate || b.createdAt).getTime() -
            new Date(a.tanggalGenerate || a.createdAt).getTime()
        );

      const latestPkg = matchingPkgs[0] || null;

      // Hitung distribusi bentuk & kesulitan butir soal aktual dari paket tersebut
      let bentukDist: Record<string, number> = { PG: 0, PGK_MCMA: 0, PGK_KATEGORI: 0 };
      let kesulitanDist: Record<string, number> = { rendah: 0, sedang: 0, tinggi: 0 };
      let pkgQuestionsCount = 0;
      let pkgApprovedCount = 0;

      if (latestPkg) {
        const pkgQuestions = questions.filter((q) => q.paketId === latestPkg.id);
        pkgQuestionsCount = pkgQuestions.length;
        pkgApprovedCount = pkgQuestions.filter((q) => q.status === "disetujui").length;

        if (pkgQuestions.length > 0) {
          pkgQuestions.forEach((q) => {
            const b = q.bentukSoal || "PG";
            bentukDist[b] = (bentukDist[b] || 0) + 1;
            const k = q.tingkatKesulitan || "sedang";
            kesulitanDist[k] = (kesulitanDist[k] || 0) + 1;
          });
        } else if (latestPkg.distribusiBentukSoal) {
          bentukDist = (latestPkg.distribusiBentukSoal as any) || bentukDist;
          kesulitanDist = (latestPkg.distribusiKesulitan as any) || kesulitanDist;
        }
      }

      return {
        jenjang,
        mapel,
        package: latestPkg,
        questionCount: pkgQuestionsCount,
        approvedCount: pkgApprovedCount,
        bentukDist,
        kesulitanDist,
      };
    })
    .filter((item) => item.package !== null)
    .sort((a, b) => {
      if (a.jenjang === b.jenjang) return a.mapel.localeCompare(b.mapel);
      return a.jenjang.localeCompare(b.jenjang);
    });

  const formattedTimestamp = new Date(lastFetchedAt).toLocaleString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  const percentApproved = questions.length > 0 ? Math.round((totalDisetujui / questions.length) * 100) : 0;
  const percentAi = questions.length > 0 ? Math.round((totalAi / questions.length) * 100) : 0;
  const percentManual = questions.length > 0 ? Math.round((totalManual / questions.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Kontrol & Jaminan Real-Time */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Dasbor Statistik Menyeluruh (Administrator)
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Database Query
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Data dihitung langsung dari basis data tanpa perantara cache usang. Diperbarui:{" "}
              <strong className="font-mono text-slate-700">{formattedTimestamp}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-all disabled:opacity-50 shadow-2xs shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Memperbarui..." : "Segarkan Statistik"}</span>
        </button>
      </div>

      {/* 2. Ringkasan KPI Kunci */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 block">
            Total Bank Soal
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">{questions.length}</div>
          <span className="text-[11px] text-slate-500 block">Lintas seluruh jenjang</span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 block flex items-center justify-between">
            <span>Disetujui</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700">{totalDisetujui}</div>
          <span className="text-[11px] text-emerald-600 block">{percentApproved}% siap tryout</span>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-2xs space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-700 block flex items-center justify-between">
            <span>Antrean Telaah</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700">{totalMenunggu}</div>
          <span className="text-[11px] text-amber-600 block">Menunggu validator</span>
        </div>

        <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/40 shadow-2xs space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-orange-700 block flex items-center justify-between">
            <span>Perlu Revisi</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
          </span>
          <div className="text-2xl font-bold font-mono text-orange-700">{totalDirevisi}</div>
          <span className="text-[11px] text-orange-600 block">Dikembalikan ke pembuat</span>
        </div>

        <div className="p-4 rounded-xl border border-violet-200 bg-violet-50/40 shadow-2xs space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-violet-700 block flex items-center justify-between">
            <span>AI Generated</span>
            <Cpu className="w-3.5 h-3.5 text-violet-600" />
          </span>
          <div className="text-2xl font-bold font-mono text-violet-700">{totalAi}</div>
          <span className="text-[11px] text-violet-600 block">{percentAi}% dari total</span>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 shadow-2xs space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-blue-700 block flex items-center justify-between">
            <span>Manual Upload</span>
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
          </span>
          <div className="text-2xl font-bold font-mono text-blue-700">{totalManual}</div>
          <span className="text-[11px] text-blue-600 block">{percentManual}% dari total</span>
        </div>
      </div>

      {/* 3. Komparasi Visual Sumber Soal (AI vs Manual) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <span>Proporsi Sumber Soal (AI Generator vs Unggah Manual)</span>
          </h3>
          <span className="text-xs font-mono text-slate-500">
            Total {questions.length} Soal
          </span>
        </div>

        {/* Progress Bar Dual Stack */}
        <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${percentAi}%` }}
            className="bg-violet-600 h-full transition-all"
            title={`AI Generated: ${totalAi} butir (${percentAi}%)`}
          />
          <div
            style={{ width: `${percentManual}%` }}
            className="bg-blue-600 h-full transition-all"
            title={`Manual Upload: ${totalManual} butir (${percentManual}%)`}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs pt-1 text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-violet-600 shrink-0" />
            <span className="font-semibold text-slate-800">AI Generated:</span>
            <span className="font-mono">{totalAi} butir ({percentAi}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-600 shrink-0" />
            <span className="font-semibold text-slate-800">Manual Upload:</span>
            <span className="font-mono">{totalManual} butir ({percentManual}%)</span>
          </div>
        </div>
      </div>

      {/* 4. Tabel Silang Status Validasi per Jenjang & Mapel */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Matriks Distribusi Status Validasi per Jenjang & Mata Pelajaran</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Rincian kuantitas soal menurut 5 status validasi standar AyoTKA
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {matrixRows.length} Kombinasi Aktif
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-[10.5px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Jenjang</th>
                <th className="px-4 py-3">Mata Pelajaran</th>
                <th className="px-3 py-3 text-center text-indigo-700 bg-indigo-50/50">Paket</th>
                <th className="px-3 py-3 text-center">Draft</th>
                <th className="px-3 py-3 text-center text-amber-700 bg-amber-50/50">Menunggu</th>
                <th className="px-3 py-3 text-center text-orange-700 bg-orange-50/50">Direvisi</th>
                <th className="px-3 py-3 text-center text-emerald-700 bg-emerald-50/50">Disetujui</th>
                <th className="px-3 py-3 text-center text-rose-700">Ditolak</th>
                <th className="px-3 py-3 text-center font-bold">Total</th>
                <th className="px-4 py-3 text-center">Lolos Uji (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {matrixRows.map((row, idx) => {
                const rowPercent = row.total > 0 ? Math.round((row.disetujui / row.total) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.jenjang}</td>
                    <td className="px-4 py-3 text-slate-700">{row.mapel}</td>
                    <td className="px-3 py-3 text-center font-bold text-indigo-700 bg-indigo-50/20">{row.paketCount}</td>
                    <td className="px-3 py-3 text-center text-slate-500">{row.draft}</td>
                    <td className="px-3 py-3 text-center font-semibold text-amber-700 bg-amber-50/20">
                      {row.menunggu}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-orange-700 bg-orange-50/20">
                      {row.direvisi}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-emerald-700 bg-emerald-50/20">
                      {row.disetujui}
                    </td>
                    <td className="px-3 py-3 text-center text-rose-600">{row.ditolak}</td>
                    <td className="px-3 py-3 text-center font-bold text-slate-900">{row.total}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full"
                            style={{ width: `${rowPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700">{rowPercent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-slate-700 uppercase tracking-wider text-[11px]">
                  Total Keseluruhan
                </td>
                <td className="px-3 py-3 text-center text-indigo-800 bg-indigo-50/60">{totalPaket}</td>
                <td className="px-3 py-3 text-center text-slate-600">{totalDraft}</td>
                <td className="px-3 py-3 text-center text-amber-800 bg-amber-50/60">{totalMenunggu}</td>
                <td className="px-3 py-3 text-center text-orange-800 bg-orange-50/60">{totalDirevisi}</td>
                <td className="px-3 py-3 text-center text-emerald-800 bg-emerald-50/60">{totalDisetujui}</td>
                <td className="px-3 py-3 text-center text-rose-700">{totalDitolak}</td>
                <td className="px-3 py-3 text-center text-slate-900">{questions.length}</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    {percentApproved}% Rata-rata
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 5. Ringkasan Paket Soal Terakhir per Kombinasi Jenjang + Mapel */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs space-y-0">
        <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>Ringkasan Paket Soal Terakhir per Kombinasi Jenjang & Mata Pelajaran</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Status, tanggal generate, serta rincian distribusi bentuk soal dan tingkat kesulitan paket teraktual
            </p>
          </div>
          <Link
            href="/admin/all-soal"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Buka Semua Paket Soal</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {latestPackagesPerCombo.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada paket soal yang terdaftar di basis data.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {latestPackagesPerCombo.map((item, idx) => {
              const pkg = item.package!;
              const genDate = new Date(pkg.tanggalGenerate || pkg.createdAt).toLocaleString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={idx} className="p-5 space-y-4 hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold text-[10px]">
                          {item.jenjang}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{item.mapel}</span>
                      </div>
                      <h4 className="font-mono text-xs font-bold text-indigo-600 mt-1">
                        {pkg.code} - {pkg.nama}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Digenerate: {genDate}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10.5px] font-mono font-semibold uppercase tracking-wider border bg-slate-50 text-slate-700 border-slate-200">
                      {pkg.status}
                    </span>
                  </div>

                  {/* Metrik Butir Soal dalam Paket */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">
                        Distribusi Bentuk Soal
                      </span>
                      <div className="font-mono text-[11.5px] text-slate-700 space-y-0.5">
                        <div className="flex justify-between">
                          <span>PG (Tunggal):</span>
                          <strong>{item.bentukDist.PG || 0}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>PGK (MCMA):</span>
                          <strong>{item.bentukDist.PGK_MCMA || 0}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>PGK (Kategori):</span>
                          <strong>{item.bentukDist.PGK_KATEGORI || 0}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">
                        Distribusi Kesulitan
                      </span>
                      <div className="font-mono text-[11.5px] text-slate-700 space-y-0.5">
                        <div className="flex justify-between text-emerald-700">
                          <span>Rendah (Mudah):</span>
                          <strong>{item.kesulitanDist.rendah || 0}</strong>
                        </div>
                        <div className="flex justify-between text-amber-700">
                          <span>Sedang:</span>
                          <strong>{item.kesulitanDist.sedang || 0}</strong>
                        </div>
                        <div className="flex justify-between text-rose-700">
                          <span>Tinggi (HOTS):</span>
                          <strong>{item.kesulitanDist.tinggi || 0}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Kelolosan Paket */}
                  <div className="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-indigo-950 font-medium">
                      Butir Tersedia: <strong>{item.questionCount}</strong> butir (Disetujui:{" "}
                      <strong className="text-emerald-700">{item.approvedCount}</strong>)
                    </span>
                    <span className="text-[10.5px] font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      Target: {pkg.jumlahSoal || 30} Butir
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
