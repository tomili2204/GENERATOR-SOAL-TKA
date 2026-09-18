import { db } from "../db";
import { questions } from "../db/schema";
import { eq } from "drizzle-orm";
import { validateLanguageTextComplexity, countWords } from "../lib/generator/text-complexity";

async function main() {
  const qList = await db.select().from(questions).where(eq(questions.mapel, "Bahasa Indonesia"));
  console.log(`Total Soal Bahasa Indonesia: ${qList.length}`);

  let nonCompliantStem = 0;
  for (const q of qList) {
    const payload = q.payload as any;
    const stem = payload?.soal_text || "";
    const words = countWords(stem);

    // Jika soal bertipe tunggal dan memuat wacana mandiri panjang (>= 100 kata)
    if (q.jenisSoal === "tunggal" && words >= 100) {
      const val = validateLanguageTextComplexity({
        rawJenjang: q.jenjang,
        mapel: q.mapel,
        text: stem,
        sourceLabel: q.code || q.id,
      });
      if (!val.valid) {
        nonCompliantStem++;
        console.log(`[Soal Mandiri Non-Compliant] ${q.code}: ${words} kata`);
      }
    }
  }

  console.log(`Soal mandiri wacana yang perlu diselaraskan: ${nonCompliantStem} dari ${qList.length}`);
  process.exit(0);
}
main();
