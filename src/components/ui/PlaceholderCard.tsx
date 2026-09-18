import React from "react";
import { LucideIcon, Layers, ShieldCheck, ArrowRight } from "lucide-react";
import { UserRoleType } from "@/db/schema";
import { RoleBadge } from "./Badge";

interface PlaceholderCardProps {
  title: string;
  category: string;
  requiredRole: UserRoleType;
  icon: LucideIcon;
  description: string;
  features?: string[];
  backendEnforcementNote: string;
  children?: React.ReactNode;
}

export function PlaceholderCard({
  title,
  category,
  requiredRole,
  icon: Icon,
  description,
  features,
  backendEnforcementNote,
  children,
}: PlaceholderCardProps) {
  const hasFeatures = Array.isArray(features) && features.length > 0;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  {category}
                </span>
                <span className="text-slate-300">·</span>
                {hasFeatures ? (
                  <span className="font-mono text-xs text-amber-600 font-medium">Tahap Rencana</span>
                ) : (
                  <span className="font-mono text-xs text-emerald-600 font-medium font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Fitur Aktif
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Peran Diperlukan:</span>
            <RoleBadge role={requiredRole} />
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-600 leading-relaxed max-w-3xl">{description}</p>

        {/* Backend Enforcement Badge */}
        <div className="mt-5 p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-slate-900">Penegakan Hak Akses Backend: </span>
            <span className="text-slate-600">{backendEnforcementNote}</span>
          </div>
        </div>
      </div>

      {/* Rencana Fitur Mendatang (Hanya tampil jika ada data rencana features) */}
      {hasFeatures && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-mono">
              Rencana Kapabilitas (Fase Berikutnya)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-100 bg-slate-50/60 text-xs text-slate-700"
              >
                <ArrowRight className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Konten Tambahan / Data Preview jika ada */}
      {children}
    </div>
  );
}
