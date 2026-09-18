import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { db, ensureTablesCreated } from "@/db";
import { generationLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("admin");
    await ensureTablesCreated();

    const logs = await db
      .select()
      .from(generationLogs)
      .orderBy(desc(generationLogs.startedAt))
      .limit(50);

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
