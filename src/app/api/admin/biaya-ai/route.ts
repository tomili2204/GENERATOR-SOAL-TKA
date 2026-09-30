import { NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { getBiayaAiData } from "@/lib/biaya-ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    const data = await getBiayaAiData();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
