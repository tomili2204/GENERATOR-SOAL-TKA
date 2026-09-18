import { NextResponse } from "next/server";
import { db, ensureTablesCreated } from "@/db";
import { fixedTaxonomies, FixedTaxonomy } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureTablesCreated();

    const allTaxonomies: FixedTaxonomy[] = await db
      .select()
      .from(fixedTaxonomies)
      .orderBy(asc(fixedTaxonomies.sortOrder), asc(fixedTaxonomies.name));

    // Filter hanya yang aktif (default true jika belum diset)
    const activeTaxonomies = allTaxonomies.filter((t) => {
      const meta = (t.metadata as any) || {};
      return meta.isActive !== false;
    });

    // Kumpulkan seluruh mata pelajaran aktif (gabungkan dengan default Matematika & B.Indo)
    const defaultMapels = ["Matematika", "Bahasa Indonesia"];
    const mapelSet = new Set<string>(defaultMapels);

    activeTaxonomies.forEach((t) => {
      if (t.category === "mapel" && t.name) {
        mapelSet.add(t.name);
      } else if (t.mapel) {
        mapelSet.add(t.mapel);
      }
    });

    const mapels = Array.from(mapelSet);

    // Kumpulkan elemen kompetensi per mapel & jenjang
    const elements = activeTaxonomies
      .filter((t) => t.category === "elemen")
      .map((t) => ({
        id: t.id,
        jenjang: t.jenjang,
        mapel: t.mapel,
        code: t.code,
        name: t.name,
        description: t.description || "",
      }));

    return NextResponse.json({
      success: true,
      data: {
        mapels,
        elements,
        all: activeTaxonomies,
      },
    });
  } catch (error: any) {
    console.error("Error fetching taxonomy, returning fallback defaults:", error);
    return NextResponse.json({
      success: true,
      data: {
        mapels: ["Matematika", "Bahasa Indonesia"],
        elements: [
          { id: "def-1", jenjang: "SD/MI", mapel: "Matematika", code: "BIL", name: "Bilangan", description: "" },
          { id: "def-2", jenjang: "SD/MI", mapel: "Matematika", code: "GEO", name: "Geometri", description: "" },
          { id: "def-3", jenjang: "SD/MI", mapel: "Matematika", code: "ALJ", name: "Aljabar & Pola", description: "" },
          { id: "def-4", jenjang: "SD/MI", mapel: "Bahasa Indonesia", code: "TEK", name: "Pemahaman Tekstual", description: "" },
          { id: "def-5", jenjang: "SD/MI", mapel: "Bahasa Indonesia", code: "INF", name: "Pemahaman Inferensial", description: "" },
        ],
        all: [],
      },
      fallback: true,
    });
  }
}
