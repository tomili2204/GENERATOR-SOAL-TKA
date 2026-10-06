import fs from "fs";
import path from "path";
import { Client } from "pg";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://soal.ayotka.id";

function getExtensionFromMime(header: string): string {
  if (header.includes("image/jpeg") || header.includes("image/jpg")) return "jpg";
  if (header.includes("image/webp")) return "webp";
  if (header.includes("image/svg")) return "svg";
  return "png";
}

async function main() {
  console.log("🚀 Memulai proses migrasi gambar soal dari database ke storage server...");

  // Load database URL from env or .env.local
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    if (fs.existsSync(".env.local")) {
      const match = fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.+)$/m);
      if (match) dbUrl = match[1].trim();
    }
  }
  if (!dbUrl) {
    if (fs.existsSync(".env")) {
      const match = fs.readFileSync(".env", "utf8").match(/^DATABASE_URL=(.+)$/m);
      if (match) dbUrl = match[1].trim();
    }
  }

  if (!dbUrl) {
    throw new Error("DATABASE_URL tidak ditemukan di environment atau .env");
  }

  // Ensure output directory exists: public/soal-images
  const outputDir = path.resolve(process.cwd(), "public", "soal-images");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  console.log(`📁 Direktori penyimpanan lokal: ${outputDir}`);

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("✅ Terhubung ke database Supabase.");

  // Hitung berapa soal yang memiliki image_data base64
  const countQuery = await client.query(`
    SELECT count(*) as count 
    FROM "soal"."questions" 
    WHERE payload->'gambar'->>'image_data' IS NOT NULL 
      AND length(payload->'gambar'->>'image_data') > 100;
  `);
  const totalQuestions = parseInt(countQuery.rows[0].count, 10);
  console.log(`📊 Ditemukan ${totalQuestions} soal dengan gambar Base64.`);

  if (totalQuestions === 0) {
    console.log("Semua gambar sudah dimigrasikan ke file server!");
    await client.end();
    return;
  }

  const BATCH_SIZE = 50;
  let processed = 0;
  let totalBytesSaved = 0;

  while (true) {
    const batchRes = await client.query(`
      SELECT id, payload
      FROM "soal"."questions"
      WHERE payload->'gambar'->>'image_data' IS NOT NULL 
        AND length(payload->'gambar'->>'image_data') > 100
      LIMIT ${BATCH_SIZE};
    `);

    if (batchRes.rows.length === 0) break;

    for (const row of batchRes.rows) {
      const qId = row.id;
      const payload = row.payload;
      const rawData = payload?.gambar?.image_data;

      if (!rawData || typeof rawData !== "string") continue;

      let ext = "png";
      let base64Content = rawData;

      if (rawData.startsWith("data:")) {
        const parts = rawData.split(";base64,");
        if (parts.length === 2) {
          ext = getExtensionFromMime(parts[0]);
          base64Content = parts[1];
        }
      }

      const buffer = Buffer.from(base64Content, "base64");
      const safeId = qId.replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `${safeId}.${ext}`;
      const filePath = path.join(outputDir, fileName);

      // Tulis file gambar ke disk
      fs.writeFileSync(filePath, buffer);
      totalBytesSaved += rawData.length;

      // Update payload di database
      const newGambar = {
        ...payload.gambar,
        url: `${BASE_URL}/soal-images/${fileName}`,
      };
      delete newGambar.image_data;

      const newPayload = {
        ...payload,
        gambar: newGambar,
      };

      await client.query(
        `UPDATE "soal"."questions" SET payload = $1 WHERE id = $2;`,
        [JSON.stringify(newPayload), qId]
      );

      processed++;
    }

    const percent = Math.round((processed / totalQuestions) * 100);
    console.log(`⏳ Progress: ${processed}/${totalQuestions} (${percent}%) gambar berhasil dipindahkan.`);
  }

  console.log(`\n🎉 SELESAI! ${processed} gambar berhasil dipindahkan ke file statis.`);
  console.log(`💾 Estimasi penghematan payload: ~${Math.round(totalBytesSaved / (1024 * 1024))} MB.`);

  console.log("\n🧹 Menjalankan VACUUM FULL pada tabel soal.questions untuk membebaskan ruang disk database...");
  try {
    await client.query(`VACUUM FULL "soal"."questions";`);
    console.log("✅ VACUUM FULL berhasil dieksekusi!");
  } catch (err: any) {
    console.warn("Catatan VACUUM:", err.message);
  }

  // Cek ukuran database akhir
  const sizeRes = await client.query(
    "SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;"
  );
  console.log(`\n🔥 UKURAN DATABASE SUPABASE SAAT INI: ${sizeRes.rows[0]?.db_size}`);

  await client.end();
}

main().catch((err) => {
  console.error("Terjadi kesalahan:", err);
  process.exit(1);
});
