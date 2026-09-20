/**
 * Modul Similarity Checker & Kalibrasi Observasi (Lapis 4)
 * Menghitung kemiripan teks soal terhadap bank soal 5-7 hari terakhir
 * Selama masa kalibrasi: hasil dicatat ke log observasi tanpa penolakan keras (hard rejection)
 */

// Stopwords umum bahasa Indonesia untuk memfilter kata penghubung
const INDONESIAN_STOPWORDS = new Set([
  "yang", "di", "ke", "dari", "pada", "dalam", "untuk", "dengan", "dan", "atau",
  "ini", "itu", "juga", "adalah", "sebagai", "oleh", "akan", "telah", "dapat",
  "jika", "maka", "ada", "sebuah", "suatu", "tersebut", "bila", "karena", "agar",
  "supaya", "setiap", "masing", "antara", "saat", "ketika", "kemudian", "lalu",
  "berapa", "apakah", "berapakah", "tentukan", "hitunglah", "berikut", "dibawah",
]);

/**
 * Tokenisasi teks soal menjadi sekumpulan token kata kunci dan n-gram
 */
function tokenizeText(text: string): { words: Set<string>; bigrams: Set<string> } {
  if (!text) return { words: new Set(), bigrams: new Set() };

  // Bersihkan rumus LaTeX dan karakter non-alfanumerik
  const cleaned = text
    .toLowerCase()
    .replace(/\$\$/g, " ")
    .replace(/\$/g, " ")
    .replace(/\\(frac|times|sqrt|le|ge|text|pi)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const rawWords = cleaned.split(" ").filter((w) => w.length > 2 && !INDONESIAN_STOPWORDS.has(w));
  const words = new Set(rawWords);

  // Buat 2-gram (bigram) untuk mendeteksi frasa kembar (misal: "taman persegi", "kolam lingkaran")
  const bigrams = new Set<string>();
  for (let i = 0; i < rawWords.length - 1; i++) {
    bigrams.add(`${rawWords[i]}_${rawWords[i + 1]}`);
  }

  return { words, bigrams };
}

/**
 * Menghitung koefisien Jaccard similarity antara dua himpunan
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersectionCount++;
    }
  }
  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

export interface SimilarityInspectionResult {
  score: number; // 0 - 100
  isExceedingThreshold: boolean;
  comparedWithStem?: string;
  wordOverlapPercent: number;
  phraseOverlapPercent: number;
}

/**
 * Membandingkan satu butir soal baru terhadap kumpulan riwayat soal database
 */
export function checkQuestionSimilarity(
  newQuestionText: string,
  comparisonStems: string[],
  threshold: number = 60
): SimilarityInspectionResult {
  if (!comparisonStems || comparisonStems.length === 0 || !newQuestionText) {
    return {
      score: 0,
      isExceedingThreshold: false,
      wordOverlapPercent: 0,
      phraseOverlapPercent: 0,
    };
  }

  const { words: targetWords, bigrams: targetBigrams } = tokenizeText(newQuestionText);
  let highestScore = 0;
  let highestStem = "";
  let highestWordOverlap = 0;
  let highestPhraseOverlap = 0;

  for (const stem of comparisonStems) {
    const { words: compWords, bigrams: compBigrams } = tokenizeText(stem);

    const wordSim = jaccardSimilarity(targetWords, compWords);
    const phraseSim = jaccardSimilarity(targetBigrams, compBigrams);

    // Skor gabungan: 60% bobot frasa (bigram) + 40% bobot kata (unigram)
    const combinedSim = phraseSim > 0 ? phraseSim * 0.6 + wordSim * 0.4 : wordSim * 0.8;
    const scorePercent = Math.round(combinedSim * 100);

    if (scorePercent > highestScore) {
      highestScore = scorePercent;
      highestStem = stem.substring(0, 80) + "...";
      highestWordOverlap = Math.round(wordSim * 100);
      highestPhraseOverlap = Math.round(phraseSim * 100);
    }
  }

  return {
    score: highestScore,
    isExceedingThreshold: highestScore >= threshold,
    comparedWithStem: highestStem,
    wordOverlapPercent: highestWordOverlap,
    phraseOverlapPercent: highestPhraseOverlap,
  };
}

/**
 * Menjalankan inspeksi kemiripan untuk seluruh batch soal yang baru dihasilkan.
 * Mengembalikan ringkasan kalibrasi observasi untuk disimpan ke log database.
 */
export function evaluateBatchSimilarity(
  questions: Array<{ soal_text: string; index?: number }>,
  comparisonStems: string[],
  calibrationMode: boolean = true // Default true (masa kalibrasi 5-7 hari: hanya mencatat, tidak menolak)
): {
  averageScore: number;
  maxScore: number;
  highSimilarityCount: number;
  calibrationLogs: Array<{
    itemIndex: number;
    score: number;
    wordOverlap: number;
    phraseOverlap: number;
    comparisonSnippet: string;
  }>;
} {
  const calibrationLogs: Array<{
    itemIndex: number;
    score: number;
    wordOverlap: number;
    phraseOverlap: number;
    comparisonSnippet: string;
  }> = [];

  let totalScore = 0;
  let maxScore = 0;
  let highSimilarityCount = 0;

  questions.forEach((q, idx) => {
    const itemNum = q.index !== undefined ? q.index : idx + 1;
    const res = checkQuestionSimilarity(q.soal_text, comparisonStems, 60);

    totalScore += res.score;
    if (res.score > maxScore) maxScore = res.score;
    if (res.isExceedingThreshold) highSimilarityCount++;

    if (res.score >= 35) {
      // Catat item yang memiliki indikasi kemiripan cukup signifikan untuk kalibrasi
      calibrationLogs.push({
        itemIndex: itemNum,
        score: res.score,
        wordOverlap: res.wordOverlapPercent,
        phraseOverlap: res.phraseOverlapPercent,
        comparisonSnippet: res.comparedWithStem || "",
      });
    }
  });

  const averageScore = questions.length > 0 ? Math.round(totalScore / questions.length) : 0;

  return {
    averageScore,
    maxScore,
    highSimilarityCount,
    calibrationLogs,
  };
}
