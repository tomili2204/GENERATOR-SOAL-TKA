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
  RefreshCw,
  AlertTriangle,
  Ban,
  Plus,
  X,
} from "lucide-react";

interface AiSettingsFormProps {
  onSaved?: () => void;
}

interface ModelCatalogEntry {
  id: string;
  displayName: string;
  description: string;
  badges: string[];
}

function formatCachedAt(cachedAt: string | null): string {
  if (!cachedAt) return "belum pernah";
  try {
    return new Date(cachedAt).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return cachedAt;
  }
}

const BADGE_STYLES: Record<string, string> = {
  "Stabil": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Direkomendasikan (Terbaru)": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Pro — lebih mahal, cocok untuk eskalasi kasus sulit saja": "bg-violet-50 text-violet-700 border-violet-200",
  "Hemat Biaya — tidak disarankan untuk generate soal (constraint-following lebih lemah)": "bg-amber-50 text-amber-700 border-amber-200",
  "Preview — dapat berubah sewaktu-waktu": "bg-slate-100 text-slate-600 border-slate-300",
};

export function AiSettingsForm({ onSaved }: AiSettingsFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState("");
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [modelName, setModelName] = useState("gemini-3-flash-preview");
  const [temperature, setTemperature] = useState(0.7);
  const [customPromptPrefix, setCustomPromptPrefix] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [strictSvgMode, setStrictSvgMode] = useState(false);

  // Katalog Model Dinamis
  const [modelCatalog, setModelCatalog] = useState<ModelCatalogEntry[]>([]);
  const [catalogCachedAt, setCatalogCachedAt] = useState<string | null>(null);
  const [catalogStale, setCatalogStale] = useState(false);
  const [activeModelDeprecated, setActiveModelDeprecated] = useState(false);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");

  // Daftar Blokir Model
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [blocklistInput, setBlocklistInput] = useState("");
  const [isSavingBlocklist, setIsSavingBlocklist] = useState(false);

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
          if (typeof data.data.strictSvgMode === "boolean") setStrictSvgMode(data.data.strictSvgMode);
          if (data.data.modelCatalog) {
            setModelCatalog(data.data.modelCatalog.models || []);
            setCatalogCachedAt(data.data.modelCatalog.cachedAt || null);
            setCatalogStale(!!data.data.modelCatalog.cacheStale);
          }
          if (Array.isArray(data.data.modelBlocklist)) setBlocklist(data.data.modelBlocklist);
          setActiveModelDeprecated(!!data.data.activeModelDeprecated);
        }
      } catch (err) {
        console.error("Gagal memuat setting AI:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  async function handleRefreshModels() {
    setIsRefreshingModels(true);
    setRefreshMsg("");
    try {
      const res = await fetch("/api/admin/settings/ai/refresh-models", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success && data.data?.modelCatalog) {
        setModelCatalog(data.data.modelCatalog.models || []);
        setCatalogCachedAt(data.data.modelCatalog.cachedAt || null);
        setCatalogStale(!!data.data.modelCatalog.cacheStale);
        setActiveModelDeprecated(!!data.data.activeModelDeprecated);
        setRefreshMsg(data.message || "Katalog model diperbarui.");
      } else {
        setRefreshMsg(data.error || "Gagal memperbarui daftar model.");
      }
    } catch (err: any) {
      setRefreshMsg(`Kendala jaringan: ${err.message}`);
    } finally {
      setIsRefreshingModels(false);
      setTimeout(() => setRefreshMsg(""), 6000);
    }
  }

  async function handleAddBlocklist() {
    const entry = blocklistInput.trim();
    if (!entry || blocklist.includes(entry)) {
      setBlocklistInput("");
      return;
    }
    const next = [...blocklist, entry];
    await saveBlocklist(next);
    setBlocklistInput("");
  }

  async function handleRemoveBlocklist(entry: string) {
    const next = blocklist.filter((b) => b !== entry);
    await saveBlocklist(next);
  }

  async function saveBlocklist(next: string[]) {
    setIsSavingBlocklist(true);
    try {
      const res = await fetch("/api/admin/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocklist: next }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBlocklist(next);
        // Katalog di layar perlu disaring ulang dengan blocklist baru. Cukup baca ulang dari
        // cache server yang sudah ada (murah, tidak memanggil Google lagi kecuali cache basi).
        const refreshed = await fetch("/api/admin/settings/ai");
        const refreshedData = await refreshed.json();
        if (refreshed.ok && refreshedData.success && refreshedData.data?.modelCatalog) {
          setModelCatalog(refreshedData.data.modelCatalog.models || []);
          setCatalogCachedAt(refreshedData.data.modelCatalog.cachedAt || null);
          setCatalogStale(!!refreshedData.data.modelCatalog.cacheStale);
          setActiveModelDeprecated(!!refreshedData.data.activeModelDeprecated);
        }
      }
    } catch (err) {
      console.error("Gagal menyimpan daftar blokir model:", err);
    } finally {
      setIsSavingBlocklist(false);
    }
  }

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
          strictSvgMode,
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
            <label className="block text-xs font-bold font-mono text-slate-800 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                Pilihan Model Gemini
              </span>
              <button
                type="button"
                onClick={handleRefreshModels}
                disabled={isRefreshingModels}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 normal-case disabled:opacity-50"
                title="Panggil ulang daftar model dari Google sekarang (abaikan cache 24 jam)"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingModels ? "animate-spin" : ""}`} />
                Refresh Daftar Model Sekarang
              </button>
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Pilih varian model AI yang digunakan untuk menyusun stimulus dan butir soal TKA.
            </p>

            {activeModelDeprecated && (
              <div className="mb-2 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Model yang sedang aktif (<code className="font-mono font-bold">{modelName}</code>) sudah tidak
                  terdaftar di katalog Google terbaru — kemungkinan sudah dihentikan. Segera pilih model pengganti.
                </span>
              </div>
            )}

            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-800"
            >
              {!modelCatalog.some((m) => m.id === modelName) && (
                <option value={modelName}>{modelName} (aktif, tidak ada di katalog saat ini)</option>
              )}
              {modelCatalog.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} {m.badges.length > 0 ? `— ${m.badges.join(", ")}` : ""}
                </option>
              ))}
            </select>

            {modelCatalog.find((m) => m.id === modelName) && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {modelCatalog
                  .find((m) => m.id === modelName)!
                  .badges.map((b) => (
                    <span
                      key={b}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-medium border ${BADGE_STYLES[b] || "bg-slate-50 text-slate-600 border-slate-200"}`}
                    >
                      {b}
                    </span>
                  ))}
              </div>
            )}

            <p className="mt-1.5 text-[10px] text-slate-400 font-mono">
              Daftar diperbarui otomatis tiap 24 jam · Terakhir: {formatCachedAt(catalogCachedAt)}
              {catalogStale && <span className="text-amber-600"> (gagal memuat ulang, menampilkan data lama)</span>}
            </p>
            {refreshMsg && <p className="mt-1 text-[10px] text-indigo-600 font-sans">{refreshMsg}</p>}
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

      {/* Mode Visualisasi SVG Ketat */}
      <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <label className="text-xs font-bold font-mono text-slate-900 uppercase flex items-center gap-2">
            <span>Mode Visualisasi SVG Ketat (Strict SVG)</span>
            {strictSvgMode ? (
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                AKTIF
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-600 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-full">
                NONAKTIF (BEBAS)
              </span>
            )}
          </label>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            Jika diaktifkan, AI diwajibkan secara ketat menghasilkan diagram data (batang/lingkaran), denah geometri, model pecahan arsiran, dan infografik pada minimal 6–10 butir soal per paket. Berlaku baik untuk <strong>Trigger Manual</strong> maupun <strong>Jadwal Cron Otomatis Pagi</strong>.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={strictSvgMode}
            onClick={() => setStrictSvgMode(!strictSvgMode)}
            className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              strictSvgMode ? "bg-emerald-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                strictSvgMode ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Daftar Blokir Model (Blocklist) */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
        <div className="space-y-1">
          <h4 className="text-xs font-bold font-mono text-slate-900 uppercase flex items-center gap-2">
            <Ban className="w-3.5 h-3.5 text-rose-500" />
            Daftar Blokir Model (Blocklist)
          </h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Model/alias dengan id persis sama seperti daftar ini akan disembunyikan dari katalog di atas, mis. alias
            rolling seperti <code className="font-mono">gemini-flash-latest</code> yang riwayatnya pernah 404
            mendadak akibat diam-diam di-resolve ke model yang sudah dihentikan Google. Tambah/hapus sendiri di sini
            kapan pun tanpa perlu revisi kode.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {blocklist.length === 0 && <span className="text-[11px] text-slate-400 italic">Belum ada entri diblokir.</span>}
          {blocklist.map((entry) => (
            <span
              key={entry}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 text-[11px] font-mono"
            >
              {entry}
              <button
                type="button"
                onClick={() => handleRemoveBlocklist(entry)}
                disabled={isSavingBlocklist}
                className="hover:text-rose-900 disabled:opacity-50"
                title="Hapus dari daftar blokir"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={blocklistInput}
            onChange={(e) => setBlocklistInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddBlocklist();
              }
            }}
            placeholder="mis. gemini-pro-latest"
            className="flex-1 text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
          />
          <button
            type="button"
            onClick={handleAddBlocklist}
            disabled={isSavingBlocklist || !blocklistInput.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Blokir
          </button>
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
