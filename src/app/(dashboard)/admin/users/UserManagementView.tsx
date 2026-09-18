"use client";

import React, { useState, useMemo } from "react";
import { UserRoleType } from "@/db/schema";
import { RoleBadge } from "@/components/ui/Badge";
import { TablePagination } from "@/components/ui/TablePagination";
import {
  Users,
  UserPlus,
  Search,
  Building2,
  GraduationCap,
  BookOpen,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  Shield,
  Check,
  RefreshCw,
} from "lucide-react";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  instansi?: string | null;
  isActive: boolean;
  assignedJenjang?: string[];
  assignedMapel?: string[];
  roles: UserRoleType[];
  createdAt: string;
}

interface UserManagementViewProps {
  initialUsers: UserItem[];
}

const ALL_JENJANG = ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"];
const ALL_MAPEL = ["Matematika", "Bahasa Indonesia"];

export function UserManagementView({ initialUsers }: UserManagementViewProps) {
  const [userList, setUserList] = useState<UserItem[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [jenjangFilter, setJenjangFilter] = useState("all");
  const [mapelFilter, setMapelFilter] = useState("all");

  // Paging state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formInstansi, setFormInstansi] = useState("");
  const [formRoles, setFormRoles] = useState<UserRoleType[]>(["pembuat_soal"]);
  const [formJenjang, setFormJenjang] = useState<string[]>(["SD/MI"]);
  const [formMapel, setFormMapel] = useState<string[]>(["Matematika"]);
  const [formIsActive, setFormIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const refreshUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.success) {
        setUserList(json.data);
      }
    } catch (e) {
      console.error("Error refreshing users:", e);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormInstansi("");
    setFormRoles(["pembuat_soal"]);
    setFormJenjang(["SD/MI"]);
    setFormMapel(["Matematika"]);
    setFormIsActive(true);
    setErrorMsg("");
    setSuccessMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserItem) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword(""); // Kosongkan jika tidak ingin ganti kata sandi
    setFormInstansi(u.instansi || "");
    setFormRoles(u.roles.length > 0 ? u.roles : ["pembuat_soal"]);
    setFormJenjang(Array.isArray(u.assignedJenjang) && u.assignedJenjang.length > 0 ? u.assignedJenjang : []);
    setFormMapel(Array.isArray(u.assignedMapel) && u.assignedMapel.length > 0 ? u.assignedMapel : []);
    setFormIsActive(u.isActive);
    setErrorMsg("");
    setSuccessMsg("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleRoleToggle = (role: UserRoleType) => {
    if (formRoles.includes(role)) {
      if (formRoles.length > 1) {
        setFormRoles(formRoles.filter((r) => r !== role));
      }
    } else {
      setFormRoles([...formRoles, role]);
    }
  };

  const setRoleBoth = () => {
    const roles: UserRoleType[] = ["pembuat_soal", "validator_soal"];
    if (formRoles.includes("admin")) {
      roles.push("admin");
    }
    setFormRoles(roles);
  };

  const handleJenjangToggle = (j: string) => {
    if (formJenjang.includes(j)) {
      setFormJenjang(formJenjang.filter((item) => item !== j));
    } else {
      setFormJenjang([...formJenjang, j]);
    }
  };

  const handleMapelToggle = (m: string) => {
    if (formMapel.includes(m)) {
      setFormMapel(formMapel.filter((item) => item !== m));
    } else {
      setFormMapel([...formMapel, m]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!formName.trim()) {
      setErrorMsg("Nama lengkap pengguna wajib diisi");
      return;
    }

    if (!formEmail.trim()) {
      setErrorMsg("Email pengguna wajib diisi");
      return;
    }

    if (!editingUser && (!formPassword || formPassword.length < 6)) {
      setErrorMsg("Kata sandi akun baru minimal 6 karakter");
      return;
    }

    if (formRoles.length === 0) {
      setErrorMsg("Pilih minimal 1 peran");
      return;
    }

    setIsLoading(true);

    try {
      if (editingUser) {
        // UPDATE USER
        const payload: any = {
          name: formName.trim(),
          email: formEmail.trim(),
          instansi: formInstansi.trim(),
          roles: formRoles,
          assignedJenjang: formJenjang,
          assignedMapel: formMapel,
          isActive: formIsActive,
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }

        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Gagal memperbarui pengguna");
        }

        setSuccessMsg("Data pengguna berhasil diperbarui!");
        await refreshUsers();
        setTimeout(() => closeModal(), 1000);
      } else {
        // CREATE USER
        const payload = {
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword.trim(),
          instansi: formInstansi.trim(),
          roles: formRoles,
          assignedJenjang: formJenjang,
          assignedMapel: formMapel,
          isActive: formIsActive,
        };

        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Gagal menambahkan pengguna");
        }

        setSuccessMsg("Pengguna baru berhasil ditambahkan!");
        await refreshUsers();
        setTimeout(() => closeModal(), 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle active status directly
  const handleToggleActive = async (u: UserItem) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        setUserList((prev) =>
          prev.map((item) => (item.id === u.id ? { ...item, isActive: !item.isActive } : item))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return userList.filter((u) => {
      const matchSearch =
        searchTerm.trim() === "" ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.instansi && u.instansi.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchRole = true;
      if (roleFilter === "keduanya") {
        matchRole = u.roles.includes("pembuat_soal") && u.roles.includes("validator_soal");
      } else if (roleFilter !== "all") {
        matchRole = u.roles.includes(roleFilter as UserRoleType);
      }

      let matchJenjang = true;
      if (jenjangFilter !== "all") {
        matchJenjang = Boolean(u.assignedJenjang && u.assignedJenjang.includes(jenjangFilter));
      }

      let matchMapel = true;
      if (mapelFilter !== "all") {
        matchMapel = Boolean(u.assignedMapel && u.assignedMapel.includes(mapelFilter));
      }

      return matchSearch && matchRole && matchJenjang && matchMapel;
    });
  }, [userList, searchTerm, roleFilter, jenjangFilter, mapelFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, validCurrentPage, pageSize]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = userList.length;
    const pembuatCount = userList.filter((u) => u.roles.includes("pembuat_soal")).length;
    const validatorCount = userList.filter((u) => u.roles.includes("validator_soal")).length;
    const keduanyaCount = userList.filter(
      (u) => u.roles.includes("pembuat_soal") && u.roles.includes("validator_soal")
    ).length;
    return { total, pembuatCount, validatorCount, keduanyaCount };
  }, [userList]);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-slate-500 font-semibold">Total Pengguna</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Akun terdaftar di sistem</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-violet-600 font-semibold">Pembuat Soal</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.pembuatCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Penulis konten & stimulus</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-emerald-600 font-semibold">Validator Soal</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.validatorCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Penelaah kelayakan & mutu</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase text-amber-600 font-semibold">Multi-Peran (Keduanya)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.keduanyaCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Pembuat & Validator aktif</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header & Controls */}
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
                Daftar Pengguna & Penetapan Peran
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola hak akses, asal instansi, penugasan jenjang (SD/SMP/SMA/SMK) & mapel (Matematika/B. Indonesia)
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={refreshUsers}
                title="Muat Ulang Data"
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pengguna</span>
              </button>
            </div>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama, email, instansi..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Peran */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Peran</option>
                <option value="pembuat_soal">Pembuat Soal</option>
                <option value="validator_soal">Validator Soal</option>
                <option value="keduanya">Keduanya (Pembuat & Validator)</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {/* Filter Jenjang */}
            <div className="relative">
              <select
                value={jenjangFilter}
                onChange={(e) => {
                  setJenjangFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Penugasan Jenjang</option>
                <option value="SD/MI">SD/MI</option>
                <option value="SMP/MTs">SMP/MTs</option>
                <option value="SMA/MA">SMA/MA</option>
                <option value="SMK/MAK">SMK/MAK</option>
              </select>
            </div>

            {/* Filter Mapel */}
            <div className="relative">
              <select
                value={mapelFilter}
                onChange={(e) => {
                  setMapelFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-700 cursor-pointer"
              >
                <option value="all">Semua Penugasan Mapel</option>
                <option value="Matematika">Matematika</option>
                <option value="Bahasa Indonesia">Bahasa Indonesia</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Data */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Nama & Email</th>
                <th className="px-4 py-3">Asal Instansi / Sekolah</th>
                <th className="px-4 py-3">Peran Akses</th>
                <th className="px-4 py-3">Penugasan Jenjang & Mapel</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-sans text-xs">
                    Tidak ada pengguna yang memenuhi kriteria filter.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const hasBoth =
                    u.roles.includes("pembuat_soal") && u.roles.includes("validator_soal");

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nama & Email */}
                      <td className="px-4 py-3 font-sans">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                      </td>

                      {/* Asal Instansi */}
                      <td className="px-4 py-3 font-sans">
                        {u.instansi ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-800 text-xs font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {u.instansi}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Belum diisi</span>
                        )}
                      </td>

                      {/* Peran */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {hasBoth && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-700 border-amber-200">
                              ★ Keduanya
                            </span>
                          )}
                          {u.roles.map((r) => (
                            <RoleBadge key={r} role={r} />
                          ))}
                        </div>
                      </td>

                      {/* Penugasan Jenjang & Mapel */}
                      <td className="px-4 py-3 font-sans">
                        <div className="space-y-1">
                          {/* Jenjang */}
                          <div className="flex flex-wrap gap-1">
                            {u.assignedJenjang && u.assignedJenjang.length > 0 ? (
                              u.assignedJenjang.map((j) => (
                                <span
                                  key={j}
                                  className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-medium"
                                >
                                  {j}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Semua Jenjang</span>
                            )}
                          </div>
                          {/* Mapel */}
                          <div className="flex flex-wrap gap-1">
                            {u.assignedMapel && u.assignedMapel.length > 0 ? (
                              u.assignedMapel.map((m) => (
                                <span
                                  key={m}
                                  className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium"
                                >
                                  {m}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Semua Mapel</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(u)}
                          title="Klik untuk mengubah status aktif"
                          className="cursor-pointer"
                        >
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors">
                              <CheckCircle2 className="w-3 h-3" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 hover:bg-rose-100 transition-colors">
                              <XCircle className="w-3 h-3" />
                              Nonaktif
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer with 10, 20, 30, 50, 100 options */}
        <TablePagination
          currentPage={validCurrentPage}
          totalPages={totalPages}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 30, 50, 100]}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* MODAL TAMBAH / EDIT PENGGUNA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  {editingUser ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingUser ? "Edit Profil & Peran Pengguna" : "Tambah Pengguna Baru"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingUser ? `ID: ${editingUser.id}` : "Pendaftaran tim internal AyoTKA"}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Pratama, S.Pd."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="nama@ayotka.id atau email instansi"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                />
              </div>

              {/* Kata Sandi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi {editingUser ? "(Kosongkan jika tidak diubah)" : <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? "Biarkan kosong untuk mempertahankan" : "Minimal 6 karakter"}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                />
              </div>

              {/* Asal Instansi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Asal Instansi / Asal Sekolah / Lembaga</span>
                  <span className="text-[10px] font-normal text-slate-400">Direkomendasikan</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Contoh: SDN Menteng 01 Jakarta / UNJ / Puskurjar"
                    value={formInstansi}
                    onChange={(e) => setFormInstansi(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Pilihan Peran Pengguna */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Peran Pengguna (Multi-Peran) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={setRoleBoth}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                  >
                    Set Keduanya (Pembuat & Validator)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Pembuat Soal */}
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formRoles.includes("pembuat_soal")
                        ? "bg-violet-50 border-violet-300 text-violet-900 font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formRoles.includes("pembuat_soal")}
                      onChange={() => handleRoleToggle("pembuat_soal")}
                      className="rounded text-violet-600 focus:ring-violet-500"
                    />
                    <span>Pembuat Soal</span>
                  </label>

                  {/* Validator Soal */}
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formRoles.includes("validator_soal")
                        ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formRoles.includes("validator_soal")}
                      onChange={() => handleRoleToggle("validator_soal")}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Validator Soal</span>
                  </label>

                  {/* Administrator */}
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      formRoles.includes("admin")
                        ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formRoles.includes("admin")}
                      onChange={() => handleRoleToggle("admin")}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Admin</span>
                  </label>
                </div>
              </div>

              {/* Penugasan Jenjang */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Penugasan Jenjang (Dapat memilih lebih dari satu)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_JENJANG.map((j) => {
                    const isChecked = formJenjang.includes(j);
                    return (
                      <label
                        key={j}
                        className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-blue-50 border-blue-300 text-blue-900 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleJenjangToggle(j)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-mono">{j}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Penugasan Mata Pelajaran */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Penugasan Mata Pelajaran
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_MAPEL.map((m) => {
                    const isChecked = formMapel.includes(m);
                    return (
                      <label
                        key={m}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-purple-50 border-purple-300 text-purple-900 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleMapelToggle(m)}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span>{m}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status Aktif */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700">Status Akun Aktif</span>
                  <p className="text-[11px] text-slate-500">
                    Akun non-aktif tidak akan dapat masuk ke sistem AyoTKA
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Tombol Action */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingUser ? "Simpan Perubahan" : "Tambahkan Pengguna"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
