import React from "react";
import { QuestionStatusType, UserRoleType } from "@/db/schema";
import { STATUS_CONFIGS, ROLE_CONFIGS } from "@/lib/tokens";

interface StatusBadgeProps {
  status: QuestionStatusType;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className = "", showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIGS[status] || STATUS_CONFIGS.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border font-mono tracking-tight ${config.bgClass} ${config.textClass} ${config.borderClass} ${className}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />}
      {config.label}
    </span>
  );
}

interface RoleBadgeProps {
  role: UserRoleType;
  className?: string;
  showDot?: boolean;
}

export function RoleBadge({ role, className = "", showDot = true }: RoleBadgeProps) {
  const config = ROLE_CONFIGS[role];
  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bgClass} ${config.textClass} ${config.borderClass} ${className}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />}
      {config.badgeLabel}
    </span>
  );
}

interface TagProps {
  children: React.ReactNode;
  variant?: "slate" | "indigo" | "violet" | "emerald";
  className?: string;
}

export function Tag({ children, variant = "slate", className = "" }: TagProps) {
  const variants = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
