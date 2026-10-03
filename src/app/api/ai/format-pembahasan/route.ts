import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { formatPembahasanWithAi } from "@/lib/generator/pembahasan-formatter";

export const dynamic = "force-dynamic";

// POST /api/ai/format-pembahasan
// Merapikan teks pembahasan bebas buatan manusia menjadi standar rapi AyoTKA
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { pembahasan, soal_text, bentukSoal, kunci_jawaban, opsi, pernyataan } = body;

    if (!pembahasan || typeof pembahasan !== "string" || pembahasan.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Teks pembahasan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const formatted = await formatPembahasanWithAi({
      pembahasan,
      soalText: soal_text,
      bentukSoal,
      kunciJawaban: kunci_jawaban,
      opsi,
      pernyataan,
    });

    return NextResponse.json({
      success: true,
      data: {
        pembahasan: formatted,
      },
    });
  } catch (error: any) {
    console.error("POST /api/ai/format-pembahasan error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal merapikan pembahasan." },
      { status: 500 }
    );
  }
}
