"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionUser, hasAnyRole } from "@/lib/auth/roles";
import { DASHBOARD_NAV_ITEMS, NavItem } from "@/lib/tokens";
import { Shield, Sparkles } from "lucide-react";

interface SidebarProps {
  user: SessionUser;
}

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  admin:          { label: "Administrator",   className: "bg-violet-50 border-violet-200 text-violet-700" },
  pembuat_soal:   { label: "Pembuat Soal",    className: "bg-blue-50 border-blue-200 text-blue-700" },
  validator_soal: { label: "Validator Soal",  className: "bg-emerald-50 border-emerald-200 text-emerald-700" },
};

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const uniqueRoles = Array.from(new Set(user.roles));

  // Filter menu navigasi berdasarkan peran pengguna yang sedang login
  const permittedItems = DASHBOARD_NAV_ITEMS.filter((item) =>
    hasAnyRole(user, item.roles)
  );

  // Kelompokkan per section
  const sections: Array<NavItem["section"]> = [
    "Ringkasan",
    "Pembuat Soal",
    "Validator Soal",
    "Administrator",
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* Banner Pemisahan Peran Ringkas */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Peran Aktif Akun</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {uniqueRoles.map((role) => {
              const config = ROLE_LABELS[role] ?? { label: role, className: "bg-white border-slate-200 text-slate-700" };
              return (
                <span
                  key={role}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.className}`}
                >
                  {config.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Menu Navigasi Berdasarkan Peran */}
        <nav className="space-y-5">
          {sections.map((sectionName) => {
            const items = permittedItems.filter((i) => i.section === sectionName);
            if (items.length === 0) return null;

            return (
              <div key={sectionName} className="space-y-1">
                <p className="px-3 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                  {sectionName}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? "text-indigo-600" : "text-slate-400"
                          }`}
                        />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Sistem */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>soal.ayotka.id</span>
          <span className="text-emerald-600 font-semibold">● v0.1-fondasi</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Satu keluarga visual ayotka.id
        </p>
      </div>
    </aside>
  );
}
