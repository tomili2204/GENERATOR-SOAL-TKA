import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { questions, stimulus } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import {
  getTutorChatResponse,
  TutorSoalContext,
  TutorChatMessage,
} from "@/lib/ai/tutor-service";

export const dynamic = "force-dynamic";

// Header CORS agar bisa dipanggil dari portal siswa ayotka.id maupun ai.ayotka.id
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// POST /api/ai/tutor/chat
// Menerima pertanyaan siswa dan mengembalikan bimbingan Tutor AI
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { soalId, soalContext, messages, jawaban_siswa } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pesan obrolan (messages) tidak boleh kosong." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Susun konteks soal: Dari payload langsung ATAU tarik otomatis dari database
    let resolvedContext: TutorSoalContext = soalContext || {};

    if (soalId && (!resolvedContext.soal_text || !resolvedContext.pembahasan)) {
      try {
        const qRows = await db
          .select()
          .from(questions)
          .where(or(eq(questions.id, soalId), eq(questions.code, soalId)))
          .limit(1);

        if (qRows.length > 0) {
          const q = qRows[0];
          const payload = (q.payload || {}) as any;

          let stimulusText = "";
          if (q.stimulusId) {
            const stimRows = await db
              .select()
              .from(stimulus)
              .where(eq(stimulus.id, q.stimulusId))
              .limit(1);
            if (stimRows.length > 0) {
              stimulusText = stimRows[0].konten;
            }
          }

          resolvedContext = {
            soalId: q.id,
            jenjang: q.jenjang,
            mapel: q.mapel,
            stimulus: stimulusText || resolvedContext.stimulus,
            soal_text: payload.soal_text || resolvedContext.soal_text,
            opsi: payload.opsi || resolvedContext.opsi,
            kunci_jawaban: payload.kunci_jawaban || resolvedContext.kunci_jawaban,
            pembahasan: payload.pembahasan || resolvedContext.pembahasan,
            jawaban_siswa: jawaban_siswa || resolvedContext.jawaban_siswa,
          };
        }
      } catch (dbErr) {
        console.warn("Peringatan: Gagal menarik soalId dari database, lanjut dengan konteks yang ada:", dbErr);
      }
    } else if (jawaban_siswa && !resolvedContext.jawaban_siswa) {
      resolvedContext.jawaban_siswa = jawaban_siswa;
    }

    // 2. Format pesan (termasuk gambar & dokumen jika ada)
    const cleanMessages: TutorChatMessage[] = messages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || ""),
      images: Array.isArray(m.images) ? m.images : undefined,
      documents: Array.isArray(m.documents) ? m.documents : undefined,
    }));

    // 3. Panggil Tutor AI (Multi-Provider Combo dengan fallback otomatis)
    const { reply } = await getTutorChatResponse({
      context: resolvedContext,
      messages: cleanMessages,
    });

    return NextResponse.json(
      {
        success: true,
        reply,
        modelUsed: "AyoTKA Tutor AI",
        data: {
          reply,
          model: "AyoTKA Tutor AI",
          soalId: resolvedContext.soalId || soalId || null,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("POST /api/ai/tutor/chat error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Terjadi kesalahan internal pada layanan Tutor AI.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
