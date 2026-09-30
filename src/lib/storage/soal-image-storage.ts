import crypto from "crypto";

/**
 * Antarmuka tunggal penyimpanan gambar soal (dipakai oleh impor gambar tertanam Excel
 * dan impor gambar dari tautan Google Drive). Implementasi konkret memakai Vercel Blob;
 * jika BLOB_READ_WRITE_TOKEN belum diisi, upload gagal dengan error yang jelas dan
 * pemanggil (parser impor) wajib menampilkannya sebagai error per baris, bukan meruntuhkan
 * seluruh proses impor.
 */

export class StorageNotConfiguredError extends Error {
  constructor() {
    super("Penyimpanan gambar belum dikonfigurasi (variabel lingkungan BLOB_READ_WRITE_TOKEN belum diisi).");
    this.name = "StorageNotConfiguredError";
  }
}

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function isSupportedImageContentType(contentType: string): boolean {
  return contentType in EXT_BY_CONTENT_TYPE;
}

export interface UploadSoalImageResult {
  url: string;
}

/**
 * Mengunggah buffer gambar ke penyimpanan dan mengembalikan URL publiknya.
 * Nama file berbasis hash konten (sha256) sehingga gambar identik yang diunggah
 * berkali-kali (mis. dipakai ulang di banyak baris/soal) otomatis dedup ke objek yang sama.
 */
export async function uploadSoalImage(buffer: Buffer, contentType: string): Promise<UploadSoalImageResult> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new StorageNotConfiguredError();
  }
  const ext = EXT_BY_CONTENT_TYPE[contentType];
  if (!ext) {
    throw new Error(`Tipe gambar "${contentType}" tidak didukung.`);
  }
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const pathname = `soal-import/${hash}.${ext}`;

  const { put } = await import("@vercel/blob");
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return { url: blob.url };
}
