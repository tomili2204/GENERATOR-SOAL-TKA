"use client";

import React, { useState } from "react";
import { TutorAiChatModal } from "@/components/tutor/TutorAiChatModal";
import { Sparkles, Bot, BookOpen, CheckCircle, ArrowRight } from "lucide-react";

export default function TutorDemoPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Data Soal Contoh untuk Demo
  const contohSoal = {
    soalId: "DEMO-SD-MAT-01",
    jenjang: "SD/MI",
    mapel: "Matematika",
    stimulus: "Pak Budi memiliki sebidang kebun sayur di belakang rumahnya. Ia ingin memagari kebun tersebut dengan kawat berduri.",
    soal_text: "Kebun Pak Budi berbentuk persegi panjang dengan panjang 12 meter dan lebar 8 meter. Berapakah keliling kebun Pak Budi yang akan dipagari?",
    opsi: [
      { label: "A", text: "20 meter" },
      { label: "B", text: "40 meter" },
      { label: "C", text: "96 meter" },
      { label: "D", text: "48 meter" },
    ],
    kunci_jawaban: "B",
    pembahasan: "Keliling persegi panjang dihitung dengan rumus $K = 2 \\times (p + l) = 2 \\times (12 + 8) = 2 \\times 20 = 40$ meter.",
    jawaban_siswa: "A", // Siswa menjawab salah
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Sparkles className="h-6 w-6 text-yellow-300" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Tutor AI AyoTKA
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Demo Interaktif Fitur Bimbingan Sokrates Siswa (ai.ayotka.id)
            </p>
          </div>
        </div>

        {/* Simulasi Kotak Pembahasan Siswa */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
              {contohSoal.jenjang} • {contohSoal.mapel}
            </span>
            <span className="text-red-500 font-semibold bg-red-100 dark:bg-red-950/40 px-2 py-0.5 rounded">
              Jawaban Kamu: {contohSoal.jawaban_siswa} (Salah)
            </span>
          </div>

          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {contohSoal.soal_text}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {contohSoal.opsi.map((o) => (
              <div
                key={o.label}
                className={`p-2 rounded-lg border ${
                  o.label === "A"
                    ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-semibold"
                    : o.label === "B"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                {o.label}. {o.text} {o.label === "A" && "(Pilihanmu)"} {o.label === "B" && "✓ (Kunci)"}
              </div>
            ))}
          </div>

          {/* Tombol yang akan dipasang di AyoTKA */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition"
            >
              <Bot className="h-4 w-4" />
              Tanya Tutor AI Kenapa Salah
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Tentang Fitur Ini:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tutor AI cerdas berkecepatan tinggi dengan sistem ketersediaan tinggi (high availability) bebas kendala antrean.</li>
            <li>Menggunakan metode bimbingan Sokrates (memandu anak menemukan konsepnya sendiri, bukan memberi kunci instan).</li>
            <li>Rumus matematika otomatis dirender menggunakan KaTeX yang jernih dan tajam.</li>
          </ul>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Ingin mencoba chat bebas?</span>
            <a
              href="/ai"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              Buka Portal AI Siswa (ai.ayotka.id) &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* Modal Drawer Chatbot */}
      <TutorAiChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        soalContext={contohSoal}
      />
    </div>
  );
}
