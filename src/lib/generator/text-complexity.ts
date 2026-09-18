/**
 * Modul Validasi Karakteristik & Kompleksitas Teks Bacaan TKA
 * Berdasarkan Perkaban BSKAP No. 47/2025 (SD/MI & SMP/MTs) dan No. 45/2025 (SMA/MA & SMK/MAK).
 * 
 * ATURAN KERAS (HANYA BERLAKU UNTUK BAHASA INDONESIA / INGGRIS, DILEWATI TOTAL UNTUK MATEMATIKA):
 * - SD/MI: 150-200 kata; 3-7 kata/kalimat; HANYA kalimat tunggal pola dasar SPOK; TIDAK BOLEH kalimat majemuk.
 * - SMP/MTs: 200-250 kata; 5-9 kata/kalimat; kalimat tunggal berbagai pola DAN kalimat majemuk SETARA (dihubungkan kata seperti "dan", "tetapi", "atau" dengan kedudukan sejajar); TIDAK BOLEH kalimat majemuk bertingkat/kompleks dengan anak kalimat.
 * - SMA/MA & SMK/MAK: 250-300 kata; 8-12 kata/kalimat; kalimat kompleks berbagai pola dan kalimat inversi DIPERBOLEHKAN di jenjang ini saja.
 */

import { normalizeJenjang } from "@/lib/jenjang-utils";

export interface JenjangTextCriteria {
  minWords: number;
  maxWords: number;
  minWordsPerSentence: number;
  maxWordsPerSentence: number;
  allowComplexSentences: boolean;
  maxTechnicalTerms: number;
}

export const JENJANG_TEXT_CRITERIA: Record<string, JenjangTextCriteria> = {
  "SD/MI": {
    minWords: 150,
    maxWords: 200,
    minWordsPerSentence: 3,
    maxWordsPerSentence: 7,
    allowComplexSentences: false,
    maxTechnicalTerms: 3,
  },
  "SMP/MTs": {
    minWords: 200,
    maxWords: 250,
    minWordsPerSentence: 5,
    maxWordsPerSentence: 9,
    allowComplexSentences: false,
    maxTechnicalTerms: 3,
  },
  "SMA/MA": {
    minWords: 250,
    maxWords: 300,
    minWordsPerSentence: 8,
    maxWordsPerSentence: 12,
    allowComplexSentences: true,
    maxTechnicalTerms: 10,
  },
  "SMK/MAK": {
    minWords: 250,
    maxWords: 300,
    minWordsPerSentence: 8,
    maxWordsPerSentence: 12,
    allowComplexSentences: true,
    maxTechnicalTerms: 10,
  },
};

export const DEFAULT_TECHNICAL_TERMS: string[] = [
  "inflasi",
  "deflasi",
  "margin",
  "dividen",
  "likuiditas",
  "komoditas",
  "ekspor",
  "impor",
  "devisa",
  "valuta",
  "omzet",
  "bea cukai",
  "bea masuk",
  "depresiasi",
  "akselerasi",
  "fotosintesis",
  "ekosistem",
  "biodiversitas",
  "endemis",
  "reboisasi",
  "metamorfosis",
  "osmosis",
  "klorofil",
  "polimer",
  "algoritma",
  "enkripsi",
  "digitalisasi",
  "bioteknologi",
  "nanoteknologi",
  "mikroplastik",
  "detritus",
  "regulasi",
  "katalis",
  "konsesi",
  "amortisasi",
  "distribusi digital",
  "katalog elektronik",
  "lokapasar",
  "e-commerce",
];

const EXPLANATION_MARKERS = [
  "adalah",
  "merupakan",
  "yaitu",
  "ialah",
  "artinya",
  "diartikan sebagai",
  "didefinisikan sebagai",
  "maknanya",
  "disebut",
  "berarti",
];

export function isLanguageSubject(mapel: string): boolean {
  if (!mapel) return false;
  const lower = mapel.toLowerCase().trim();
  return lower.includes("indonesia") || lower.includes("inggris") || lower.includes("bahasa");
}

export function countWords(text: string): number {
  if (!text) return 0;
  const clean = text
    .replace(/^#+\s.*$/gm, "")
    .replace(/[*_`]/g, " ")
    .trim();
  if (!clean) return 0;
  const words = clean.split(/\s+/).filter(Boolean);
  return words.length;
}

export function splitSentences(text: string): string[] {
  if (!text) return [];
  const clean = text
    .replace(/^#+\s.*$/gm, "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!clean) return [];

  const rawSentences = clean.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  return rawSentences;
}

export function calculateAvgWordsPerSentence(text: string): {
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
} {
  const wordCount = countWords(text);
  const sentences = splitSentences(text);
  const sentenceCount = Math.max(1, sentences.length);
  const avgWordsPerSentence = wordCount / sentenceCount;
  return {
    wordCount,
    sentenceCount,
    avgWordsPerSentence,
  };
}

export function analyzeTechnicalTerms(
  text: string,
  customTerms: string[] = DEFAULT_TECHNICAL_TERMS
): {
  termsFound: string[];
  unexplainedTerms: string[];
} {
  if (!text) return { termsFound: [], unexplainedTerms: [] };

  const sentences = splitSentences(text);
  const lowerText = text.toLowerCase();
  const termsFound: string[] = [];
  const unexplainedTerms: string[] = [];

  for (const term of customTerms) {
    const termLower = term.toLowerCase();
    const regex = new RegExp(`\\b${termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(lowerText)) {
      termsFound.push(term);

      const sentenceIdx = sentences.findIndex((s) => regex.test(s.toLowerCase()));
      let hasExplanation = false;

      if (sentenceIdx !== -1) {
        const currentSentence = sentences[sentenceIdx].toLowerCase();
        const nextSentence = sentenceIdx + 1 < sentences.length ? sentences[sentenceIdx + 1].toLowerCase() : "";

        const hasMarkerInCurrent = EXPLANATION_MARKERS.some((m) => currentSentence.includes(m));
        const hasMarkerInNext = EXPLANATION_MARKERS.some((m) => nextSentence.includes(m));

        if (hasMarkerInCurrent || hasMarkerInNext) {
          hasExplanation = true;
        }
      }

      if (!hasExplanation) {
        unexplainedTerms.push(term);
      }
    }
  }

  return { termsFound, unexplainedTerms };
}

export interface ValidationResult {
  skipped: boolean;
  valid: boolean;
  jenjang: string;
  mapel: string;
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  criteria?: JenjangTextCriteria;
  reasons: string[];
  warnings: string[];
  metricsSummary: string;
}

export function validateLanguageTextComplexity(options: {
  rawJenjang: string;
  mapel: string;
  text: string;
  sourceLabel?: string;
}): ValidationResult {
  const { rawJenjang, mapel, text, sourceLabel = "Stimulus Wacana" } = options;

  if (!isLanguageSubject(mapel)) {
    return {
      skipped: true,
      valid: true,
      jenjang: rawJenjang,
      mapel,
      wordCount: 0,
      sentenceCount: 0,
      avgWordsPerSentence: 0,
      reasons: [],
      warnings: [],
      metricsSummary: `Pemeriksaan wacana dilewati untuk mapel ${mapel} (bukan mata uji keterampilan membaca).`,
    };
  }

  const jenjang = normalizeJenjang(rawJenjang);
  const criteria = JENJANG_TEXT_CRITERIA[jenjang] || JENJANG_TEXT_CRITERIA["SMP/MTs"];

  const { wordCount, sentenceCount, avgWordsPerSentence } = calculateAvgWordsPerSentence(text);
  const roundedAvgWps = Math.round(avgWordsPerSentence * 10) / 10;

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (wordCount < criteria.minWords) {
    reasons.push(
      `Jumlah kata (${wordCount} kata) KURANG dari batas minimal resmi jenjang ${jenjang} (${criteria.minWords}-${criteria.maxWords} kata). Teks dianggap cacat.`
    );
  } else if (wordCount > criteria.maxWords) {
    reasons.push(
      `Jumlah kata (${wordCount} kata) MELEBIHI batas maksimal resmi jenjang ${jenjang} (${criteria.minWords}-${criteria.maxWords} kata). Teks dianggap cacat.`
    );
  }

  if (roundedAvgWps < criteria.minWordsPerSentence) {
    reasons.push(
      `Rata-rata kata per kalimat (${roundedAvgWps} kata/kalimat) di bawah batas resmi jenjang ${jenjang} (${criteria.minWordsPerSentence}-${criteria.maxWordsPerSentence} kata/kalimat).`
    );
  } else if (roundedAvgWps > criteria.maxWordsPerSentence) {
    reasons.push(
      `Rata-rata kata per kalimat (${roundedAvgWps} kata/kalimat) melebihi batas resmi jenjang ${jenjang} (${criteria.minWordsPerSentence}-${criteria.maxWordsPerSentence} kata/kalimat).`
    );
  }

  const isElementaryOrMiddle = jenjang === "SD/MI" || jenjang === "SMP/MTs";
  const { termsFound, unexplainedTerms } = analyzeTechnicalTerms(text);

  if (isElementaryOrMiddle && unexplainedTerms.length > criteria.maxTechnicalTerms) {
    warnings.push(
      `[Peringatan Istilah Teknis] ${sourceLabel} memuat ${unexplainedTerms.length} istilah teknis tanpa kalimat penjelas definisi langsung (${unexplainedTerms.join(", ")}). Disarankan maksimal 2-3 istilah dengan kalimat penjelas terpisah pada kemunculan pertama.`
    );
  }

  const isValid = reasons.length === 0;
  const metricsSummary = `[Metrik Wacana BSKAP - ${jenjang}] Aktual: ${wordCount} kata (standar: ${criteria.minWords}-${criteria.maxWords}), ${roundedAvgWps} kata/kalimat (standar: ${criteria.minWordsPerSentence}-${criteria.maxWordsPerSentence}), Istilah teknis: ${termsFound.length} terdeteksi (${unexplainedTerms.length} tanpa penjelas). Status: ${isValid ? "LOLOS" : "GAGAL"}.`;

  return {
    skipped: false,
    valid: isValid,
    jenjang,
    mapel,
    wordCount,
    sentenceCount,
    avgWordsPerSentence: roundedAvgWps,
    criteria,
    reasons,
    warnings,
    metricsSummary,
  };
}
