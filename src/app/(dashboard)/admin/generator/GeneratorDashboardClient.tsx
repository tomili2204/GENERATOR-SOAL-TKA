"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Settings,
  Clock,
  Cpu,
  Layers,
  ShieldAlert,
} from "lucide-react";
import { AiSettingsForm } from "./AiSettingsForm";
import { FlexibleGeneratorStudio } from "./FlexibleGeneratorStudio";
import { GeneratorToggleList } from "./GeneratorToggleList";
import { GenerationLogsTable, GenerationLogItem } from "./GenerationLogsTable";

import { TemaKonteksPoolItem } from "@/db/schema";

export interface GeneratorConfigItem {
  id: string;
  jenjang: string;
  mapel: string;
  isAutoActive: boolean;
  dailyTargetQuota: number;
}

interface GeneratorDashboardClientProps {
  initialConfigs: GeneratorConfigItem[];
  initialLogs: GenerationLogItem[];
  initialThemes?: TemaKonteksPoolItem[];
}

export function GeneratorDashboardClient({
  initialConfigs,
  initialLogs,
  initialThemes = [],
}: GeneratorDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"studio" | "settings" | "schedule">("studio");
  const [logsKey, setLogsKey] = useState(0);

  function handleRefreshLogs() {
    setLogsKey((prev) => prev + 1);
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("studio")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === "studio"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Studio Generator Fleksibel
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === "settings"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
          }`}
        >
          <Settings className="w-4 h-4 text-indigo-600" />
          Pengaturan API & Model
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === "schedule"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
          }`}
        >
          <Clock className="w-4 h-4 text-slate-500" />
          Jadwal Harian & Pipeline
        </button>
      </div>

      {/* Tab 1: Studio Generator Fleksibel */}
      {activeTab === "studio" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Studio Pembuatan Paket Soal On-Demand
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurasikan sasaran kurikulum, target jumlah butir, komposisi bentuk soal, serta fokus instruksi khusus untuk menghasilkan paket soal TKA secara langsung.
              </p>
            </div>

            <FlexibleGeneratorStudio
              onGenerateComplete={handleRefreshLogs}
              initialThemes={initialThemes}
            />
          </div>

          {/* Tabel Riwayat Eksekusi */}
          <GenerationLogsTable key={`studio-logs-${logsKey}`} initialLogs={initialLogs} />
        </div>
      )}

      {/* Tab 2: Pengaturan API & Model */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                Konfigurasi Google Gemini API & Model
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola API Key, pilih varian model LLM, sesuaikan parameter temperature, dan lakukan uji koneksi API langsung dari dashboard tanpa menyentuh file server.
              </p>
            </div>

            <AiSettingsForm onSaved={handleRefreshLogs} />
          </div>

          {/* Info Standar BSKAP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-800 uppercase mb-1">
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                Standar BSKAP Kemendikdasmen
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pemanggilan model secara otomatis menyertakan System Prompt resmi Perkaban No. 45/2025 & No. 47/2025 yang menjamin akurasi level kognitif dan mutu distraktor.
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-800 uppercase mb-1">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                Gerbang Sanitasi Ketat
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Setiap output diverifikasi keseimbangan LaTeX-nya, keselarasan kategori biner, dan struktur stimulusnya sebelum diizinkan masuk ke database.
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-800 uppercase mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Penyimpanan Aman di DB
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                API Key disimpan dalam tabel <code>system_settings</code> dengan proteksi RBAC Admin dan selalu disamarkan saat dimuat kembali di antarmuka.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Jadwal Otomatis & Pipeline */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Jadwal Pipeline Harian per Kombinasi Jenjang & Mapel
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Nyalakan toggle agar server menjalankan cron generate otomatis setiap pagi untuk kombinasi kurikulum yang diinginkan.
              </p>
            </div>

            <GeneratorToggleList
              initialConfigs={initialConfigs}
              onGenerateSuccess={handleRefreshLogs}
            />
          </div>

          <GenerationLogsTable key={`schedule-logs-${logsKey}`} initialLogs={initialLogs} />
        </div>
      )}
    </div>
  );
}
