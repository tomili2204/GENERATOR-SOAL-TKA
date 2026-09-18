import { BentukSoalType, TingkatKesulitanType, PaketSoalStatusType, JenjangType } from "@/db/schema";

export interface SlotBlueprint {
  nomorUrut: number; // 1 s.d. 30
  bentukSoal: BentukSoalType;
  tingkatKesulitan: TingkatKesulitanType;
  levelKognitif: string;
  rekomendasiJenisSoal: "tunggal" | "grup";
  deskripsi: string;
}

// Cetak Biru Standar 30 Slot untuk Tryout TKA AyoTKA
// 15 PG, 8 PGK_MCMA, 7 PGK_KATEGORI
// Distribusi Kesulitan: 6 Rendah (20%), 18 Sedang (60%), 6 Tinggi (20%)
export function getStandard30SlotBlueprint(mapel: string): SlotBlueprint[] {
  const isMatematika = mapel.toLowerCase().includes("matematika");

  const kognitifRendah = isMatematika ? "Pengetahuan dan Pemahaman" : "Pemahaman Tekstual";
  const kognitifSedang = isMatematika ? "Aplikasi" : "Pemahaman Inferensial";
  const kognitifTinggi = isMatematika ? "Penalaran" : "Evaluasi dan Apresiasi";

  const slots: SlotBlueprint[] = [];

  // Slot 1 s.d. 15: Pilihan Ganda Tunggal (PG)
  for (let i = 1; i <= 15; i++) {
    let kesulitan: TingkatKesulitanType = "sedang";
    let kognitif = kognitifSedang;

    if (i <= 4) {
      kesulitan = "rendah";
      kognitif = kognitifRendah;
    } else if (i >= 13) {
      kesulitan = "tinggi";
      kognitif = kognitifTinggi;
    }

    slots.push({
      nomorUrut: i,
      bentukSoal: "PG",
      tingkatKesulitan: kesulitan,
      levelKognitif: kognitif,
      rekomendasiJenisSoal: i >= 5 && i <= 8 ? "grup" : "tunggal",
      deskripsi: `Soal Pilihan Ganda (${kesulitan.toUpperCase()})`,
    });
  }

  // Slot 16 s.d. 23: Pilihan Ganda Kompleks Multi-Jawaban (PGK_MCMA)
  for (let i = 16; i <= 23; i++) {
    let kesulitan: TingkatKesulitanType = "sedang";
    let kognitif = kognitifSedang;

    if (i <= 17) {
      kesulitan = "rendah";
      kognitif = kognitifRendah;
    } else if (i >= 22) {
      kesulitan = "tinggi";
      kognitif = kognitifTinggi;
    }

    slots.push({
      nomorUrut: i,
      bentukSoal: "PGK_MCMA",
      tingkatKesulitan: kesulitan,
      levelKognitif: kognitif,
      rekomendasiJenisSoal: i >= 18 && i <= 21 ? "grup" : "tunggal",
      deskripsi: `Pilihan Ganda Kompleks MCMA (${kesulitan.toUpperCase()})`,
    });
  }

  // Slot 24 s.d. 30: Pilihan Ganda Kompleks Kategori Matriks (PGK_KATEGORI)
  for (let i = 24; i <= 30; i++) {
    let kesulitan: TingkatKesulitanType = "sedang";
    let kognitif = kognitifSedang;

    if (i >= 29) {
      kesulitan = "tinggi";
      kognitif = kognitifTinggi;
    }

    slots.push({
      nomorUrut: i,
      bentukSoal: "PGK_KATEGORI",
      tingkatKesulitan: kesulitan,
      levelKognitif: kognitif,
      rekomendasiJenisSoal: "grup",
      deskripsi: `Matriks Kategori Respons (${kesulitan.toUpperCase()})`,
    });
  }

  return slots;
}

export interface PackageStatusCalculation {
  status: PaketSoalStatusType;
  totalSoal: number;
  filledSoal: number;
  disetujuiCount: number;
  direvisiCount: number;
  ditolakCount: number;
  menungguCount: number;
  percentageApproved: number;
  canPublish: boolean;
}

export function calculatePackageStatus(
  questionsList: Array<{ status: string; nomorUrut?: number | null }>
): PackageStatusCalculation {
  const totalSoal = 30;
  // Ambil hanya soal yang valid memiliki nomorUrut 1 s.d. 30
  const validSlotQuestions = questionsList.filter(
    (q) => typeof q.nomorUrut === "number" && q.nomorUrut >= 1 && q.nomorUrut <= 30
  );

  const filledSoal = validSlotQuestions.length;
  const disetujuiCount = validSlotQuestions.filter((q) => q.status === "disetujui").length;
  const direvisiCount = validSlotQuestions.filter(
    (q) => q.status === "direvisi" || q.status === "perlu_revisi"
  ).length;
  const ditolakCount = validSlotQuestions.filter((q) => q.status === "ditolak").length;
  const menungguCount = validSlotQuestions.filter((q) => q.status === "menunggu_validasi").length;

  const percentageApproved = Math.round((disetujuiCount / totalSoal) * 100);

  let status: PaketSoalStatusType = "draft";

  // Gerbang kelulusan: 100% 30/30 lolos
  if (disetujuiCount === 30) {
    status = "siap_rilis";
  } else if (direvisiCount > 0 || ditolakCount > 0) {
    status = "perlu_revisi";
  } else if (filledSoal === 30 && menungguCount > 0) {
    status = "dalam_validasi";
  } else {
    status = "draft";
  }

  return {
    status,
    totalSoal,
    filledSoal,
    disetujuiCount,
    direvisiCount,
    ditolakCount,
    menungguCount,
    percentageApproved,
    canPublish: disetujuiCount === 30,
  };
}

// Generator Kode Paket: H01-SD-MAT atau A01-SD-MAT
export function generatePackageCode(
  tipeSumber: "manual" | "ai",
  sequenceNumber: number,
  jenjang: string,
  mapel: string
): { code: string; nama: string } {
  const prefix = tipeSumber === "ai" ? "A" : "H";
  const numStr = sequenceNumber.toString().padStart(2, "0");
  const jenjangCode = jenjang.split("/")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const mapelCode = mapel.toLowerCase().includes("matematika") ? "MAT" : "BIN";

  const code = `${prefix}${numStr}-${jenjangCode}-${mapelCode}`;
  const nama = `Paket ${prefix}${sequenceNumber} (${jenjang} - ${mapel})`;

  return { code, nama };
}
