import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { testGeminiConnection } from "@/lib/generator/gemini-generator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");

    const body = await req.json().catch(() => ({}));
    const { apiKey, modelName } = body;

    // Abaikan jika apiKey berisi string masking (•••)
    const sanitizedKey = typeof apiKey === "string" && !apiKey.includes("•••") ? apiKey.trim() : undefined;

    const testResult = await testGeminiConnection(sanitizedKey, modelName);

    return NextResponse.json({
      success: testResult.success,
      data: testResult,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
