import { db, ensureTablesCreated } from "@/db";
import { questions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateAndRepairSvg } from "@/lib/validations/svg";

const APPLY = process.argv.includes("--apply");

async function main() {
  await ensureTablesCreated();

  const allQuestions = await db.select().from(questions);

  const withSvg = allQuestions.filter(
    (q: any) => q.payload?.gambar?.tipe === "svg" && typeof q.payload.gambar.svg_content === "string"
  );

  console.log(`\n=== AUDIT & PERBAIKAN SVG — ${APPLY ? "MODE TERAPKAN KE DB" : "MODE DRY-RUN (TIDAK MENGUBAH DB)"} ===`);
  console.log(`Total butir soal di database: ${allQuestions.length}`);
  console.log(`Total butir soal dengan ilustrasi SVG: ${withSvg.length}\n`);

  let cleanCount = 0;
  let repairedCount = 0;
  let brokenCount = 0;
  const repairedRows: { id: string; code: string }[] = [];

  for (const q of withSvg as any[]) {
    const original: string = q.payload.gambar.svg_content;
    const result = validateAndRepairSvg(original);

    if (!result.content) {
      brokenCount++;
      console.log(`[RUSAK - PERLU REGENERASI] ${q.code}`);
      result.issues.forEach((i) => console.log(`    - ${i}`));
      console.log(`    Cuplikan asli: ${original.slice(0, 90).replace(/\s+/g, " ")}...\n`);
      continue;
    }

    if (result.issues.length === 0) {
      cleanCount++;
      continue;
    }

    repairedCount++;
    console.log(`[DIPERBAIKI] ${q.code}`);
    result.issues.forEach((i) => console.log(`    - ${i}`));
    console.log(`    SEBELUM: ${original.slice(0, 110).replace(/\s+/g, " ")}...`);
    console.log(`    SESUDAH: ${result.content.slice(0, 110).replace(/\s+/g, " ")}...\n`);

    if (APPLY) {
      await db
        .update(questions)
        .set({
          payload: {
            ...q.payload,
            gambar: { ...q.payload.gambar, svg_content: result.content },
          },
          updatedAt: new Date(),
        })
        .where(eq(questions.id, q.id));
      repairedRows.push({ id: q.id, code: q.code });
    }
  }

  console.log("=== RINGKASAN ===");
  console.log(`Sudah bersih (tidak perlu diubah): ${cleanCount}`);
  console.log(`Diperbaiki otomatis (atribut hilang / tag berbahaya dibuang): ${repairedCount}`);
  console.log(`Rusak berat, tidak bisa diperbaiki otomatis (perlu digenerasi ulang): ${brokenCount}`);
  if (APPLY) {
    console.log(`\n${repairedRows.length} baris berhasil disimpan ke database.`);
  } else if (repairedCount > 0) {
    console.log(`\nJalankan ulang dengan flag --apply untuk menyimpan ${repairedCount} perbaikan ini ke database.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Audit gagal:", err);
  process.exit(1);
});
