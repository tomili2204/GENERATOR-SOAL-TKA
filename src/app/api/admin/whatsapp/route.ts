import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppDeviceStatus, getWhatsAppQRCode, sendWhatsAppMessage } from "@/lib/notifications/fonnte";

export const dynamic = "force-dynamic";

/**
 * Endpoint Admin untuk Cek Status & QR Gateway WhatsApp (Fonnte)
 */
export async function GET(req: NextRequest) {
  try {
    const status = await getWhatsAppDeviceStatus();
    let qrData = null;

    if (status.deviceStatus === "disconnect" || req.nextUrl.searchParams.get("qr") === "true") {
      qrData = await getWhatsAppQRCode();
    }

    return NextResponse.json({
      status: "success",
      gateway: {
        device: status.device || process.env.WA_TARGET_NUMBER || "Belum terdaftar",
        deviceStatus: status.deviceStatus || "unknown",
        name: status.name || "Bot AyoTKA",
        quota: status.quota || "0",
        targetNumber: process.env.WA_TARGET_NUMBER || "",
      },
      qr: qrData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Test kirim pesan WhatsApp
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const target = body.target || process.env.WA_TARGET_NUMBER;
    const message = body.message || `🧪 *TEST NOTIFIKASI WHATSAPP AYO-TKA*\n\nGateway Fonnte berhasil terhubung dan siap mengirim laporan audit harian.`;

    if (!target) {
      return NextResponse.json({ status: "error", message: "Nomor tujuan tidak ditemukan" }, { status: 400 });
    }

    const result = await sendWhatsAppMessage({ target, message });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
