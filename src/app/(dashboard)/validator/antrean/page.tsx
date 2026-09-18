import { requireRole, hasRole } from "@/lib/auth/guards";
import { CheckSquare, Shield } from "lucide-react";
import { db } from "@/db";
import { questions, users, stimulus, questionPackages } from "@/db/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import { ValidatorQueueView } from "@/components/validator/ValidatorQueueView";

export const dynamic = "force-dynamic";

export default async function ValidatorAntreanPage() {
  const user = await requireRole("validator_soal", "admin");
  const isAdmin = hasRole(user, "admin");

  // Jika bukan admin, hanya ambil soal dari paket yang ditugaskan kepada validator ini
  let allowedPkgIds: string[] = [];
  if (!isAdmin) {
    const assignedPkgs = await db
      .select({ id: questionPackages.id })
      .from(questionPackages)
      .where(eq(questionPackages.assignedValidatorId, user.id));
    allowedPkgIds = assignedPkgs.map((p: any) => p.id);
  }

  // Ambil soal awal berstatus menunggu_validasi
  let queueRecords: any[] = [];
  if (isAdmin || allowedPkgIds.length > 0) {
    const conditions = [eq(questions.status, "menunggu_validasi")];
    if (!isAdmin) {
      conditions.push(inArray(questions.paketId, allowedPkgIds));
    }

    queueRecords = await db
      .select({
        id: questions.id,
        code: questions.code,
        jenjang: questions.jenjang,
        mapel: questions.mapel,
        elemen: questions.elemen,
        subElemen: questions.subElemen,
        kompetensi: questions.kompetensi,
        levelKognitif: questions.levelKognitif,
        tingkatKesulitan: questions.tingkatKesulitan,
        bentukSoal: questions.bentukSoal,
        jenisSoal: questions.jenisSoal,
        stimulusId: questions.stimulusId,
        sumber: questions.sumber,
        status: questions.status,
        authorId: questions.authorId,
        createdAt: questions.createdAt,
        payload: questions.payload,
        authorName: users.name,
        authorEmail: users.email,
      })
      .from(questions)
      .leftJoin(users, eq(questions.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(questions.createdAt));
  }

  // Ambil data stimulus terkait
  const stimulusIds = Array.from(
    new Set(queueRecords.map((q) => q.stimulusId).filter(Boolean))
  ) as string[];

  let stimulusMap: Record<string, any> = {};
  let groupQuestionsMap: Record<string, any[]> = {};

  if (stimulusIds.length > 0) {
    const stimRecords: any[] = await db
      .select()
      .from(stimulus)
      .where(inArray(stimulus.id, stimulusIds));
    stimRecords.forEach((s: any) => {
      stimulusMap[s.id] = s;
    });

    const siblingQuestions: any[] = await db
      .select({
        id: questions.id,
        code: questions.code,
        bentukSoal: questions.bentukSoal,
        elemen: questions.elemen,
        status: questions.status,
        payload: questions.payload,
        stimulusId: questions.stimulusId,
      })
      .from(questions)
      .where(inArray(questions.stimulusId, stimulusIds));

    siblingQuestions.forEach((sq: any) => {
      if (sq.stimulusId) {
        if (!groupQuestionsMap[sq.stimulusId]) {
          groupQuestionsMap[sq.stimulusId] = [];
        }
        groupQuestionsMap[sq.stimulusId].push(sq);
      }
    });
  }

  const items = queueRecords.map((item) => {
    const isSelf = item.authorId === user.id;
    return {
      ...item,
      isSelfAuthored: isSelf,
      canValidate: !isSelf,
      stimulus: item.stimulusId ? stimulusMap[item.stimulusId] || null : null,
      groupQuestions: item.stimulusId ? groupQuestionsMap[item.stimulusId] || [] : [],
      separationNote: isSelf
        ? "Pemisahan Tugas: Anda adalah pengunggah soal ini. Validasi dilarang oleh backend."
        : "Dapat divalidasi.",
    };
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Utilitarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              MODUL VALIDATOR SOAL
            </span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-medium text-slate-500">Antrean Telaah</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            Antrean Telaah & Validasi Soal TKA
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Telaah kelayakan asesmen butir soal dengan render KaTeX lengkap, periksa keselarasan stimulus grup, dan tetapkan keputusan (Setujui, Tolak, atau Minta Revisi).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600">
          <Shield className="w-3.5 h-3.5 text-indigo-600" />
          <span>Validator: <strong className="font-mono text-slate-800">{user.email}</strong></span>
        </div>
      </div>

      {/* Komponen Antrean Interaktif */}
      <ValidatorQueueView initialItems={items} currentUserId={user.id} />
    </div>
  );
}
