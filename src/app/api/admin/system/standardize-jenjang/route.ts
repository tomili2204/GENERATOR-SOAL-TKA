import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  questionPackages,
  questions,
  stimulus,
  generatorConfigs,
  fixedTaxonomies,
  generationLogs,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireRole("admin");

    // 1. Update questionPackages
    await db.update(questionPackages).set({ jenjang: "SMP/MTs" }).where(eq(questionPackages.jenjang, "SMP" as any));
    await db.update(questionPackages).set({ jenjang: "SD/MI" }).where(eq(questionPackages.jenjang, "SD" as any));

    // Standarisasi nama paket: (SD - ...) -> (SD/MI - ...), (SMP - ...) -> (SMP/MTs - ...)
    const allPkgs = await db.select().from(questionPackages);
    for (const p of allPkgs) {
      if (p.nama && (p.nama.includes("(SD - ") || p.nama.includes("(SMP - "))) {
        const newNama = p.nama.replace("(SD - ", "(SD/MI - ").replace("(SMP - ", "(SMP/MTs - ");
        await db.update(questionPackages).set({ nama: newNama }).where(eq(questionPackages.id, p.id));
      }
    }

    // 2. Update questions
    await db.update(questions).set({ jenjang: "SMP/MTs" }).where(eq(questions.jenjang, "SMP" as any));
    await db.update(questions).set({ jenjang: "SD/MI" }).where(eq(questions.jenjang, "SD" as any));

    // 3. Update stimulus
    await db.update(stimulus).set({ jenjang: "SMP/MTs" }).where(eq(stimulus.jenjang, "SMP" as any));
    await db.update(stimulus).set({ jenjang: "SD/MI" }).where(eq(stimulus.jenjang, "SD" as any));

    // 4. Update generatorConfigs
    await db.update(generatorConfigs).set({ jenjang: "SMP/MTs" }).where(eq(generatorConfigs.jenjang, "SMP" as any));
    await db.update(generatorConfigs).set({ jenjang: "SD/MI" }).where(eq(generatorConfigs.jenjang, "SD" as any));

    // 5. Update fixedTaxonomies
    await db.update(fixedTaxonomies).set({ jenjang: "SMP/MTs" }).where(eq(fixedTaxonomies.jenjang, "SMP" as any));
    await db.update(fixedTaxonomies).set({ jenjang: "SD/MI" }).where(eq(fixedTaxonomies.jenjang, "SD" as any));

    // 6. Update generationLogs
    await db.update(generationLogs).set({ jenjang: "SMP/MTs" }).where(eq(generationLogs.jenjang, "SMP" as any));
    await db.update(generationLogs).set({ jenjang: "SD/MI" }).where(eq(generationLogs.jenjang, "SD" as any));

    return NextResponse.json({
      success: true,
      message: "Berhasil menstandarisasi jenjang di seluruh database (SMP -> SMP/MTs, SD -> SD/MI).",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

