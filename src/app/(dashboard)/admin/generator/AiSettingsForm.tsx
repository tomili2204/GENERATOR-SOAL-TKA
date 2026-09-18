"use client";

import React, { useState, useEffect } from "react";
import {
  Key,
  Cpu,
  Sliders,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Save,
  Zap,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

interface AiSettingsFormProps {
  onSaved?: () => void;
}

export function AiSettingsForm({ onSaved }: AiSettingsFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState("");
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [modelName, setModelName] = useState("gemini-3-flash-preview");
  const [temperature, setTemperature] = useState(0.7);
  const [customPromptPrefix, setCustomPromptPrefix] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testStatus, setTestStatus] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/admin/settings/ai");
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          setHasStoredKey(data.data.hasKey);
          setMaskedKey(data.data.apiKeyMasked || "");
          if (data.data.modelName) setModelName(data.data.modelName);
          if (typeof data.data.temperature === "number") setTemperature(data.data.temperature);
          if (data.data.customPromptPrefix) setCustomPromptPrefix(data.data.customPromptPrefix);
        }
      } catch (err) {
        console.error("Gagal memuat setting AI:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    setTestStatus(null);

    try {
      const res = await fetch("/api/admin/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          modelName,
          temperature,
          customPromptPrefix,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setSaveStatus({
          type: "error",
          message: data.error || "Gagal menyimpan pengaturan API.",
        });
        return;
      }

      setSaveStatus({
        type: "success",
        message: "Konfigurasi AI dan API Key berhasil disimpan dan aktif di sistem!",
      });

      if (apiKey.trim()) {
        setHasStoredKey(true);
        setMaskedKey(`${apiKey.substring(0, 6)}••••••••••••${apiKey.substring(apiKey.length - 4)}`);
        setApiKey("");
      }

      if (onSaved) onSaved();
    } catch (err: any) {
      setSaveStatus({
        type: "error",
        message: `Terjadi kendala jaringan: ${err.message}`,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestConnection() {
    setIsTesting(true);
    setTestStatus(null);

    try {
      const res = await fetch("/api/admin/settings/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          modelName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestStatus({
          success: true,
          message: data.data?.message || "Koneksi ke Gemini API sukses!",
          latencyMs: data.data?.latencyMs,
        });
      } else {
        setTestStatus({
          success: false,
          message: data.data?.message || data.error || "Gagal terhubung ke Gemini API.",
          latencyMs: data.data?.latencyMs,
        });
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: `Kendala jaringan saat pengujian: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-500 font-mono text-xs gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
        Memuat konfigurasi API AI...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Status Banners */}
      {saveStatus && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-3 ${
            saveStatus.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {saveStatus.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {testStatus && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-start gap-3 ${
            testStatus.success
              ? "bg-teal-50 border-teal-200 text-teal-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {testStatus.success ? (
            <Zap className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <p className="font-bold">{testStatus.success ? "Uji Koneksi Berhasil" : "Uji Koneksi Gagal"}</p>
            <p>{testStatus.message}</p>
          </div>
        </div>
      )}

      {/* Grid Konfigurasi Utama */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kolom 1: API Key */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold font-mono text-slate-800 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                Google Gemini API Key
              </span>
              {hasStoredKey && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-sans font-semibold">
                  <ShieldCheck className="w-3 h-3" />
                  Kunci Tersimpan
                </span>
              )}
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Kunci API dari Google AI Studio. Kunci akan disimpan aman di database server dan digunakan untuk seluruh proses generate.
            </p>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasStoredKey ? `Kunci aktif tersimpan: ${maskedKey}` : "Tempel Gemini API Key di sini (AIzaSy...)"}
                className="w-full text-xs font-mono px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white placeholder:text-slate-600 font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {hasStoredKey && (
              <p className="mt-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 leading-relaxed">
                🔒 <strong>Kunci API Aktif di Server:</strong> Kunci Anda (<code>{maskedKey}</code>) sudah tersimpan aman di database server. Kolom input sengaja tidak menampilkan teks asli demi keamanan. Cukup biarkan kolom ini jika tidak ingin mengganti kunci.
              </p>
            )}

            <div className="mt-2 flex items-center justify-between text-[11px]">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold"
              >
                <span>Dapatkan API Key Gratis di Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-bold font-mono text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              Pilihan Model Gemini
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Pilih varian model AI yang digunakan untuk menyusun stimulus dan butir soal TKA.
            </p>

            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
            >
              <option value="gemini-3-flash-preview">gemini-3-flash-preview (Rekomendasi Utama — Paling Stabil, Cerdas & Tahan Beban)</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash (Model Flash Standar Google)</option>
              <option value="gemini-flash-latest">gemini-flash-latest (Selalu Versi Flash Terbaru)</option>
              <option value="gemini-3.1-flash-lite-preview">gemini-3.1-flash-lite-preview (Model Super Cepat & Ringan)</option>
            </select>
          </div>
        </div>

        {/* Kolom 2: Parameter Suhu & Tes Koneksi */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold font-mono text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                Parameter Temperature: {temperature}
              </label>
              <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {temperature <= 0.3 ? "Ketat / Deterministik" : temperature <= 0.7 ? "Seimbang (Standar BSKAP)" : "Kreatif"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Mengatur variasi kreativitas redaksi soal. Nilai 0.7 direkomendasikan untuk stabilitas format dan variasi konteks lokal.
            </p>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>0.0 (Presisi/Kaku)</span>
              <span>0.7 (Rekomendasi)</span>
              <span>1.0 (Sangat Variatif)</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold font-mono text-slate-900 uppercase">
              Verifikasi Kesiapan Koneksi API
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Tekan tombol di bawah untuk memverifikasi apakah kunci API yang Anda masukkan valid dan dapat menghubungi Google AI Studio secara langsung.
            </p>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs transition-colors disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              )}
              <span>{isTesting ? "Sedang Menguji Koneksi..." : "🔌 Uji Koneksi API (Ping)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tombol Simpan */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="submit"
          disabled={isSaving || isTesting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? "Menyimpan Konfigurasi..." : "💾 Simpan Pengaturan API"}</span>
        </button>
      </div>
    </form>
  );
}
