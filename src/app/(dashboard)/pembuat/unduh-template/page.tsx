import { requireRole, hasRole } from "@/lib/auth/guards";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isTemplateAvailable } from "@/lib/import/kompetensi-referensi";
import { UnduhTemplateGrid, TemplateComboOption } from "@/components/pembuat/UnduhTemplateGrid";

export const dynamic = "force-dynamic";

const SEMUA_JENJANG = ["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"];
const SEMUA_MAPEL = ["Matematika", "Bahasa Indonesia"];

export default async function UnduhTemplatePage() {
  const user = await requireRole("pembuat_soal", "admin");

  let jenjangList: string[] = SEMUA_JENJANG;
  let mapelList: string[] = SEMUA_MAPEL;

  if (!hasRole(user, "admin")) {
    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    jenjangList = ((dbUser?.assignedJenjang as string[] | undefined) || []).filter((j) => SEMUA_JENJANG.includes(j));
    mapelList = ((dbUser?.assignedMapel as string[] | undefined) || []).filter((m) => SEMUA_MAPEL.includes(m));
  }

  const combos: TemplateComboOption[] = [];
  for (const jenjang of jenjangList) {
    for (const mapel of mapelList) {
      combos.push({ jenjang, mapel, available: isTemplateAvailable(jenjang, mapel) });
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Unduh Format Soal</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pilih jenjang dan mata pelajaran untuk mengunduh template impor massal soal (.xlsx). Hanya kombinasi yang
          ditugaskan kepada Anda yang ditampilkan.
        </p>
      </div>

      {combos.length === 0 ? (
        <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          Anda belum ditugaskan ke jenjang/mata pelajaran apa pun. Hubungi Admin untuk penugasan.
        </div>
      ) : (
        <UnduhTemplateGrid combos={combos} />
      )}
    </div>
  );
}
