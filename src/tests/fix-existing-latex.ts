import { db, ensureTablesCreated } from "@/db";
import { questions, stimulus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deepRepairLatex, repairLatexString } from "@/lib/latex/latex-repair";

async function main() {
  console.log("=== MEMULAI MIGRASI PERBAIKAN RUMUS LATEX / KATEX DATABASE ===");
  await ensureTablesCreated();

  // 1. Periksa dan perbaiki tabel questions
  const allQuestions = await db.select().from(questions);
  console.log(`Total soal ditemukan di database: ${allQuestions.length}`);

  let updatedQuestionsCount = 0;
  const samplesRepaired: Array<{ code: string; before: string; after: string }> = [];

  for (const q of allQuestions) {
    const originalPayloadStr = JSON.stringify(q.payload);
    const repairedPayload = deepRepairLatex(q.payload);
    const repairedPayloadStr = JSON.stringify(repairedPayload);

    if (originalPayloadStr !== repairedPayloadStr) {
      await db
        .update(questions)
        .set({
          payload: repairedPayload,
          updatedAt: new Date(),
        })
        .where(eq(questions.id, q.id));

      updatedQuestionsCount++;

      if (
        samplesRepaired.length < 5 ||
        q.code === "A07-SD-MAT-01" ||
        q.code === "A07-SD-MAT-03"
      ) {
        samplesRepaired.push({
          code: q.code,
          before: originalPayloadStr.slice(0, 160),
          after: repairedPayloadStr.slice(0, 160),
        });
      }
    }
  }

  console.log(`\nBerhasil memperbarui ${updatedQuestionsCount} soal yang memiliki artefak LaTeX/JSON escaping!`);
  console.log("Contoh perubahan pada butir soal:");
  for (const s of samplesRepaired) {
    console.log(`- [${s.code}]:`);
    console.log(`  BEFORE: ${s.before}...`);
    console.log(`  AFTER : ${s.after}...`);
  }

  // 2. Periksa dan perbaiki tabel stimulus
  const allStimulus = await db.select().from(stimulus);
  console.log(`\nTotal stimulus ditemukan di database: ${allStimulus.length}`);

  let updatedStimulusCount = 0;
  for (const stim of allStimulus) {
    const repKonten = repairLatexString(stim.konten || "");
    const repJudul = repairLatexString(stim.judul || "");

    if (repKonten !== stim.konten || repJudul !== stim.judul) {
      await db
        .update(stimulus)
        .set({
          konten: repKonten,
          judul: repJudul,
          updatedAt: new Date(),
        })
        .where(eq(stimulus.id, stim.id));

      updatedStimulusCount++;
    }
  }

  console.log(`Berhasil memperbarui ${updatedStimulusCount} stimulus dengan perbaikan LaTeX!`);
  console.log("\n=== MIGRASI PERBAIKAN SELESAI DENGAN SUKSES ===");
}

main().catch((err) => {
  console.error("Migrasi gagal:", err);
  process.exit(1);
});
