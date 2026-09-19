import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
  const cols = await db.execute(sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'soal' AND table_name = 'question_packages'`);
  console.log("COLUMNS:", cols.rows.map((r: any) => r.column_name));
  process.exit(0);
}

main().catch(console.error);
