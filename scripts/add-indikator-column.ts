import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[match[1].trim()] = val;
    }
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Adding column 'indikator' to soal.questions...");
  await pool.query("ALTER TABLE soal.questions ADD COLUMN IF NOT EXISTS indikator TEXT;");
  
  const check = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'soal' AND table_name = 'questions' AND column_name = 'indikator';"
  );
  console.log("Column check:", check.rows);
  await pool.end();
}

main().catch(console.error);
