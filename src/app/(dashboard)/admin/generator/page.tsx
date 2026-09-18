import { requireRole } from "@/lib/auth/guards";
import { Cpu, Sparkles } from "lucide-react";
import { db, ensureTablesCreated } from "@/db";
import { generatorConfigs, generationLogs, GeneratorConfig, GenerationLog, temaKonteksPool, TemaKonteksPoolItem } from "@/db/schema";
import { desc, asc } from "drizzle-orm";
import { ensureThemesSeeded } from "@/lib/generator/seed-themes";
import { GeneratorDashboardClient, GeneratorConfigItem } from "./GeneratorDashboardClient";
import { GenerationLogItem } from "./GenerationLogsTable";

export const dynamic = "force-dynamic";

export default async function AdminGeneratorPage() {
  await requireRole("admin");
  await ensureTablesCreated();
  await ensureThemesSeeded();

  const themes: TemaKonteksPoolItem[] = await db
    .select()
    .from(temaKonteksPool)
    .orderBy(asc(temaKonteksPool.namaTema));

  const configsRaw: GeneratorConfig[] = await db.select().from(generatorConfigs);
  const configs: GeneratorConfigItem[] = configsRaw.map((c) => ({
    id: c.id,
    jenjang: c.jenjang,
    mapel: c.mapel,
    isAutoActive: c.isAutoActive,
    dailyTargetQuota: c.dailyTargetQuota,
  }));

  const logsRaw: GenerationLog[] = await db
    .select()
    .from(generationLogs)
    .orderBy(desc(generationLogs.startedAt))
    .limit(30);

  const logs: GenerationLogItem[] = logsRaw.map((l: GenerationLog) => ({
    id: l.id,
    configId: l.configId,
    jenjang: l.jenjang,
    mapel: l.mapel,
    packageId: l.packageId,
    packageCode: l.packageCode,
    status: l.status as any,
    totalDiminta: l.totalDiminta,
    totalDiterima: l.totalDiterima,
    totalLolos: l.totalLolos,
    totalGagal: l.totalGagal,
    detailPemeriksaan: l.detailPemeriksaan as any,
    errorMessage: l.errorMessage,
    triggeredBy: l.triggeredBy,
    temaKonteks: l.temaKonteks,
    distribusiTema: l.distribusiTema as any,
    startedAt: l.startedAt,
    completedAt: l.completedAt,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-mono mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Generator AI Standar BSKAP No. 45/2025 & No. 47/2025
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Pusat Kendali Generator Soal AI
            </h1>
            <p className="text-indigo-200 text-sm mt-1 max-w-2xl leading-relaxed">
              Studio pembuatan paket soal TKA on-demand, pengaturan fleksibel API Key Google Gemini & varian model LLM, serta kontrol jadwal pipeline harian.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10 text-right">
              <span className="text-[11px] font-mono text-indigo-300 block uppercase">Mesin LLM</span>
              <span className="text-sm font-bold font-mono text-white flex items-center gap-1.5 justify-end mt-0.5">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Google Gemini API
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Client Dashboard Component with Tabs */}
      <GeneratorDashboardClient initialConfigs={configs} initialLogs={logs} initialThemes={themes} />
    </div>
  );
}
