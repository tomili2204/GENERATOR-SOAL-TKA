import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  badgeText?: string;
  badgeVariant?: "emerald" | "amber" | "indigo" | "violet" | "slate";
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  badgeText,
  badgeVariant = "slate",
}: StatCardProps) {
  const badgeColors = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-500 font-medium">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold font-mono tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-700">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(description || badgeText) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {description && <span className="text-slate-500">{description}</span>}
          {badgeText && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${badgeColors[badgeVariant]}`}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
