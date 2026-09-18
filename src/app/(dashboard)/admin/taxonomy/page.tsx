import { requireRole } from "@/lib/auth/guards";
import { PlaceholderCard } from "@/components/ui/PlaceholderCard";
import { Bookmark } from "lucide-react";
import { db, ensureTablesCreated } from "@/db";
import { fixedTaxonomies, FixedTaxonomy, temaKonteksPool, TemaKonteksPoolItem } from "@/db/schema";
import { asc } from "drizzle-orm";
import { AdminTaxonomyTabsClient } from "@/components/admin/AdminTaxonomyTabsClient";
import { ensureThemesSeeded } from "@/lib/generator/seed-themes";

export const dynamic = "force-dynamic";

export default async function AdminTaxonomyPage() {
  await requireRole("admin");
  await ensureTablesCreated();
  await ensureThemesSeeded();

  const taxonomies: FixedTaxonomy[] = await db
    .select()
    .from(fixedTaxonomies)
    .orderBy(asc(fixedTaxonomies.category), asc(fixedTaxonomies.sortOrder), asc(fixedTaxonomies.name));

  const themes: TemaKonteksPoolItem[] = await db
    .select()
    .from(temaKonteksPool)
    .orderBy(asc(temaKonteksPool.namaTema));

  return (
    <PlaceholderCard
      title="Manajemen Nilai Tetap & Taksonomi Kurikulum"
      category="Administrator"
      requiredRole="admin"
      icon={Bookmark}
      description="Kelola standar nilai tetap mencakup Mata Pelajaran (Mapel) dan Elemen Materi Kurikulum resmi Kemendikdasmen, serta kelola Pool Tema Konteks untuk variasi latar cerita generator AI."
      backendEnforcementNote="Perubahan nilai tetap dan pool tema konteks hanya dapat dilakukan oleh akun dengan peran 'admin'. Pembuat dan Validator soal membaca referensi ini secara dinamis."
    >
      <AdminTaxonomyTabsClient initialTaxonomies={taxonomies} initialThemes={themes} />
    </PlaceholderCard>
  );
}

