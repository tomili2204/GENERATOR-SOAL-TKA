"use client";

import React, { useState, useMemo } from "react";
import {
  Bookmark,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Layers,
  BookOpen,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import { FixedTaxonomy } from "@/db/schema";
import { TablePagination } from "@/components/ui/TablePagination";

interface TaxonomyManagementViewProps {
  initialTaxonomies: FixedTaxonomy[];
}

export function TaxonomyManagementView({ initialTaxonomies }: TaxonomyManagementViewProps) {
  const [taxonomies, setTaxonomies] = useState<FixedTaxonomy[]>(initialTaxonomies);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJenjang, setFilterJenjang] = useState("semua");
  const [filterMapel, setFilterMapel] = useState("semua");
  const [filterCategory, setFilterCategory] = useState("semua");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<FixedTaxonomy | null>(null);

  // Form State
  const [formCategory, setFormCategory] = useState<string>("elemen");
  const [formJenjang, setFormJenjang] = useState<string>("SD/MI");
  const [formMapel, setFormMapel] = useState<string>("Matematika");
  const [formCode, setFormCode] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [formSortOrder, setFormSortOrder] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Action feedback
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Pagination states
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset feedback after 4 seconds
  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingItem(null);
    setFormCategory("elemen");
    setFormJenjang("SD/MI");
    setFormMapel("Matematika");
    setFormCode("");
    setFormName("");
    setFormDesc("");
    setFormSortOrder(taxonomies.length + 1);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: FixedTaxonomy) => {
    setModalMode("edit");
    setEditingItem(item);
    setFormCategory(item.category);
    setFormJenjang(item.jenjang);
    setFormMapel(item.mapel);
    setFormCode(item.code);
    setFormName(item.name);
    setFormDesc(item.description || "");
    setFormSortOrder(item.sortOrder);
    const meta = (item.metadata as any) || {};
    setFormIsActive(meta.isActive !== false);
    setIsModalOpen(true);
  };

  // Submit Create / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modalMode === "create") {
        const res = await fetch("/api/admin/taxonomy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: formCategory,
            jenjang: formJenjang,
            mapel: formMapel,
            code: formCode,
            name: formName,
            description: formDesc,
            sortOrder: formSortOrder,
            isActive: formIsActive,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Gagal menambahkan nilai tetap.");
        }

        const newItem: FixedTaxonomy = {
          id: json.data.id,
          jenjang: json.data.jenjang,
          mapel: json.data.mapel,
          category: json.data.category,
          code: json.data.code,
          name: json.data.name,
          description: formDesc || null,
          metadata: { isActive: formIsActive },
          sortOrder: formSortOrder,
          createdAt: new Date(),
        };

        setTaxonomies((prev) => [newItem, ...prev]);
        showFeedback("success", `Nilai tetap "${formName}" berhasil ditambahkan.`);
        setIsModalOpen(false);
      } else if (modalMode === "edit" && editingItem) {
        const res = await fetch("/api/admin/taxonomy", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingItem.id,
            category: formCategory,
            jenjang: formJenjang,
            mapel: formMapel,
            code: formCode,
            name: formName,
            description: formDesc,
            sortOrder: formSortOrder,
            isActive: formIsActive,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Gagal memperbarui nilai tetap.");
        }

        setTaxonomies((prev) =>
          prev.map((t) =>
            t.id === editingItem.id
              ? {
                  ...t,
                  category: formCategory,
                  jenjang: formJenjang as any,
                  mapel: formMapel,
                  code: formCode,
                  name: formName,
                  description: formDesc || null,
                  sortOrder: formSortOrder,
                  metadata: { ...(t.metadata as any), isActive: formIsActive },
                }
              : t
          )
        );
        showFeedback("success", `Nilai tetap "${formName}" berhasil diperbarui.`);
        setIsModalOpen(false);
      }
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Active/Inactive directly from table
  const handleToggleActive = async (item: FixedTaxonomy) => {
    const currentMeta = (item.metadata as any) || {};
    const newStatus = currentMeta.isActive === false ? true : false;

    try {
      const res = await fetch("/api/admin/taxonomy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          isActive: newStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal mengubah status.");
      }

      setTaxonomies((prev) =>
        prev.map((t) =>
          t.id === item.id ? { ...t, metadata: { ...(t.metadata as any), isActive: newStatus } } : t
        )
      );
      showFeedback("success", `Status "${item.name}" diubah menjadi ${newStatus ? "Aktif" : "Nonaktif"}.`);
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Delete taxonomy
  const handleDelete = async (item: FixedTaxonomy) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus nilai tetap "${item.name}" (${item.code})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/taxonomy?id=${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menghapus nilai tetap.");
      }

      setTaxonomies((prev) => prev.filter((t) => t.id !== item.id));
      showFeedback("success", `Nilai tetap "${item.name}" berhasil dihapus.`);
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Unique mapel list for filter & form
  const uniqueMapels = useMemo(() => {
    const set = new Set<string>(["Matematika", "Bahasa Indonesia"]);
    taxonomies.forEach((t) => {
      if (t.mapel) set.add(t.mapel);
      if (t.category === "mapel" && t.name) set.add(t.name);
    });
    return Array.from(set).sort();
  }, [taxonomies]);

  // Filtering
  const filteredTaxonomies = useMemo(() => {
    return taxonomies.filter((t) => {
      if (filterJenjang !== "semua" && t.jenjang !== filterJenjang) return false;
      if (filterMapel !== "semua" && t.mapel !== filterMapel) return false;
      if (filterCategory !== "semua" && t.category !== filterCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.name?.toLowerCase().includes(q);
        const matchCode = t.code?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDesc) return false;
      }

      return true;
    });
  }, [taxonomies, filterJenjang, filterMapel, filterCategory, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTaxonomies.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedList = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredTaxonomies.slice(start, start + pageSize);
  }, [filteredTaxonomies, validCurrentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-2xs transition-all ${
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

      {/* Filter & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Bookmark className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-800">
                Manajemen Nilai Tetap & Taksonomi Dinamis
              </h3>
              <p className="text-[11px] text-slate-500">
                Tambah mapel atau elemen baru tanpa perlu ubah kode program.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Nilai Tetap Baru</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Pencarian</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari kode, nama elemen..."
                className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg pl-8 pr-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Kategori</label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="semua">Semua Kategori</option>
              <option value="elemen">Elemen Kompetensi</option>
              <option value="mapel">Mata Pelajaran</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Jenjang</label>
            <select
              value={filterJenjang}
              onChange={(e) => {
                setFilterJenjang(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="semua">Semua Jenjang</option>
              <option value="SD/MI">SD / MI</option>
              <option value="SMP/MTs">SMP / MTs</option>
              <option value="SMA/MA">SMA / MA</option>
              <option value="SMK/MAK">SMK / MAK</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Mata Pelajaran</label>
            <select
              value={filterMapel}
              onChange={(e) => {
                setFilterMapel(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="semua">Semua Mata Pelajaran</option>
              {uniqueMapels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Data Nilai Tetap */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-700">
            Daftar Nilai Tetap Terdaftar ({filteredTaxonomies.length})
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Standar Kurikulum Asesmen
          </span>
        </div>

        {filteredTaxonomies.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-1">
            <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Tidak ada nilai tetap yang cocok.</p>
            <p className="text-slate-400">Silakan tambahkan baru atau ubah kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Jenjang</th>
                  <th className="px-4 py-3">Mata Pelajaran</th>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Nama / Elemen</th>
                  <th className="px-4 py-3">Deskripsi</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedList.map((t) => {
                  const meta = (t.metadata as any) || {};
                  const isActive = meta.isActive !== false;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10.5px] font-bold uppercase ${
                            t.category === "mapel"
                              ? "bg-violet-50 text-violet-700 border border-violet-200"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          {t.category === "mapel" ? "Mata Pelajaran" : "Elemen"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{t.jenjang}</td>
                      <td className="px-4 py-3 text-slate-700">{t.mapel}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[10.5px]">
                          {t.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-sans font-bold text-slate-900">{t.name}</td>
                      <td className="px-4 py-3 font-sans text-slate-600 max-w-xs truncate text-[11.5px]">
                        {t.description || "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(t)}
                          title="Klik untuk mengubah status aktif/nonaktif"
                          className="inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                        >
                          {isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Aktif
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10.5px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Nonaktif
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            title="Edit Nilai Tetap"
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            title="Hapus Nilai Tetap"
                            className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
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

        {/* Paginasi */}
        {filteredTaxonomies.length > 0 && (
          <TablePagination
            currentPage={validCurrentPage}
            totalPages={totalPages}
            totalItems={filteredTaxonomies.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30, 50, 100]}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Modal Dialog Tambah / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {modalMode === "create" ? "Tambah Nilai Tetap Baru" : "Edit Nilai Tetap"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Kategori */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Nilai Tetap <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormCategory("elemen")}
                    className={`p-2.5 text-xs font-semibold rounded-lg border text-center cursor-pointer transition-all ${
                      formCategory === "elemen"
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Elemen Kompetensi
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormCategory("mapel")}
                    className={`p-2.5 text-xs font-semibold rounded-lg border text-center cursor-pointer transition-all ${
                      formCategory === "mapel"
                        ? "bg-violet-50 border-violet-300 text-violet-700 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Mata Pelajaran (Mapel)
                  </button>
                </div>
              </div>

              {/* Jenjang */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenjang Sasaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formJenjang}
                    onChange={(e) => setFormJenjang(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="SD/MI">SD / MI</option>
                    <option value="SMP/MTs">SMP / MTs</option>
                    <option value="SMA/MA">SMA / MA</option>
                    <option value="SMK/MAK">SMK / MAK</option>
                  </select>
                </div>

                {/* Mapel */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  {formCategory === "mapel" ? (
                    <input
                      type="text"
                      value={formMapel}
                      onChange={(e) => setFormMapel(e.target.value)}
                      placeholder="Misal: IPA / Bahasa Inggris"
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                      required
                    />
                  ) : (
                    <select
                      value={formMapel}
                      onChange={(e) => setFormMapel(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {uniqueMapels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Kode & Nama */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Singkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Misal: BIL / GEO"
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono uppercase font-bold"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama / Label Resmi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={
                      formCategory === "elemen"
                        ? "Misal: Bilangan dan Operasi"
                        : "Misal: Ilmu Pengetahuan Alam"
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi / Catatan Kurikulum (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Keterangan cakupan materi atau indikator..."
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Urutan & Status Aktif */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Urutan Tampil (Sort)
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Status Aktif Digunakan</span>
                  </label>
                </div>
              </div>

              {/* Tombol Aksi */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalMode === "create" ? "Simpan Nilai Tetap" : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
