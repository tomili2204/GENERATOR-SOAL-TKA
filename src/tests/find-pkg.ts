import { db } from "../db";
import { questionPackages, questions, generationLogs } from "../db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const pkg = await db.select().from(questionPackages).where(eq(questionPackages.id, "pkg-ai-1789731813944-0ykz6"));
  console.log("=== PKG pkg-ai-1789731813944-0ykz6 ===");
  console.log(JSON.stringify(pkg, null, 2));

  const qList = await db.select().from(questions).where(eq(questions.paketId, "pkg-ai-1789731813944-0ykz6")).orderBy(questions.nomorUrut);
  console.log("\n=== QUESTIONS COUNT: " + qList.length + " ===");
  for (const q of qList) {
    const p = q.payload as any;
    console.log(`[No ${q.nomorUrut}] Code: ${q.code} | Elemen: "${q.elemen}" | Sub: "${q.subElemen}" | Bentuk: ${q.bentukSoal}`);
    console.log(`  Soal: ${(p?.soal_text || "").substring(0, 120).replace(/\n/g, " ")}`);
  }

  const logs = await db.select().from(generationLogs).where(eq(generationLogs.packageId, "pkg-ai-1789731813944-0ykz6"));
  console.log("\n=== LOGS FOR PKG ===");
  console.log(JSON.stringify(logs, null, 2));

  process.exit(0);
}

main().catch(console.error);
