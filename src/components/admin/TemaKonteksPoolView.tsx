"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ToggleLeft,
  ToggleRight,
  Filter,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
import { TablePagination } from "@/components/ui/TablePagination";
import { TemaKonteksPoolItem } from "@/db/schema";

const ALL_JENJANG = ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"];

interface TemaKonteksPoolViewProps {
  initialThemes: TemaKonteksPoolItem[];
}

export function TemaKonteksPoolView({ initialThemes }: TemaKonteksPoolViewProps) {
  const [themes, setThemes] = useState<TemaKonteksPoolItem[]>(initialThemes);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJenjang, setFilterJenjang] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formNamaTema, setFormNamaTema] = useState("");
  const [formSubKonteksText, setFormSubKonteksText] = useState("");
  const [formJenjangCocok, setFormJenjangCocok] = useState<string[]>(ALL_JENJANG);
  const [formAktif, setFormAktif] = useState(true);

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tema-pool");
      const json = await res.json();
      if (res.ok && json.success) {
        setThemes(json.data);
      }
    } catch (err) {
      console.error("Gagal memuat tema:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setFormNamaTema("");
    setFormSubKonteksText("");
    setFormJenjangCocok(ALL_JENJANG);
    setFormAktif(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: TemaKonteksPoolItem) => {
    setModalMode("edit");
    setEditingId(item.id);
    setFormNamaTema(item.namaTema);
    setFormSubKonteksText(Array.isArray(item.subKonteks) ? item.subKonteks.join(", ") : "");
    setFormJenjangCocok(Array.isArray(item.jenjangCocok) && item.jenjangCocok.length > 0 ? item.jenjangCocok : ALL_JENJANG);
    setFormAktif(item.aktif);
    setIsModalOpen(true);
  };

  const toggleJenjangCheckbox = (jenjang: string) => {
    if (formJenjangCocok.includes(jenjang)) {
      if (formJenjangCocok.length === 1) {
        showFeedback("error", "Minimal pilih 1 jenjang yang cocok.");
        return;
      }
      setFormJenjangCocok(formJenjangCocok.filter((j) => j !== jenjang));
    } else {
      setFormJenjangCocok([...formJenjangCocok, jenjang]);
    }
  };

  const handleToggleAktif = async (item: TemaKonteksPoolItem) => {
    const nextStatus = !item.aktif;
    try {
      const res = await fetch("/api/admin/tema-pool", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, aktif: nextStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengubah status tema.");
      }
      setThemes((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, aktif: nextStatus } : t))
      );
      showFeedback("success", `Tema "${item.namaTema}" berhasil di${nextStatus ? "aktifkan" : "nonaktifkan"}.`);
    } catch (err: any) {
      showFeedback("error", err.message || "Gagal menghubungi server.");
    }
  };

  const handleDelete = async (item: TemaKonteksPoolItem) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus tema "${item.namaTema}" dari pool?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/tema-pool?id=${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menghapus tema.");
      }
      setThemes((prev) => prev.filter((t) => t.id !== item.id));
      showFeedback("success", `Tema "${item.namaTema}" berhasil dihapus dari pool.`);
    } catch (err: any) {
      showFeedback("error", err.message || "Gagal menghapus tema.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaTema.trim()) {
      showFeedback("error", "Nama tema wajib diisi.");
      return;
    }

    const subList = formSubKonteksText
      .split(/,|\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (subList.length === 0) {
      showFeedback("error", "Tuliskan minimal 1 sub-konteks (pisahkan dengan tanda koma).");
      return;
    }

    setLoading(true);
    try {
      if (modalMode === "create") {
        const res = await fetch("/api/admin/tema-pool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nama_tema: formNamaTema.trim(),
            sub_konteks: subList,
            jenjang_cocok: formJenjangCocok,
            aktif: formAktif,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Gagal menambahkan tema.");
        }
        await refreshData();
        showFeedback("success", `Tema "${formNamaTema.trim()}" berhasil ditambahkan.`);
      } else {
        const res = await fetch("/api/admin/tema-pool", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            nama_tema: formNamaTema.trim(),
            sub_konteks: subList,
            jenjang_cocok: formJenjangCocok,
            aktif: formAktif,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Gagal memperbarui tema.");
        }
        await refreshData();
        showFeedback("success", `Tema "${formNamaTema.trim()}" berhasil diperbarui.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showFeedback("error", err.message || "Terjadi kesalahan saat menyimpan tema.");
    } finally {
      setLoading(false);
    }
  };

  // Filter Data
  const filteredThemes = themes.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.namaTema.toLowerCase().includes(q);
      const matchSub = Array.isArray(t.subKonteks) && t.subKonteks.some((s) => s.toLowerCase().includes(q));
      if (!matchName && !matchSub) return false;
    }
    if (filterStatus === "aktif" && !t.aktif) return false;
    if (filterStatus === "nonaktif" && t.aktif) return false;
    if (filterJenjang !== "semua") {
      const cocokList = t.jenjangCocok || ALL_JENJANG;
      if (!cocokList.includes(filterJenjang)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredThemes.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedThemes = filteredThemes.slice(
    (validCurrentPage - 1) * pageSize,
    validCurrentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Alert Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Actions & Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold font-mono text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Pool Tema Konteks Generator AI ({themes.length} Tema)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar tema dan sub-konteks nusantara yang dipilih secara dinamis oleh AI dengan sistem penyaringan jenjang dan pengecualian 4 hari terakhir.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Segarkan
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Tambah Tema Baru
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari tema atau sub-konteks..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={filterJenjang}
              onChange={(e) => {
                setFilterJenjang(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
            >
              <option value="semua">Semua Jenjang Sasaran</option>
              <option value="SD/MI">Cocok SD/MI</option>
              <option value="SMP/MTs">Cocok SMP/MTs</option>
              <option value="SMA/MA">Cocok SMA/MA</option>
              <option value="SMK/MAK">Cocok SMK/MAK</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
            >
              <option value="semua">Semua Status (Aktif & Nonaktif)</option>
              <option value="aktif">Hanya Aktif</option>
              <option value="nonaktif">Hanya Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Tema Konteks */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {paginatedThemes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">
            Tidak ada tema konteks yang sesuai dengan kriteria pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Nama Domain / Tema</th>
                  <th className="px-4 py-3">Contoh Sub-Konteks</th>
                  <th className="px-4 py-3">Jenjang Cocok</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedThemes.map((item) => {
                  const cocokList = item.jenjangCocok || ALL_JENJANG;
                  const isSmpAboveOnly = !cocokList.includes("SD/MI");

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-sans font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          <span>{item.namaTema}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-sans max-w-md">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(item.subKonteks) &&
                            item.subKonteks.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px]"
                              >
                                {sub}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1">
                          {isSmpAboveOnly ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              SMP ke atas
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              Semua Jenjang
                            </span>
                          )}
                          <div className="flex gap-0.5">
                            {ALL_JENJANG.map((j) => (
                              <span
                                key={j}
                                className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                                  cocokList.includes(j)
                                    ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200"
                                    : "bg-slate-50 text-slate-300 line-through"
                                }`}
                              >
                                {j.split("/")[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleAktif(item)}
                          className="inline-flex items-center gap-1 focus:outline-none"
                          title={item.aktif ? "Klik untuk menonaktifkan" : "Klik untuk mengaktifkan"}
                        >
                          {item.aktif ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              Nonaktif
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Tema & Jenjang Cocok"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Tema"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-100">
          <TablePagination
            currentPage={validCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredThemes.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Modal Tambah / Edit Tema */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold font-mono text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                {modalMode === "create" ? "Tambah Tema Konteks Baru" : "Edit Tema Konteks"}
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase tracking-wider mb-1">
                  Nama Domain / Tema <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Energi Baru & Kendaraan Listrik"
                  value={formNamaTema}
                  onChange={(e) => setFormNamaTema(e.target.value)}
                  className="w-full text-xs font-sans px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase tracking-wider mb-1">
                  Contoh Sub-Konteks Spesifik (Pisahkan dengan koma) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: stasiun pengisian daya (SPKLU), efisiensi baterai motor listrik, waktu tempuh antar kota, perbandingan biaya bahan bakar"
                  value={formSubKonteksText}
                  onChange={(e) => setFormSubKonteksText(e.target.value)}
                  className="w-full text-xs font-sans px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tuliskan 3-6 contoh situasi konkret yang akan dipakai bergantian oleh AI dalam batch soal.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold font-mono text-slate-700 uppercase tracking-wider mb-1.5">
                  Jenjang Cocok (Saringan Generator) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_JENJANG.map((j) => {
                    const isChecked = formJenjangCocok.includes(j);
                    return (
                      <label
                        key={j}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-mono cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-indigo-50/70 border-indigo-300 text-indigo-900 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleJenjangCheckbox(j)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>{j}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Keluarkan SD/MI jika konsep/istilah tema ini terlalu berat untuk siswa sekolah dasar.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAktif}
                    onChange={(e) => setFormAktif(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs font-mono font-bold text-slate-700">Aktifkan untuk Generator AI</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
                  >
                    {loading ? "Menyimpan..." : modalMode === "create" ? "Simpan Tema" : "Simpan Perubahan"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
