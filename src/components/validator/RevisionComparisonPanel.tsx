"use client";

import React from "react";
import { GitCompare } from "lucide-react";
import { LatexPreview } from "@/components/ui/LatexPreview";
import { GambarIllustration } from "@/components/ui/GambarIllustration";

interface PayloadShape {
  soal_text?: string;
  gambar?: any;
  opsi?: Array<{ label: string; text: string }> | null;
  pernyataan?: Array<{ no: number; text: string }> | null;
  kategori_respons?: string[] | null;
  kunci_jawaban?: string[];
  pembahasan?: string;
}

interface RevisionComparisonPanelProps {
  previous: PayloadShape;
  current: PayloadShape;
  bentukSoal: string;
}

function isEqualField(a: any, b: any): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function GambarPreview({ gambar }: { gambar: any }) {
  if (!gambar) return <span className="text-slate-400 italic">Tidak ada ilustrasi</span>;
  if (gambar.tipe === "perlu_ilustrasi") {
    return <span className="text-amber-600 italic">Ditandai perlu ilustrasi</span>;
  }
  return <GambarIllustration gambar={gambar} className="max-h-40" />;
}

function OpsiList({ opsi, kunci }: { opsi: Array<{ label: string; text: string }>; kunci: string[] }) {
  if (!opsi?.length) return <span className="text-slate-400 italic">–</span>;
  return (
    <div className="space-y-1">
      {opsi.map((op) => {
        const isCorrect = kunci?.includes(op.label);
        return (
          <div
            key={op.label}
            className={`flex items-start gap-2 p-1.5 rounded-lg ${isCorrect ? "bg-emerald-100/70 font-medium" : ""}`}
          >
            <span className="font-mono font-bold shrink-0">{op.label}.</span>
            <span className="flex-1">
              <LatexPreview content={op.text} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function PernyataanList({
  pernyataan,
  kunci,
}: {
  pernyataan: Array<{ no: number; text: string }>;
  kunci: string[];
}) {
  if (!pernyataan?.length) return <span className="text-slate-400 italic">–</span>;
  return (
    <div className="space-y-1">
      {pernyataan.map((p, idx) => (
        <div key={p.no ?? idx} className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-slate-50">
          <span className="flex-1">
            <LatexPreview content={p.text} />
          </span>
          <span className="font-mono font-bold text-[11px] shrink-0">{kunci?.[idx] || "–"}</span>
        </div>
      ))}
    </div>
  );
}

function ComparisonRow({
  label,
  hasChange,
  before,
  after,
}: {
  label: string;
  hasChange: boolean;
  before: React.ReactNode;
  after: React.ReactNode;
}) {
  if (!hasChange) return null;
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">{label}</span>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 font-mono block mb-1.5">
            Sebelum
          </span>
          <div className="text-xs text-slate-800">{before}</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 font-mono block mb-1.5">
            Sesudah Perbaikan
          </span>
          <div className="text-xs text-slate-800">{after}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Menampilkan perbandingan versi lama vs versi hasil perbaikan hanya untuk field
 * yang benar-benar berubah, agar validator langsung fokus ke bagian yang direvisi
 * tanpa perlu membandingkan sendiri seluruh butir soal secara manual.
 */
export function RevisionComparisonPanel({ previous, current, bentukSoal }: RevisionComparisonPanelProps) {
  const soalChanged = !isEqualField(previous.soal_text, current.soal_text);
  const gambarChanged = !isEqualField(previous.gambar, current.gambar);
  const pembahasanChanged = !isEqualField(previous.pembahasan, current.pembahasan);
  const isKategori = bentukSoal === "PGK_KATEGORI";
  const jawabanChanged = isKategori
    ? !isEqualField(previous.pernyataan, current.pernyataan) ||
      !isEqualField(previous.kategori_respons, current.kategori_respons) ||
      !isEqualField(previous.kunci_jawaban, current.kunci_jawaban)
    : !isEqualField(previous.opsi, current.opsi) || !isEqualField(previous.kunci_jawaban, current.kunci_jawaban);

  const anyChange = soalChanged || gambarChanged || pembahasanChanged || jawabanChanged;
  if (!anyChange) return null;

  return (
    <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
        <GitCompare className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>Perbandingan Versi Lama vs. Hasil Perbaikan</span>
      </div>

      <ComparisonRow
        label="Teks Soal"
        hasChange={soalChanged}
        before={<LatexPreview content={previous.soal_text || "–"} />}
        after={<LatexPreview content={current.soal_text || "–"} />}
      />

      <ComparisonRow
        label="Ilustrasi / Diagram"
        hasChange={gambarChanged}
        before={<GambarPreview gambar={previous.gambar} />}
        after={<GambarPreview gambar={current.gambar} />}
      />

      <ComparisonRow
        label={isKategori ? "Pernyataan & Kunci" : "Opsi & Kunci Jawaban"}
        hasChange={jawabanChanged}
        before={
          isKategori ? (
            <PernyataanList pernyataan={previous.pernyataan || []} kunci={previous.kunci_jawaban || []} />
          ) : (
            <OpsiList opsi={previous.opsi || []} kunci={previous.kunci_jawaban || []} />
          )
        }
        after={
          isKategori ? (
            <PernyataanList pernyataan={current.pernyataan || []} kunci={current.kunci_jawaban || []} />
          ) : (
            <OpsiList opsi={current.opsi || []} kunci={current.kunci_jawaban || []} />
          )
        }
      />

      <ComparisonRow
        label="Pembahasan"
        hasChange={pembahasanChanged}
        before={<LatexPreview content={previous.pembahasan || "–"} />}
        after={<LatexPreview content={current.pembahasan || "–"} />}
      />
    </div>
  );
}

export default RevisionComparisonPanel;
