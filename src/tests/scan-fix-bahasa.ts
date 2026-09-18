import { db } from "../db";
import { stimulus, questions, questionPackages } from "../db/schema";
import { eq, like } from "drizzle-orm";
import { validateLanguageTextComplexity } from "../lib/generator/text-complexity";

async function scan() {
  const stims = await db.select().from(stimulus).where(eq(stimulus.mapel, "Bahasa Indonesia"));
  console.log(`Total Stimulus Bahasa Indonesia: ${stims.length}`);

  let nonCompliantCount = 0;
  for (const s of stims) {
    const res = validateLanguageTextComplexity({
      rawJenjang: s.jenjang,
      mapel: s.mapel,
      text: s.konten || "",
      sourceLabel: s.id,
    });

    if (!res.valid || res.warnings.length > 0) {
      nonCompliantCount++;
      console.log("----------------------------------------");
      console.log(`ID: ${s.id} | Jenjang: ${s.jenjang} | Valid: ${res.valid}`);
      console.log(`Judul: ${s.judul}`);
      console.log(`Kata: ${res.wordCount} (Standar: ${res.criteria?.minWords}-${res.criteria?.maxWords}) | AvgWps: ${res.avgWordsPerSentence} (Standar: ${res.criteria?.minWordsPerSentence}-${res.criteria?.maxWordsPerSentence})`);
      if (res.reasons.length > 0) console.log(`Alasan Gagal:`, res.reasons);
      if (res.warnings.length > 0) console.log(`Peringatan:`, res.warnings);
      console.log(`Cuplikan Konten (150 char):\n${(s.konten || "").substring(0, 150)}...`);
    }
  }

  console.log(`\nRingkasan: ${nonCompliantCount} dari ${stims.length} stimulus perlu diselaraskan.`);
  process.exit(0);
}

scan().catch((err) => {
  console.error(err);
  process.exit(1);
});
