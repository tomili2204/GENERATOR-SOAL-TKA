"use client";

import React, { useState, useEffect } from "react";
import { UserCheck, ShieldCheck, X, Check, Building2, AlertTriangle, UserX } from "lucide-react";

interface AssignValidatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: {
    id: string;
    code: string;
    nama: string;
    jenjang: string;
    mapel: string;
    authorId?: string | null;
    author?: { name: string; email: string } | null;
    assignedValidatorId?: string | null;
    assignedValidator?: { name: string; email: string; instansi?: string } | null;
  } | null;
  onSuccess: () => void;
}

export function AssignValidatorModal({
  isOpen,
  onClose,
  pkg,
  onSuccess,
}: AssignValidatorModalProps) {
  const [validators, setValidators] = useState<any[]>([]);
  const [selectedValidatorId, setSelectedValidatorId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen && pkg) {
      setSelectedValidatorId(pkg.assignedValidatorId || "");
      setErrorMsg("");
      setSuccessMsg("");
      fetchValidators();
    }
  }, [isOpen, pkg]);

  const fetchValidators = async () => {
    try {
      setIsFetching(true);
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.success) {
        // Filter user aktif yang memiliki peran validator_soal
        const valUsers = json.data.filter(
          (u: any) => u.isActive !== false && u.roles && u.roles.includes("validator_soal")
        );
        setValidators(valUsers);
      }
    } catch (e) {
      console.error("Error fetching validators:", e);
    } finally {
      setIsFetching(false);
    }
  };

  if (!isOpen || !pkg) return null;

  const handleAssign = async () => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const res = await fetch("/api/admin/packages/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkg.id,
          validatorId: selectedValidatorId || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal menugaskan validator.");
      }

      setSuccessMsg(json.message || "Validator berhasil ditugaskan!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Penugasan Validator Paket</h3>
              <p className="text-xs text-slate-500 font-mono">
                {pkg.code} • {pkg.jenjang} - {pkg.mapel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Paket & Aturan Pemisahan Tugas */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Nama Paket:</span>
              <span className="font-semibold text-slate-800">{pkg.nama}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Pembuat Paket (Author):</span>
              <span className="font-semibold text-violet-700">
                {pkg.author?.name || "Sistem / AI"}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Aturan Pemisahan Tugas (Separation of Duties):</span>
              <p className="mt-0.5 text-amber-800/90 leading-relaxed">
                Validator yang dipilih tidak boleh sama dengan pembuat paket. Sistem secara otomatis
                memblokir penugasan jika pengguna tersebut adalah pembuat soal dalam paket ini.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Daftar Pilihan Validator */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Pilih Validator Soal Bertanggung Jawab:
            </label>

            {isFetching ? (
              <div className="p-6 text-center text-xs text-slate-400 font-mono">
                Memuat daftar validator terdaftar...
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {/* Opsi Kosongkan / Belum Ditugaskan */}
                <label
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                    selectedValidatorId === ""
                      ? "bg-slate-100 border-slate-300 text-slate-800 font-medium"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="selectedValidator"
                      value=""
                      checked={selectedValidatorId === ""}
                      onChange={() => setSelectedValidatorId("")}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <div className="flex items-center gap-1.5">
                      <UserX className="w-3.5 h-3.5 text-slate-400" />
                      <span>Belum Ditugaskan (Antrean Umum Validator)</span>
                    </div>
                  </div>
                </label>

                {/* List Validator */}
                {validators.map((val) => {
                  const isAuthor = Boolean(pkg.authorId && pkg.authorId === val.id);
                  const isSelected = selectedValidatorId === val.id;

                  // Cek kecocokan jenjang & mapel
                  const matchJenjang =
                    !val.assignedJenjang ||
                    val.assignedJenjang.length === 0 ||
                    val.assignedJenjang.includes(pkg.jenjang);

                  const matchMapel =
                    !val.assignedMapel ||
                    val.assignedMapel.length === 0 ||
                    val.assignedMapel.includes(pkg.mapel);

                  const isMatchedScope = matchJenjang && matchMapel;

                  return (
                    <label
                      key={val.id}
                      className={`flex flex-col p-3 rounded-xl border text-xs transition-colors ${
                        isAuthor
                          ? "bg-rose-50/50 border-rose-200 opacity-60 cursor-not-allowed"
                          : isSelected
                          ? "bg-emerald-50 border-emerald-400 shadow-xs cursor-pointer"
                          : "bg-white border-slate-200 hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="selectedValidator"
                            value={val.id}
                            disabled={isAuthor}
                            checked={isSelected}
                            onChange={() => setSelectedValidatorId(val.id)}
                            className="mt-0.5 text-emerald-600 focus:ring-emerald-500 disabled:opacity-30"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{val.name}</span>
                              {isMatchedScope && !isAuthor && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-medium">
                                  Cocok Jenjang & Mapel
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono block">
                              {val.email}
                            </span>
                            {val.instansi && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 mt-0.5">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {val.instansi}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status Label */}
                        <div>
                          {isAuthor ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-semibold">
                              ⛔ Pembuat Paket
                            </span>
                          ) : isSelected ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900 text-[10px] font-bold">
                              ✓ Dipilih
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Info Jenjang & Mapel yang di-assign ke validator */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400">Keahlian:</span>
                        {val.assignedJenjang?.map((j: string) => (
                          <span
                            key={j}
                            className="px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-mono"
                          >
                            {j}
                          </span>
                        ))}
                        {val.assignedMapel?.map((m: string) => (
                          <span
                            key={m}
                            className="px-1 py-0.2 rounded bg-indigo-50 text-indigo-600 font-medium"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan Penugasan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
