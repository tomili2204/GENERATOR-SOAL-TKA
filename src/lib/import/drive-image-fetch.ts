/**
 * Pengunduh gambar dari tautan bagikan Google Drive untuk impor Excel massal.
 *
 * PERINGATAN KEAMANAN (SSRF): fungsi ini HANYA boleh dipanggil untuk URL yang host-nya
 * sudah lolos `isDriveShareLink` (di dalam allowlist Google). Jangan pernah memakai
 * modul ini untuk mengunduh URL bebas dari sel spreadsheet -- itu akan membuka Server-Side
 * Request Forgery (server bisa dipaksa memanggil alamat internal/arbitrer). Setiap hop
 * redirect diperiksa ulang terhadap allowlist yang sama sebelum diikuti.
 */

const ALLOWED_HOSTS = new Set([
  "drive.google.com",
  "drive.usercontent.google.com",
  "docs.google.com",
  "lh3.googleusercontent.com",
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

const MAGIC_BYTES: Array<{ contentType: string; check: (buf: Buffer) => boolean }> = [
  { contentType: "image/png", check: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { contentType: "image/jpeg", check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { contentType: "image/gif", check: (b) => b.length >= 6 && b.toString("ascii", 0, 6).match(/^GIF8[79]a$/) !== null },
  {
    contentType: "image/webp",
    check: (b) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
];

function detectImageContentType(buf: Buffer): string | null {
  const match = MAGIC_BYTES.find((m) => m.check(buf));
  return match ? match.contentType : null;
}

function isAllowedHost(url: URL): boolean {
  return ALLOWED_HOSTS.has(url.hostname);
}

export function isDriveShareLink(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  return url.protocol === "https:" && isAllowedHost(url);
}

function extractDriveFileId(rawUrl: string): string | null {
  const url = new URL(rawUrl);
  const byId = url.searchParams.get("id");
  if (byId) return byId;
  const match = url.pathname.match(/\/file\/d\/([^/]+)/);
  if (match) return match[1];
  return null;
}

function toDirectDownloadUrl(rawUrl: string): string {
  const fileId = extractDriveFileId(rawUrl);
  if (!fileId) return rawUrl; // format lain (mis. lh3.googleusercontent.com) sudah berupa tautan langsung
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

export type DriveImageResolution = { ok: true; buffer: Buffer; contentType: string } | { ok: false; error: string };

/**
 * Mengunduh satu gambar dari tautan Google Drive dengan validasi ketat: allowlist host
 * diperiksa ulang di setiap hop redirect, batas waktu ~10 detik, batas ukuran 5 MB,
 * dan verifikasi tipe berdasarkan byte awal file (bukan sekadar header Content-Type).
 */
export async function resolveDriveImage(rawUrl: string): Promise<DriveImageResolution> {
  let currentUrl: URL;
  try {
    currentUrl = new URL(toDirectDownloadUrl(rawUrl));
  } catch {
    return { ok: false, error: "Tautan Google Drive tidak valid." };
  }
  if (!isAllowedHost(currentUrl)) {
    return { ok: false, error: "Tautan gambar bukan domain Google Drive yang diizinkan." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let response: Response;
      try {
        response = await fetch(currentUrl.toString(), {
          redirect: "manual",
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; soal-ayotka-importer/1.0)" },
        });
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return { ok: false, error: "Waktu unduh gambar dari Google Drive habis (>10 detik)." };
        }
        return { ok: false, error: `Gagal menghubungi Google Drive: ${err?.message || "kesalahan jaringan"}.` };
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return { ok: false, error: "Google Drive mengarahkan ulang tanpa alamat tujuan yang valid." };
        }
        let nextUrl: URL;
        try {
          nextUrl = new URL(location, currentUrl);
        } catch {
          return { ok: false, error: "Alamat pengalihan Google Drive tidak valid." };
        }
        if (nextUrl.protocol !== "https:" || !isAllowedHost(nextUrl)) {
          return { ok: false, error: `Pengalihan menuju domain di luar Google Drive ditolak (${nextUrl.hostname}).` };
        }
        currentUrl = nextUrl;
        continue;
      }

      if (response.status !== 200) {
        return { ok: false, error: `Google Drive mengembalikan status ${response.status} saat mengunduh gambar.` };
      }

      const contentTypeHeader = (response.headers.get("content-type") || "").toLowerCase();
      if (contentTypeHeader.includes("text/html")) {
        return {
          ok: false,
          error:
            'File Google Drive tidak bisa diunduh otomatis (kemungkinan berupa halaman konfirmasi, bukan gambar langsung). Pastikan file dibagikan sebagai "Siapa saja yang memiliki tautan dapat melihat" dan merupakan file gambar.',
        };
      }

      if (!response.body) {
        return { ok: false, error: "Google Drive tidak mengembalikan isi berkas." };
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > MAX_BYTES) {
            await reader.cancel().catch(() => {});
            return { ok: false, error: "Ukuran gambar dari Google Drive melebihi batas 5 MB." };
          }
          chunks.push(value);
        }
      }
      const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      const detectedType = detectImageContentType(buffer);
      if (!detectedType) {
        return { ok: false, error: "Isi berkas dari Google Drive bukan format gambar yang didukung (PNG/JPEG/GIF/WEBP)." };
      }

      return { ok: true, buffer, contentType: detectedType };
    }
    return { ok: false, error: "Terlalu banyak pengalihan saat mengunduh gambar dari Google Drive." };
  } finally {
    clearTimeout(timeout);
  }
}
