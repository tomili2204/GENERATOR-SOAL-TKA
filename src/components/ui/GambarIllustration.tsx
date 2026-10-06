"use client";

import React from "react";
import { SvgIllustration } from "./SvgIllustration";

interface GambarIllustrationProps {
  gambar:
    | {
        tipe: "svg" | "url" | "perlu_ilustrasi" | "diagram" | "ilustrasi_kontekstual";
        svg_content?: string;
        url?: string;
        image_data?: string;
        svg_fallback?: string;
        deskripsi_alt?: string;
      }
    | null
    | undefined;
  className?: string;
}

/**
 * Titik render tunggal untuk field "gambar" pada payload soal, dipakai konsisten di seluruh
 * halaman (studio generator, review validator, preview paket) agar setiap tipe gambar baru
 * (mis. "ilustrasi_kontekstual" dari Nano Banana Pro) hanya perlu ditangani di satu tempat.
 */
export function GambarIllustration({ gambar, className = "" }: GambarIllustrationProps) {
  const [activeTab, setActiveTab] = React.useState<"svg" | "photo">("photo");

  if (!gambar) return null;

  if (gambar.tipe === "svg" && gambar.svg_content) {
    return <SvgIllustration svgContent={gambar.svg_content} altText={gambar.deskripsi_alt} className={className} />;
  }

  if (gambar.tipe === "ilustrasi_kontekstual" && (gambar.url || gambar.image_data)) {
    const imgSrc = (gambar.url || gambar.image_data) as string;
    if (gambar.svg_fallback) {
      return (
        <div className={`space-y-2 ${className}`}>
          <div className="flex items-center justify-end gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Tampilan Ilustrasi:</span>
            <button
              type="button"
              onClick={() => setActiveTab("svg")}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                activeTab === "svg"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              📊 Diagram Presisi (SVG)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("photo")}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                activeTab === "photo"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              📷 Foto Ilustrasi
            </button>
          </div>
          {activeTab === "svg" ? (
            <SvgIllustration svgContent={gambar.svg_fallback} altText={gambar.deskripsi_alt} />
          ) : (
            <img
              src={imgSrc}
              alt={gambar.deskripsi_alt || "Ilustrasi kontekstual"}
              className="max-w-full max-h-96 mx-auto rounded-lg border border-slate-200 object-contain block"
            />
          )}
        </div>
      );
    }

    return (
      <img
        src={imgSrc}
        alt={gambar.deskripsi_alt || "Ilustrasi kontekstual"}
        className={`max-w-full max-h-96 mx-auto rounded-lg border border-slate-200 object-contain block ${className}`}
      />
    );
  }

  if (gambar.tipe === "url" && gambar.url) {
    return (
      <img
        src={gambar.url}
        alt={gambar.deskripsi_alt || "Ilustrasi Soal"}
        className={`max-w-full max-h-64 mx-auto rounded-lg border border-slate-200 object-contain block ${className}`}
      />
    );
  }

  if (gambar.tipe === "perlu_ilustrasi") {
    return (
      <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded border border-amber-200 inline-block font-mono">
        Catatan: Butir soal ini ditandai memerlukan pembuatan ilustrasi visual.
      </span>
    );
  }

  return null;
}

export default GambarIllustration;
