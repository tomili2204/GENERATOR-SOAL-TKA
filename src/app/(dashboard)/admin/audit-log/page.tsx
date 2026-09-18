import { requireRole } from "@/lib/auth/guards";
import { PlaceholderCard } from "@/components/ui/PlaceholderCard";
import { ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { auditLogs, validationLogs, generationLogs, users, AuditLog, ValidationLog, GenerationLog } from "@/db/schema";
import { desc } from "drizzle-orm";
import { AuditLogTableView } from "./AuditLogTableView";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogPage() {
  await requireRole("admin");

  // 1. Ambil data log audit aktivitas sistem
  const aLogs: AuditLog[] = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(500);

  // 2. Ambil data log telaah validasi soal (Fase 3 Append-Only)
  const vLogs: ValidationLog[] = await db
    .select()
    .from(validationLogs)
    .orderBy(desc(validationLogs.createdAt))
    .limit(500);

  // 3. Ambil data log eksekusi generator AI (Fase 4 Pipeline)
  const gLogs: GenerationLog[] = await db
    .select()
    .from(generationLogs)
    .orderBy(desc(generationLogs.startedAt))
    .limit(500);

  // 4. Ambil mapping nama pengguna
  const usersList = await db.select({ id: users.id, name: users.name }).from(users);
  const usersMap: Record<string, string> = Object.fromEntries(
    usersList.map((u: { id: string; name: string }) => [u.id, u.name])
  );

  return (
    <PlaceholderCard
      title="Pusat Log Aktivitas & Audit Sistem"
      category="Administrator"
      requiredRole="admin"
      icon={ShieldCheck}
      description="Rekaman transparan seluruh aktivitas sistem AyoTKA. Memuat riwayat keputusan telaah validator (append-only), log proses eksekusi generator AI harian, serta jejak audit sistem."
      backendEnforcementNote="Log audit bersifat permanen dan hanya dapat diakses oleh Administrator. Dilengkapi filter tanggal, jenjang/mapel, serta pengguna."
    >
      <AuditLogTableView
        initialAuditLogs={aLogs}
        initialValidationLogs={vLogs}
        initialGenerationLogs={gLogs}
        usersMap={usersMap}
      />
    </PlaceholderCard>
  );
}
