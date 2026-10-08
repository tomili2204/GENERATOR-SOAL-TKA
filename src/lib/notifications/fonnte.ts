/**
 * Layanan Notifikasi WhatsApp via Fonnte API Gateway
 * Dokumentasi API: https://docs.fonnte.com
 */

export interface FonnteSendOptions {
  target: string;       // Nomor WA tujuan (contoh: '08123456789' atau '628123456789' atau grup 'xxx@g.us')
  message: string;      // Teks pesan (mendukung format WhatsApp: *tebal*, _miring_, ~coret~, ```mono```)
  url?: string;         // Opsional tautan dokumen/gambar
  filename?: string;    // Nama file jika melampirkan media
}

export interface FonnteSendResult {
  success: boolean;
  message?: string;
  detail?: any;
}

/**
 * Mengirim pesan WhatsApp via Fonnte API
 */
export async function sendWhatsAppMessage(options: FonnteSendOptions): Promise<FonnteSendResult> {
  const token = process.env.FONNTE_TOKEN || process.env.WA_GATEWAY_TOKEN;
  const targetNumber = options.target || process.env.WA_TARGET_NUMBER;

  if (!token) {
    console.warn("[Fonnte] Gagal mengirim: FONNTE_TOKEN belum diatur dalam environment variables.");
    return {
      success: false,
      message: "FONNTE_TOKEN belum diatur di environment variable.",
    };
  }

  if (!targetNumber) {
    console.warn("[Fonnte] Gagal mengirim: Nomor tujuan belum ditentukan.");
    return {
      success: false,
      message: "Nomor tujuan WhatsApp belum diatur.",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("target", targetNumber);
    formData.append("message", options.message);
    formData.append("countryCode", "62"); // Default kode negara Indonesia

    if (options.url) {
      formData.append("url", options.url);
      if (options.filename) formData.append("filename", options.filename);
    }

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.status) {
      console.log(`[Fonnte] Pesan WA berhasil dikirim ke ${targetNumber}`);
      return {
        success: true,
        message: "Pesan berhasil dikirim.",
        detail: data,
      };
    } else {
      console.error("[Fonnte] Respons error dari Fonnte:", data);
      return {
        success: false,
        message: data.reason || data.message || "Gagal mengirim pesan via Fonnte.",
        detail: data,
      };
    }
  } catch (error: any) {
    console.error("[Fonnte] Gagal menghubungi server Fonnte:", error);
    return {
      success: false,
      message: error?.message || "Terjadi kesalahan koneksi ke Fonnte.",
    };
  }
}

/**
 * Memeriksa status koneksi device WhatsApp di Fonnte
 */
export async function getWhatsAppDeviceStatus(): Promise<{
  success: boolean;
  device?: string;
  deviceStatus?: "connect" | "disconnect" | string;
  name?: string;
  quota?: string;
  message?: string;
  raw?: any;
}> {
  const token = process.env.FONNTE_TOKEN || process.env.WA_GATEWAY_TOKEN;
  if (!token) {
    return { success: false, message: "FONNTE_TOKEN belum diatur." };
  }

  try {
    const res = await fetch("https://api.fonnte.com/device", {
      method: "POST",
      headers: { Authorization: token },
    });
    const data = await res.json();
    return {
      success: !!data.status,
      device: data.device,
      deviceStatus: data.device_status,
      name: data.name,
      quota: data.quota,
      raw: data,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Gagal memeriksa status device Fonnte.",
    };
  }
}

/**
 * Mengambil QR Code untuk login/reconnect device WhatsApp Fonnte (base64 PNG)
 */
export async function getWhatsAppQRCode(): Promise<{
  success: boolean;
  connected?: boolean;
  qrBase64?: string;
  message?: string;
}> {
  const token = process.env.FONNTE_TOKEN || process.env.WA_GATEWAY_TOKEN;
  if (!token) {
    return { success: false, message: "FONNTE_TOKEN belum diatur." };
  }

  try {
    const res = await fetch("https://api.fonnte.com/qr", {
      method: "POST",
      headers: { Authorization: token },
    });
    const data = await res.json();
    return {
      success: !!data.status,
      connected: data.connected,
      qrBase64: data.url, // Base64 image
      message: data.message,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Gagal mengambil QR Code Fonnte.",
    };
  }
}
