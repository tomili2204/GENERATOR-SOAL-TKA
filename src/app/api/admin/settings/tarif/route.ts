import { NextRequest, NextResponse } from "next/server";
import { requireRole, handleApiError } from "@/lib/auth/guards";
import { getTarifSettings, saveTarifSettings, TarifSettings } from "@/lib/tarif-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    const settings = await getTarifSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireRole("admin");
    const body = await req.json();

    const { pembuatan, validasi } = body;

    if (!pembuatan || !validasi) {
      return NextResponse.json(
        { success: false, error: "Data pembuatan dan validasi soal wajib disertakan." },
        { status: 400 }
      );
    }

    const savedSettings = await saveTarifSettings(
      {
        pembuatan: {
          skema: pembuatan.skema === "per_paket" ? "per_paket" : "per_soal",
          nominal: Math.max(0, Number(pembuatan.nominal) || 0),
          catatan: pembuatan.catatan || "",
        },
        validasi: {
          skema: validasi.skema === "per_paket" ? "per_paket" : "per_soal",
          nominal: Math.max(0, Number(validasi.nominal) || 0),
          catatan: validasi.catatan || "",
        },
      },
      {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Konfigurasi besaran biaya (honorarium) berhasil diperbarui!",
      data: savedSettings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
