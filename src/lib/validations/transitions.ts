/**
 * Penegakan Mesin Status (State Machine) Transisi Soal:
 * Aturan resmi transisi status_validasi di backend:
 * 1. draft -> menunggu_validasi (otomatis saat soal disimpan/dikirim ulang)
 * 2. menunggu_validasi -> disetujui (aksi validator)
 * 3. menunggu_validasi -> ditolak (aksi validator, wajib disertai alasan)
 * 4. menunggu_validasi -> direvisi (aksi validator, wajib disertai catatan perbaikan)
 * 5. direvisi -> menunggu_validasi (otomatis saat pembuat soal mengirim ulang perbaikannya)
 */

import { QuestionStatusType } from "@/db/schema";

export interface TransitionCheckResult {
  valid: boolean;
  error?: string;
}

// Peta transisi status yang sah
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["menunggu_validasi"],
  menunggu_validasi: ["disetujui", "ditolak", "direvisi", "perlu_revisi"],
  direvisi: ["menunggu_validasi"],
  perlu_revisi: ["menunggu_validasi"],
  disetujui: [], // Gerbang terakhir siap tayang, tidak boleh berubah sepihak
  ditolak: [], // Ditolak final
};

export function assertValidStatusTransition(
  currentStatus: string,
  targetStatus: string,
  notes?: string | null
): TransitionCheckResult {
  // Normalisasi status
  const current = currentStatus.trim();
  const target = targetStatus.trim();

  // 1. Cek apakah status awal terdaftar
  const allowedTargets = ALLOWED_TRANSITIONS[current];
  if (!allowedTargets) {
    return {
      valid: false,
      error: `Status saat ini ("${current}") tidak valid dalam sistem.`,
    };
  }

  // 2. Cek apakah transisi dari status awal ke status tujuan diizinkan
  if (!allowedTargets.includes(target)) {
    return {
      valid: false,
      error: `Transisi status tidak valid: Tidak dapat mengubah status dari "${current}" menjadi "${target}". Alur resmi yang diizinkan dari "${current}": [${allowedTargets.join(", ") || "tidak ada transisi lebih lanjut"}].`,
    };
  }

  // 3. Aturan Tambahan: Aksi ditolak WAJIB disertai alasan
  if (target === "ditolak") {
    if (!notes || notes.trim().length === 0) {
      return {
        valid: false,
        error: "Penolakan butir soal (status: ditolak) wajib disertai alasan penolakan yang jelas.",
      };
    }
  }

  // 4. Aturan Tambahan: Aksi direvisi WAJIB disertai catatan perbaikan
  if (target === "direvisi" || target === "perlu_revisi") {
    if (!notes || notes.trim().length === 0) {
      return {
        valid: false,
        error: "Permintaan revisi butir soal (status: direvisi) wajib disertai catatan perbaikan teknis untuk pembuat soal.",
      };
    }
  }

  return { valid: true };
}
