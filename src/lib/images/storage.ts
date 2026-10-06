import fs from "fs";
import path from "path";

/**
 * Menyimpan dataURI gambar (Base64) langsung ke disk server publik (/public/soal-images)
 * dan mengembalikan URL statisnya (https://soal.ayotka.id/soal-images/...)
 * agar database tidak lagi terbebani oleh string Base64 yang besar.
 */
export function saveBase64Image(dataUri: string, prefix = "img-ai"): string {
  try {
    if (!dataUri || !dataUri.startsWith("data:")) {
      return dataUri;
    }

    const outputDir = path.resolve(process.cwd(), "public", "soal-images");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    let ext = "png";
    let base64Content = dataUri;

    const parts = dataUri.split(";base64,");
    if (parts.length === 2) {
      if (parts[0].includes("image/jpeg") || parts[0].includes("image/jpg")) ext = "jpg";
      else if (parts[0].includes("image/webp")) ext = "webp";
      else if (parts[0].includes("image/svg")) ext = "svg";
      base64Content = parts[1];
    }

    const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, Buffer.from(base64Content, "base64"));

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://soal.ayotka.id";
    return `${baseUrl}/soal-images/${fileName}`;
  } catch (err) {
    console.error("[Image Storage] Gagal menyimpan gambar ke file:", err);
    // Fallback bila terjadi error akses file system
    return dataUri;
  }
}
