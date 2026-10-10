"use client";

import React, { useState } from "react";
import { Lock, User, Eye, EyeOff, Sparkles, X, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

interface LoginSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: any) => void;
}

export function LoginSiswaModal({ isOpen, onClose, onLoginSuccess }: LoginSiswaModalProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (!identifier.trim() || !password) {
      setErrorMessage("Silakan isi Email/NISN dan Kata Sandi.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login-siswa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Email/NISN atau password tidak sesuai.");
        setIsLoading(false);
        return;
      }

      // Berhasil login
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage("Gagal menghubungkan ke server. Silakan periksa koneksi internet Anda.");
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Dekoratif */}
        <div className="bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-md">
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </div>
          <h3 className="text-xl font-black tracking-tight">Masuk Tutor AI AyoTKA</h3>
          <p className="text-xs text-blue-100 mt-1 max-w-xs mx-auto">
            Masukkan akun siswa/member AyoTKA untuk langsung membuka ruang belajar pintar.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email atau NISN (10 Digit)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="misal: 0081234567 atau email kamu"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Footer Bantuan */}
          <div className="pt-3 border-t border-slate-100 text-center space-y-2">
            <p className="text-[11px] text-slate-500">
              Belum punya akun member?{" "}
              <a
                href="https://ayotka.id/registrasi"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-blue-600 hover:underline"
              >
                Daftar Member di ayotka.id
              </a>
            </p>
            <p className="text-[10px] text-slate-400">
              Atau masuk melalui{" "}
              <a
                href="https://ayotka.id/login"
                className="text-slate-600 hover:text-blue-600 underline font-medium"
              >
                portal utama ayotka.id/login
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
