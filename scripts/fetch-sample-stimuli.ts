import { db } from "../src/db";
import { questionPackages, questions, stimulus } from "../src/db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  const pkgs = await db
    .select()
    .from(questionPackages)
    .where(eq(questionPackages.code, "DRAFT-EVAL-SMP-EWOI"));

  if (!pkgs.length) {
    console.log("Paket tidak ditemukan!");
    process.exit(1);
  }

  const pkg = pkgs[0];
  const allQs = await db
    .select()
    .from(questions)
    .where(eq(questions.paketId, pkg.id));

  const stimIds = Array.from(new Set(allQs.map((q: any) => q.stimulusId).filter(Boolean))) as string[];

  console.log(`Ditemukan ${stimIds.length} stimulus pada paket draft ${pkg.code}:\n`);

  for (const sId of stimIds) {
    const stRows = await db.select().from(stimulus).where(eq(stimulus.id, sId));
    if (!stRows.length) continue;
    const st = stRows[0];
    const qs = allQs.filter((q: any) => q.stimulusId === sId);

    console.log("==================================================");
    console.log(`STIMULUS ID: ${st.id}`);
    console.log(`JUDUL: ${st.judul}`);
    console.log(`JUMLAH KATA: ${st.jumlahKata}`);
    console.log(`KONTEN:\n${st.konten}`);
    console.log("--------------------------------------------------");
    console.log("SOAL TERKAIT:");
    qs.forEach((q: any, idx: number) => {
      const p: any = q.payload || {};
      console.log(`\n[Soal #${idx + 1}] Kompetensi: ${q.kompetensi} (${q.bentukSoal})`);
      console.log(`Teks: ${p.soal_text}`);
      if (p.opsi) {
        p.opsi.forEach((o: any) => console.log(`  ${o.label}. ${o.text}`));
      }
      console.log(`Kunci: ${JSON.stringify(p.kunci_jawaban)}`);
      console.log(`Pembahasan: ${p.pembahasan}`);
    });
    console.log("==================================================\n");
  }

  process.exit(0);
}

main().catch(console.error);
