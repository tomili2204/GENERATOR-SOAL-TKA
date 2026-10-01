import { db } from "../src/db";
import { questionPackages, questions, stimulus } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { analyzeStimulusText } from "./measure-stimulus-bin";

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

  let infoStim: any = null;
  let fictionStim: any = null;
  let dualStim: any = null;

  for (const sId of stimIds) {
    const stRows = await db.select().from(stimulus).where(eq(stimulus.id, sId));
    if (!stRows.length) continue;
    const st = stRows[0];
    const qs = allQs.filter((q: any) => q.stimulusId === sId);
    const metrics = analyzeStimulusText(st.konten || "");

    if (!dualStim && metrics.isDualText) {
      dualStim = { st, qs, metrics };
    } else if (!fictionStim && metrics.genre.includes("narasi")) {
      fictionStim = { st, qs, metrics };
    } else if (!infoStim && (metrics.genre.includes("informasi") || metrics.genre.includes("observasi")) && !metrics.isDualText) {
      infoStim = { st, qs, metrics };
    }
  }

  let outputMd = "# 3 CONTOH HASIL STIMULUS BARU (EVALUASI SMP)\n\n";

  function formatSample(label: string, sample: any): string {
    let md = `## ${label}\n\n`;
    md += `- **ID Stimulus**: \`${sample.st.id}\`\n`;
    md += `- **Judul**: ${sample.st.judul}\n`;
    md += `- **Genre**: ${sample.metrics.genre}\n`;
    md += `- **Jumlah Kata**: ${sample.metrics.wordCount}\n`;
    md += `- **Paragraf**: ${sample.metrics.paragraphCount}\n`;
    md += `- **KPK**: mean ${sample.metrics.meanWps.toFixed(2)} (std dev: ${sample.metrics.stdWps.toFixed(2)})\n\n`;
    md += `### Konten Stimulus:\n\n${sample.st.konten}\n\n`;
    md += `### Soal Terkait:\n\n`;
    sample.qs.forEach((q: any, i: number) => {
      const p = q.payload || {};
      md += `#### Soal #${i + 1} (${q.kompetensi} - Level ${p.level_kognitif || q.levelKognitif}) [${q.bentukSoal}]\n`;
      md += `${p.soal_text}\n\n`;
      if (p.opsi) {
        p.opsi.forEach((o: any) => {
          md += `- **${o.label}**. ${o.text}\n`;
        });
        md += `\n`;
      }
      md += `**Kunci Jawaban**: \`${JSON.stringify(p.kunci_jawaban)}\`\n\n`;
      md += `**Pembahasan**:\n${p.pembahasan}\n\n`;
    });
    return md;
  }

  if (infoStim) outputMd += formatSample("1. CONTOH TEKS INFORMASI", infoStim);
  if (fictionStim) outputMd += formatSample("2. CONTOH TEKS FIKSI", fictionStim);
  if (dualStim) outputMd += formatSample("3. CONTOH TEKS GANDA", dualStim);

  import("fs").then(fs => {
    fs.writeFileSync("eval-three-samples.md", outputMd, "utf8");
    console.log("File eval-three-samples.md berhasil ditulis!");
    process.exit(0);
  });
}

main().catch(console.error);
