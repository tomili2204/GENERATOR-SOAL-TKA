/**
 * Helper untuk normalisasi dan pencocokan jenjang pendidikan.
 * Mendukung pencocokan toleran antara singkatan sederhana ("SD", "SMP", "SMA", "SMK")
 * dan bentuk madrasah ("SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK").
 */

export function normalizeJenjang(val: string | null | undefined): string {
  if (!val) return "";
  const upper = val.toUpperCase().trim();
  if (upper.startsWith("SD")) return "SD/MI";
  if (upper.startsWith("SMP")) return "SMP/MTs";
  if (upper.startsWith("SMA")) return "SMA/MA";
  if (upper.startsWith("SMK")) return "SMK/MAK";
  return upper;
}

export function isJenjangMatch(
  dataJenjang: string | null | undefined,
  filterJenjang: string | null | undefined
): boolean {
  if (!filterJenjang || filterJenjang === "all" || filterJenjang === "semua") {
    return true;
  }
  if (!dataJenjang) return false;

  // 1. Pencocokan langsung
  if (dataJenjang === filterJenjang) return true;

  // 2. Normalisasi awalan (SD vs SD/MI, SMP vs SMP/MTs, dst.)
  const normData = normalizeJenjang(dataJenjang);
  const normFilter = normalizeJenjang(filterJenjang);

  return normData === normFilter;
}

export function getJenjangVariants(jenjang: string): string[] {
  const norm = normalizeJenjang(jenjang);
  switch (norm) {
    case "SD/MI":
      return ["SD", "SD/MI"];
    case "SMP/MTs":
      return ["SMP", "SMP/MTs"];
    case "SMA/MA":
      return ["SMA", "SMA/MA"];
    case "SMK/MAK":
      return ["SMK", "SMK/MAK"];
    default:
      return [jenjang];
  }
}

