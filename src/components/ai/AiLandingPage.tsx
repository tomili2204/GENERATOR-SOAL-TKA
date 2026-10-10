"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Lock,
  ArrowRight,
  Image as ImageIcon,
  Calculator,
  Compass,
  Zap,
  ShieldCheck,
  Brain,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import { LoginSiswaModal } from "./LoginSiswaModal";

interface AiLandingPageProps {
  onLoginSuccess?: (user: any) => void;
}

export function AiLandingPage({ onLoginSuccess }: AiLandingPageProps) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  AyoTKA AI
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Tutor Cerdas
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Khusus Member AyoTKA</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://ayotka.id/registrasi"
              className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-600 hover:text-blue-600 px-3 py-2 rounded-lg transition"
            >
              Daftar Member
            </a>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition active:scale-95 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Masuk sebagai Member
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200 bg-gradient-to-b from-white via-blue-50/30 to-slate-50">
          {/* Background Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
            {/* Pill Banner */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-6 shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              Portal Eksklusif Siswa & Member AyoTKA
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] mb-6">
              Tutor AI Interaktif 24/7 untuk{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                Kuasai Soal Ujian & TKA
              </span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
              Bukan sekadar mesin contekan instan. Tutor AI AyoTKA memandu logika berpikirmu langkah demi langkah, mengenali foto soal tulisan tangan, serta menyajikan rumus matematika dengan standar presisi tinggi.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto mb-12">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                Masuk sebagai Member
              </button>
              <a
                href="https://ayotka.id/registrasi"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm border border-slate-300 shadow-xs transition"
              >
                Daftar Member
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Quick Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-6 border-t border-slate-200/80">
              <div className="flex flex-col items-center p-3 rounded-xl bg-white/70 border border-slate-200 shadow-xs">
                <Brain className="w-5 h-5 text-blue-600 mb-1" />
                <span className="text-xs font-bold text-slate-800">Metode Sokrates</span>
                <span className="text-[10px] text-slate-500">Paham konsep tuntas</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-white/70 border border-slate-200 shadow-xs">
                <ImageIcon className="w-5 h-5 text-indigo-600 mb-1" />
                <span className="text-xs font-bold text-slate-800">Baca Foto Soal</span>
                <span className="text-[10px] text-slate-500">Buku & coretan tangan</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-white/70 border border-slate-200 shadow-xs">
                <Calculator className="w-5 h-5 text-purple-600 mb-1" />
                <span className="text-xs font-bold text-slate-800">Rumus KaTeX</span>
                <span className="text-[10px] text-slate-500">Notasi matematika rapi</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-xl bg-white/70 border border-slate-200 shadow-xs">
                <Zap className="w-5 h-5 text-amber-500 mb-1" />
                <span className="text-xs font-bold text-slate-800">Sesi Pribadi</span>
                <span className="text-[10px] text-slate-500">Tersimpan per user</span>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Chat Mockup Showcase */}
        <section className="py-16 bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-2">
                Simulasi Pengalaman Belajar
              </h2>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Cara Kerja Tutor AI Mendampingi Siswa
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-6 shadow-md">
              <div className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end gap-3 items-start">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-xs sm:text-sm max-w-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-2 p-1.5 rounded-lg bg-white/10 border border-white/20">
                      <ImageIcon className="w-4 h-4 text-blue-200" />
                      <span className="text-[11px] font-medium">[Lampiran Foto: Soal Segitiga & Sudut.jpg]</span>
                    </div>
                    Kak Tutor, tolong bantu soal nomor 4. Nilai hipotenusa segitiga siku-siku 25 cm dan salah satu sisi tegak 7 cm. Bagaimana mencari kelilingnya?
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                    S
                  </div>
                </div>

                {/* AI Tutor Reply */}
                <div className="flex justify-start gap-3 items-start">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 text-xs sm:text-sm text-slate-800 max-w-xl shadow-xs leading-relaxed space-y-2.5">
                    <p>
                      Halo! Pertanyaan yang bagus sekali. Mari kita selesaikan bersama dengan prinsip dasar <strong>Teorema Pythagoras</strong> ya!
                    </p>
                    <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 font-mono text-xs">
                      a² + b² = c²
                    </div>
                    <p>
                      Dari soal, kita tahu:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                      <li>Sisi miring (c) = 25 cm</li>
                      <li>Sisi alas (a) = 7 cm</li>
                      <li>Sisi tegak kedua (b) = ?</li>
                    </ul>
                    <p>
                      Coba kamu hitung nilai b² dengan rumus: <code>b² = 25² - 7²</code>. Berapakah hasil pengurangan <code>625 - 49</code>? Yuk ketik tebakanmu!
                    </p>
                    <div className="pt-1 flex items-center gap-2 text-[10px] text-slate-400">
                      <span>Baru saja</span>
                      <span>•</span>
                      <span className="font-semibold text-blue-600">Tutor AI AyoTKA</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Input Bar */}
              <div className="mt-5 pt-4 border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  disabled
                  placeholder="Ketik balasan atau upload foto soal..."
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                >
                  Masuk sebagai Member
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-2">
                Fitur & Keunggulan Utama
              </h2>
              <p className="text-3xl font-extrabold text-slate-900">
                Dirancang Khusus untuk Kebutuhan Siswa Indonesia
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Metode Bimbingan Sokrates
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tidak memanjakan siswa dengan jawaban instan. AI memberikan pertanyaan pemicu logika agar siswa memahami proses berpikirnya sendiri secara mandiri.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Multimodal Vision AI
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bisa membaca gambar, grafik, foto buku paket, hingga tulisan tangan siswa di kertas coret-coretan dengan akurasi visual tinggi.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <Calculator className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Notasi KaTeX & MathType
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Menampilkan rumus pecahan, akar, eksponen, sudut, integral, dan matriks dengan format penulisan matematika standar akademik internasional.
                </p>
              </div>

              {/* Card 4 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Sesi Pribadi Terisolasi
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Layaknya ChatGPT dan Claude, setiap akun member memiliki riwayat sesi percakapan sendiri yang tersimpan rapi dan tidak akan tercampur dengan member lain.
                </p>
              </div>

              {/* Card 5 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  4 Mode Belajar Spesifik
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pilih mode yang sesuai: Bimbingan Sokrates, Penyelesai Trik Cepat TKA, Pengasah Literasi Teks, atau Pembuat Simulasi Soal Latihan.
                </p>
              </div>

              {/* Card 6 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Infrastruktur Privat Tanpa Antre
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dikelola di server khusus member AyoTKA dengan sistem failover otomatis multi-jalur, menjamin respon kilat tanpa batas kuota harian.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Member Exclusive Banner */}
        <section className="py-16 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold mb-4">
              Sudah Memiliki Akun Member AyoTKA?
            </h2>
            <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto mb-8">
              Cukup masuk dengan akun member AyoTKA Anda untuk langsung mengakses ruang bimbingan belajarmu.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="px-8 py-3.5 rounded-xl bg-white text-blue-700 font-bold text-sm shadow-lg shadow-black/10 hover:bg-blue-50 transition active:scale-95 inline-flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                Masuk sebagai Member
              </button>
              <a
                href="https://ayotka.id/registrasi"
                className="px-8 py-3.5 rounded-xl bg-blue-500/30 text-white font-bold text-sm border border-white/30 hover:bg-white/10 transition active:scale-95 inline-flex items-center gap-2"
              >
                Daftar Member
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} AyoTKA · Portal Tutor AI Pembelajaran Cerdas</p>
          <div className="flex items-center gap-4">
            <a href="https://ayotka.id" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition">
              Beranda AyoTKA
            </a>
            <a href="https://ayotka.id/registrasi" className="hover:text-blue-600 transition">
              Daftar Member
            </a>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="hover:text-blue-600 transition font-semibold text-blue-600 cursor-pointer"
            >
              Masuk sebagai Member
            </button>
          </div>
        </div>
      </footer>

      {/* Modal Login Siswa Langsung */}
      <LoginSiswaModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={onLoginSuccess}
      />
    </div>
  );
}
