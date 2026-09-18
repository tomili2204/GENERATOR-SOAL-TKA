"use client";

import React, { useState, useEffect } from "react";
import { Plus, BookOpen, Check, AlertCircle, RefreshCw } from "lucide-react";
import { LatexPreview } from "@/components/ui/LatexPreview";

export interface StimulusItem {
  id: string;
  jenjang: string;
  mapel: string;
  tipe: "teks" | "data";
  judul: string;
  konten: string;
  jumlahKata?: number;
}

interface StimulusSelectorProps {
  jenjang: string;
  mapel: string;
  selectedStimulusId: string | null;
  onSelectStimulus: (stimulus: StimulusItem | null) => void;
}

export const StimulusSelector: React.FC<StimulusSelectorProps> = ({
  jenjang,
  mapel,
  selectedStimulusId,
  onSelectStimulus,
}) => {
  const [stimulusList, setStimulusList] = useState<StimulusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // State pembuatan stimulus baru
  const [newJudul, setNewJudul] = useState("");
  const [newTipe, setNewTipe] = useState<"teks" | "data">("teks");
  const [newKonten, setNewKonten] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchStimuli = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (jenjang) query.append("jenjang", jenjang);
      if (mapel) query.append("mapel", mapel);

      const res = await fetch(`/api/stimulus?${query.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setStimulusList(json.data);
      }
    } catch (e) {
      console.error("Gagal memuat daftar stimulus:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStimuli();
  }, [jenjang, mapel]);

  const selectedStimulus = stimulusList.find((s) => s.id === selectedStimulusId);

  const handleCreateStimulus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKonten.trim()) {
      setCreateError("Konten stimulus bacaan/data tidak boleh kosong.");
      return;
    }

    setSubmitting(true);
    setCreateError("");

    try {
      const res = await fetch("/api/stimulus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenjang,
          mapel,
          tipe: newTipe,
          judul: newJudul.trim() || `Stimulus ${newTipe === "teks" ? "Bacaan" : "Tabel Data"}`,
          konten: newKonten.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal membuat stimulus.");
      }

      // Berhasil
      const created: StimulusItem = json.data;
      setStimulusList((prev) => [created, ...prev]);
      onSelectStimulus(created);
      setShowCreateModal(false);
      setNewJudul("");
      setNewKonten("");
    } catch (err: any) {
      setCreateError(err.message || "Terjadi kesalahan saat menyimpan stimulus.");
    } finally {
      setSubmitting(false);
    }
  };

  const wordCount = newKonten.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-4 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-700" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-900">
            Penetapan Stimulus Soal Grup
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 px-2.5 py-1 rounded shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Buat Stimulus Baru
        </button>
      </div>

      <p className="text-xs text-amber-800/80 mb-3">
        Soal bertipe grup wajib dihubungkan ke salah satu objek stimulus (bacaan teks atau sajian data).
      </p>

      {/* Dropdown Pemilih Stimulus */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
        <div className="sm:col-span-10">
          <select
            value={selectedStimulusId || ""}
            onChange={(e) => {
              const val = e.target.value;
              const found = stimulusList.find((s) => s.id === val);
              onSelectStimulus(found || null);
            }}
            className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">-- Pilih Stimulus yang Tersedia ({jenjang || "Semua"} - {mapel || "Semua"}) --</option>
            {stimulusList.map((st) => (
              <option key={st.id} value={st.id}>
                [{st.tipe.toUpperCase()}] {st.judul} ({st.jumlahKata || 0} kata) - ID: {st.id}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={fetchStimuli}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 py-2 px-2.5 rounded"
            title="Muat ulang daftar stimulus"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Pratinjau Stimulus Terpilih */}
      {selectedStimulus && (
        <div className="mt-3 bg-white border border-amber-300/70 rounded p-3 text-xs shadow-2xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {selectedStimulus.judul}
            </span>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Tipe: {selectedStimulus.tipe} | {selectedStimulus.jumlahKata || 0} kata
            </span>
          </div>
          <div className="max-h-36 overflow-y-auto pr-1">
            <LatexPreview content={selectedStimulus.konten} />
          </div>
        </div>
      )}

      {/* Modal / Dialog Pembuatan Stimulus Baru */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Tambah Objek Stimulus Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateStimulus} className="p-5 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Judul / Rujukan Stimulus
                  </label>
                  <input
                    type="text"
                    value={newJudul}
                    onChange={(e) => setNewJudul(e.target.value)}
                    placeholder="Contoh: Bacaan Ekosistem Hutan Mangrove"
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tipe Stimulus
                  </label>
                  <select
                    value={newTipe}
                    onChange={(e) => setNewTipe(e.target.value as any)}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="teks">Teks Bacaan (Cerita, Artikel, Deskriptif)</option>
                    <option value="data">Data / Tabel / Diagram Deskriptif</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Isi Konten Stimulus (Mendukung Markdown & Tabel)
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    Jumlah kata: <strong>{wordCount}</strong>
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={newKonten}
                  onChange={(e) => setNewKonten(e.target.value)}
                  placeholder="Tuliskan teks bacaan lengkap atau struktur tabel Markdown di sini..."
                  className="w-full font-mono text-xs border border-slate-300 rounded p-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Real-time Preview Konten Baru */}
              {newKonten && (
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Pratinjau Stimulus:
                  </span>
                  <div className="max-h-32 overflow-y-auto">
                    <LatexPreview content={newKonten} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newKonten.trim()}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded shadow-xs"
                >
                  {submitting ? "Menyimpan..." : "Simpan & Pilih Stimulus"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
