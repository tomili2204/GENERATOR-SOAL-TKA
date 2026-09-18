import { db } from "../db";
import { questions, stimulus, questionPackages } from "../db/schema";
import { eq, inArray, isNotNull } from "drizzle-orm";
import { validateLanguageTextComplexity } from "../lib/generator/text-complexity";

async function main() {
  // Ambil seluruh stimulusId yang aktif dipakai oleh soal Bahasa Indonesia
  const activeQuestions = await db
    .select({
      stimulusId: questions.stimulusId,
      paketId: questions.paketId,
      jenjang: questions.jenjang,
    })
    .from(questions)
    .where(eq(questions.mapel, "Bahasa Indonesia"));

  const activeStimulusIds = Array.from(
    new Set(activeQuestions.map((q) => q.stimulusId).filter(Boolean))
  ) as string[];

  console.log(`Total Soal Bahasa Indonesia: ${activeQuestions.length}`);
  console.log(`Total Stimulus ID Aktif yang Terikat Soal: ${activeStimulusIds.length}`);

  const activeStims = await db
    .select()
    .from(stimulus)
    .where(inArray(stimulus.id, activeStimulusIds));

  let nonCompliant = 0;
  for (const s of activeStims) {
    const val = validateLanguageTextComplexity({
      rawJenjang: s.jenjang,
      mapel: s.mapel,
      text: s.konten || "",
    });
    if (!val.valid) {
      nonCompliant++;
      console.log(`[Non-Compliant] ${s.id} (${s.jenjang}): ${val.wordCount} kata, avgWps ${val.avgWordsPerSentence}`);
    }
  }

  console.log(`Stimulus Aktif yang Perlu Diselaraskan: ${nonCompliant} dari ${activeStims.length}`);
  process.exit(0);
}
main();
