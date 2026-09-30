import { requireRole } from "@/lib/auth/guards";
import { ensureTablesCreated } from "@/db";
import { getBiayaAiData } from "@/lib/biaya-ai";
import BiayaAiView from "./BiayaAiView";

export const dynamic = "force-dynamic";

export default async function AdminBiayaAiPage() {
  await requireRole("admin");
  await ensureTablesCreated();

  const initialData = await getBiayaAiData();

  return <BiayaAiView initialData={initialData} />;
}
