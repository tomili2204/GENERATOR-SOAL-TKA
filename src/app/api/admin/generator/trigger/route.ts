import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { generateBatchQuestions } from "@/lib/generator/gemini-generator";
import { normalizeJenjang } from "@/lib/jenjang-utils";

export const dynamic = "force-dynamic";
// Tanpa ini, Vercel memakai batas durasi default yang jauh lebih pendek dari waktu
// generate sesungguhnya (4-9 menit untuk 20-30 soal dengan retry validasi & Nano Banana),
// sehingga trigger manual dari dashboard (tombol "Generate Sekarang") berisiko terputus
// sebelum selesai -- sama seperti bug paket kosong yang pernah terjadi di jalur cron.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("admin");

    const body = await req.json();
    const {
      jenjang,
      mapel,
      configId,
      forceMock,
      totalSoal,
      distribusiBentuk,
      distribusiKesulitan,
      customInstruction,
      selectedThemes,
      themeMode,
      selectedElements,
      elementMode,
      modelName,
      temperature,
      apiKey,
      strictSvgMode,
    } = body;

    if (!jenjang || !mapel) {
      return NextResponse.json(
        { success: false, error: "Parameter jenjang dan mapel wajib disertakan." },
        { status: 400 }
      );
    }

    const sanitizedKey = typeof apiKey === "string" && !apiKey.includes("•••") ? apiKey.trim() : undefined;

    const result = await generateBatchQuestions({
      jenjang: normalizeJenjang(jenjang),
      mapel,
      configId,
      adminId: user.id,
      triggeredBy: "manual_admin",
      forceMock: !!forceMock,
      totalSoal: typeof totalSoal === "number" ? totalSoal : undefined,
      distribusiBentuk,
      distribusiKesulitan,
      customInstruction,
      selectedThemes: Array.isArray(selectedThemes) ? selectedThemes : undefined,
      themeMode: typeof themeMode === "string" ? (themeMode as any) : undefined,
      selectedElements: Array.isArray(selectedElements) ? selectedElements : undefined,
      elementMode: typeof elementMode === "string" ? (elementMode as any) : undefined,
      modelName,
      temperature: typeof temperature === "number" ? temperature : undefined,
      apiKey: sanitizedKey,
      strictSvgMode: typeof strictSvgMode === "boolean" ? strictSvgMode : undefined,
    });

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
