"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const demoAccounts = [
    {
      label: "Admin AyoTKA",
      email: "admin@ayotka.id",
      pass: "admin123",
      roles: ["admin"],
      desc: "Akses penuh: pengguna, toggle generator, taksonomi, semua soal, audit log.",
      color: "border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700",
    },
    {
      label: "Pembuat Soal",
      email: "pembuat@ayotka.id",
      pass: "pembuat123",
      roles: ["pembuat_soal"],
      desc: "Hanya unggah & kelola soal miliknya sendiri yang belum disetujui.",
      color: "border-violet-200 bg-violet-50/50 hover:bg-violet-50 text-violet-700",
    },
    {
      label: "Validator Soal",
      email: "validator@ayotka.id",
      pass: "validator123",
      roles: ["validator_soal"],
      desc: "Periksa antrean soal, telaah (setujui/tolak/revisi), dan pantau riwayat.",
      color: "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700",
    },
    {
      label: "Akun Ganda (Multi-Peran)",
      email: "ganda@ayotka.id",
      pass: "ganda123",
      roles: ["pembuat_soal", "validator_soal"],
      desc: "Uji pemisahan tugas: dilarang backend memvalidasi soal buatannya sendiri.",
      color: "border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-800",
    },
  ];

  async function handleLogin(e?: React.FormEvent, customEmail?: string, customPass?: string) {
    if (e) e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    const targetEmail = customEmail ?? email;
    const targetPass = customPass ?? password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Login gagal. Silakan periksa kembali email & password Anda.");
        setIsLoading(false);
        return;
      }

      // Berhasil
      router.push("/");
      router.refresh();
    } catch (err) {
      setErrorMsg("Gagal menghubungi server. Pastikan koneksi aktif.");
      setIsLoading(false);
    }
  }

  function handleSelectDemo(demo: typeof demoAccounts[0]) {
    setEmail(demo.email);
    setPassword(demo.pass);
    handleLogin(undefined, demo.email, demo.pass);
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-2 rounded-xl bg-white border border-slate-200 shadow-sm mb-1">
          <Image
            src="/logo.png"
            alt="AyoTKA Logo"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          soal.ayotka.id
        </h1>
        <p className="text-xs text-slate-500 font-mono">
          PANEL INTERNAL MANAJEMEN & VALIDASI SOAL TKA
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        {errorMsg && (
          <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono mb-1.5">
              Email Tim Internal
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@ayotka.id"
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500 transition-all disabled:opacity-50"
          >
            <span>{isLoading ? "Memproses Autentikasi..." : "Masuk ke Panel"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Persona Switcher for Evaluation */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              Pilih Akun Demo (1-Klik Uji Peran)
            </span>
          </div>

          <div className="space-y-2">
            {demoAccounts.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => handleSelectDemo(demo)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-0.5 ${demo.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs font-mono">{demo.label}</span>
                  <span className="text-[10px] font-mono opacity-80">{demo.email}</span>
                </div>
                <span className="text-[10px] text-slate-600 font-normal leading-tight">
                  {demo.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 font-mono">
        © AyoTKA · Sistem Khusus Tim Internal Manajemen Soal
      </p>
    </div>
  );
}
