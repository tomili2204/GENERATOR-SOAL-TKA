"use client";

import React from "react";
import { Layers } from "lucide-react";

interface HierarkiIndikatorCardProps {
  mapel: string;
  elemen?: string | null;
  subElemen?: string | null;
  kompetensi?: string | null;
  indikator?: string | null;
  className?: string;
}

export function HierarkiIndikatorCard({
  mapel,
  elemen,
  subElemen,
  kompetensi,
  indikator,
  className = "",
}: HierarkiIndikatorCardProps) {
  const isBahasa =
    mapel.toLowerCase().includes("indonesia") ||
    mapel.toLowerCase().includes("inggris") ||
    mapel.toLowerCase().includes("bind") ||
    mapel.toLowerCase().includes("binp") ||
    mapel.toLowerCase().includes("abing") ||
    mapel.toLowerCase().includes("abinw");

  if (isBahasa) {
    // -------------------------------------------------------------
    // HIERARKI RESMI BAHASA (3 TINGKAT SESUAI PUSMENDIK KEMENDIKDASMEN):
    // 1. Kompetensi (Pemahaman Tekstual / Inferensial / Evaluasi dan Apresiasi)
    // 2. Subkompetensi (Cakupan kemampuan membaca)
    // 3. Indikator (Rumusan butir soal)
    // -------------------------------------------------------------
    let kompetensiName = "Pemahaman Tekstual";
    let subkompetensiName = subElemen || "–";

    const rawKompetensi = kompetensi || elemen || "";

    if (rawKompetensi.includes(":")) {
      const parts = rawKompetensi.split(":");
      kompetensiName = parts[0].trim();
      const subFromKom = parts.slice(1).join(":").trim();
      subkompetensiName = subFromKom || subElemen || "–";
    } else if (
      rawKompetensi.includes("Pemahaman") ||
      rawKompetensi.includes("Evaluasi")
    ) {
      kompetensiName = rawKompetensi.trim();
      subkompetensiName =
        subElemen && subElemen !== kompetensiName ? subElemen : "–";
    } else if (subElemen) {
      subkompetensiName = subElemen;
    }

    return (
      <div
        className={`bg-blue-50/70 border border-blue-200/90 rounded-2xl p-4 sm:p-5 text-xs font-sans shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between text-blue-900 font-bold text-sm mb-3.5 pb-2.5 border-b border-blue-200/60">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Hierarki Indikator</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
            Bahasa Indonesia (3 Tingkat)
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-2">
            <span className="font-semibold text-slate-500 sm:col-span-1">
              Kompetensi:
            </span>
            <span className="font-semibold text-slate-900 sm:col-span-3">
              {kompetensiName}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-2">
            <span className="font-semibold text-slate-500 sm:col-span-1">
              Subkompetensi:
            </span>
            <span className="text-slate-800 leading-relaxed sm:col-span-3">
              {subkompetensiName}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-2">
            <span className="font-semibold text-slate-500 sm:col-span-1">
              Indikator:
            </span>
            <span className="font-semibold text-blue-950 leading-relaxed sm:col-span-3">
              {indikator || "–"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // HIERARKI RESMI MATEMATIKA & SAINS (4 TINGKAT SESUAI PUSMENDIK):
  // 1. Elemen (Bilangan / Aljabar / Geometri / Data)
  // 2. Subelemen (Bilangan Real / Rasional / dll)
  // 3. Kompetensi (Kemampuan memahami, mengaplikasikan...)
  // 4. Indikator (Rumusan indikator soal)
  // -------------------------------------------------------------
  return (
    <div
      className={`bg-blue-50/70 border border-blue-200/90 rounded-2xl p-4 sm:p-5 text-xs font-sans shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between text-blue-900 font-bold text-sm mb-3.5 pb-2.5 border-b border-blue-200/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Hierarki Indikator</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
          Matematika (4 Tingkat)
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-2">
          <span className="font-semibold text-slate-500 sm:col-span-1">
            Elemen:
          </span>
          <span className="font-semibold text-slate-900 sm:col-span-3">
            {elemen || "–"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-2">
          <span className="font-semibold text-slate-500 sm:col-span-1">
            Subelemen:
          </span>
          <span className="text-slate-800 leading-relaxed sm:col-span-3">
            {subElemen || "–"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-2">
          <span className="font-semibold text-slate-500 sm:col-span-1">
            Kompetensi:
          </span>
          <span className="text-slate-800 leading-relaxed sm:col-span-3">
            {kompetensi || "–"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-2">
          <span className="font-semibold text-slate-500 sm:col-span-1">
            Indikator:
          </span>
          <span className="font-semibold text-blue-950 leading-relaxed sm:col-span-3">
            {indikator || "–"}
          </span>
        </div>
      </div>
    </div>
  );
}
