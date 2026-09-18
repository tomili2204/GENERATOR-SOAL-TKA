import { requireRole } from "@/lib/auth/guards";
import { PlaceholderCard } from "@/components/ui/PlaceholderCard";
import { FileQuestion } from "lucide-react";
import { db } from "@/db";
import { questions, Question, users, questionPackages, stimulus } from "@/db/schema";
import { desc } from "drizzle-orm";
import { AdminAllSoalTableView } from "./AdminAllSoalTableView";

export default async function AdminAllSoalPage() {
  await requireRole("admin");

  // Fetch all questions with sorting and related references
  const [allQuestions, allUsers, allPackages, allStimuli] = await Promise.all([
    db.select().from(questions).orderBy(desc(questions.createdAt)),
    db.select({ id: users.id, name: users.name, email: users.email }).from(users),
    db.select({ id: questionPackages.id, code: questionPackages.code, nama: questionPackages.nama }).from(questionPackages),
    db.select({ id: stimulus.id, tipe: stimulus.tipe, konten: stimulus.konten }).from(stimulus),
  ]);

  // Construct lookup maps for fast access
  const usersMap: Record<string, { name: string; email: string }> = {};
  allUsers.forEach((u: { id: string; name: string; email: string }) => {
    usersMap[u.id] = { name: u.name, email: u.email };
  });

  const packagesMap: Record<string, { code: string; nama: string }> = {};
  allPackages.forEach((p: { id: string; code: string; nama: string }) => {
    packagesMap[p.id] = { code: p.code, nama: p.nama };
  });

  const stimuliMap: Record<string, { tipe: string; konten: string }> = {};
  allStimuli.forEach((s: { id: string; tipe: string; konten: string }) => {
    stimuliMap[s.id] = { tipe: s.tipe, konten: s.konten };
  });

  return (
    <PlaceholderCard
      title="Semua Soal & Paket Asesmen"
      category="Administrator"
      requiredRole="admin"
      icon={FileQuestion}
      description="Tampilan menyeluruh seluruh bank soal AyoTKA lintas jenjang (SD/SMP), mata pelajaran (Matematika/Bahasa Indonesia), dan lintas status (Draft, Menunggu Validasi, Disetujui, Perlu Revisi, Ditolak)."
      backendEnforcementNote="Hanya akun Administrator yang dapat melihat seluruh soal tanpa batasan kepemilikan author. Pembuat Soal dibatasi hanya melihat soal buatannya sendiri di level backend."
    >
      <AdminAllSoalTableView
        questions={allQuestions}
        usersMap={usersMap}
        packagesMap={packagesMap}
        stimuliMap={stimuliMap}
      />
    </PlaceholderCard>
  );
}
