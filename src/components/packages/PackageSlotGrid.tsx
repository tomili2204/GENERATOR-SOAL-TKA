"use client";

import React from "react";
import { STATUS_CONFIGS } from "@/lib/tokens";
import { QuestionStatusType, BentukSoalType, TingkatKesulitanType } from "@/db/schema";
import { Plus, CheckCircle2, Clock, AlertTriangle, XCircle, Eye, Edit3, RefreshCw } from "lucide-react";

export interface SlotData {
  nomorUrut: number;
  blueprint: {
    nomorUrut: number;
    bentukSoal: BentukSoalType;
    tingkatKesulitan: TingkatKesulitanType;
    levelKognitif: string;
    rekomendasiJenisSoal: "tunggal" | "grup";
    deskripsi: string;
  };
  question: any | null;
  isFilled: boolean;
  status: QuestionStatusType | "empty";
}

interface PackageSlotGridProps {
  slots: SlotData[];
  onSelectSlot: (slot: SlotData) => void;
  isValidator?: boolean;
}

export function PackageSlotGrid({ slots, onSelectSlot, isValidator = false }: PackageSlotGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {slots.map((slot) => {
        const q = slot.question;
        const b = slot.blueprint;
        const isFilled = slot.isFilled && q;

        let borderClass = "border-slate-200 hover:border-slate-300 bg-white";
        let badge = (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500">
            Kosong
          </span>
        );

        if (isFilled) {
          if (q.status === "disetujui") {
            borderClass = "border-emerald-200 bg-emerald-50/20 hover:border-emerald-400";
            badge = (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                <span>Disetujui</span>
              </span>
            );
          } else if (q.status === "menunggu_validasi") {
            borderClass = "border-amber-200 bg-amber-50/20 hover:border-amber-400";
            badge = (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                <Clock className="w-2.5 h-2.5 text-amber-600" />
                <span>Menunggu</span>
              </span>
            );
          } else if (q.status === "direvisi" || q.status === "perlu_revisi") {
            borderClass = "border-orange-300 bg-orange-50/40 hover:border-orange-500 ring-1 ring-orange-200";
            badge = (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800 font-bold">
                <AlertTriangle className="w-2.5 h-2.5 text-orange-600" />
                <span>Revisi</span>
              </span>
            );
          } else if (q.status === "ditolak") {
            borderClass = "border-rose-300 bg-rose-50/40 hover:border-rose-500 ring-1 ring-rose-200";
            badge = (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800 font-bold">
                <XCircle className="w-2.5 h-2.5 text-rose-600" />
                <span>Ditolak</span>
              </span>
            );
          }
        }

        return (
          <div
            key={slot.nomorUrut}
            onClick={() => onSelectSlot(slot)}
            className={`rounded-xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between relative shadow-xs hover:shadow-md ${borderClass}`}
          >
            <div>
              {/* Header Slot: Nomor & Status */}
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {slot.nomorUrut.toString().padStart(2, "0")}
                </span>
                {badge}
              </div>

              {/* Spesifikasi Blueprint */}
              <div className="space-y-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-800">
                    {slot.question?.bentukSoal || b.bentukSoal}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                      (slot.question?.tingkatKesulitan || b.tingkatKesulitan) === "rendah"
                        ? "bg-emerald-50 text-emerald-700"
                        : (slot.question?.tingkatKesulitan || b.tingkatKesulitan) === "sedang"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {slot.question?.tingkatKesulitan || b.tingkatKesulitan}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-1" title={b.levelKognitif}>
                  {b.levelKognitif}
                </p>
              </div>

              {/* Cuplikan Teks Soal jika sudah terisi */}
              {isFilled ? (
                <p className="text-xs text-slate-700 line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100 mb-2 font-sans text-[11px]">
                  {q.payload?.soal_text || "Teks soal..."}
                </p>
              ) : (
                <div className="border border-dashed border-slate-200 rounded p-2 text-center text-[11px] text-slate-400 mb-2">
                  Belum ada soal
                </div>
              )}
            </div>

            {/* Tombol Aksi di Bawah */}
            <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between">
              {isFilled ? (
                q.status === "ditolak" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                    <RefreshCw className="w-3 h-3" />
                    <span>Ganti Soal</span>
                  </span>
                ) : q.status === "direvisi" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600">
                    <Edit3 className="w-3 h-3" />
                    <span>Perbaiki</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900">
                    <Eye className="w-3 h-3" />
                    <span>{isValidator ? "Telaah" : "Lihat"}</span>
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600">
                  <Plus className="w-3 h-3" />
                  <span>Isi Slot</span>
                </span>
              )}

              <span className="text-[10px] font-mono text-slate-400">
                {b.rekomendasiJenisSoal === "grup" ? "Grup" : "Tunggal"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
