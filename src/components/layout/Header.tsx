"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Shield, User, ChevronDown, Check } from "lucide-react";
import { SessionUser } from "@/lib/auth/roles";
import { RoleBadge } from "../ui/Badge";
import { UserRoleType } from "@/db/schema";

interface HeaderProps {
  user: SessionUser;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm">
      {/* Brand & Context */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-0.5 shadow-sm">
            <Image
              src="/logo.png"
              alt="AyoTKA Logo"
              width={32}
              height={32}
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 tracking-tight text-sm group-hover:text-indigo-600 transition-colors">
                soal.ayotka.id
              </span>
              <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 text-[10px] font-mono font-semibold text-indigo-700 uppercase">
                Internal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Panel Manajemen Soal & Validasi TKA
            </p>
          </div>
        </Link>
      </div>

      {/* User Information, Roles & Logout */}
      <div className="flex items-center gap-4">
        {/* Role Chips */}
        <div className="hidden md:flex items-center gap-1.5">
          {Array.from(new Set(user.roles)).map((r: UserRoleType) => (
            <RoleBadge key={r} role={r} />
          ))}
        </div>

        <div className="h-5 w-[1px] bg-slate-200 hidden md:block" />

        {/* Profile Card & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</p>
            <p className="text-[11px] font-mono text-slate-500">{user.email}</p>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title="Keluar dari sesi"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isLoggingOut ? "Keluar..." : "Keluar"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
