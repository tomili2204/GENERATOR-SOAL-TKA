import { db } from '@/db';
import { questions } from '@/db/schema';
import { sql } from 'drizzle-orm';

async function checkQuestionsTimeline() {
  const qs = await db.execute(sql\
    SELECT id, code, jenjang, mapel, paket_id, status, created_at
    FROM questions
    ORDER BY created_at ASC
  \);
  console.log('Total questions in DB:', qs.rows.length);
  
  // Group by paket_id
  const byPkg: Record<string, number> = {};
  for (const r of qs.rows) {
    const pkg = r.paket_id || 'NO_PKG';
    byPkg[pkg] = (byPkg[pkg] || 0) + 1;
  }
  console.log('Question count by paket_id:');
  for (const [p, c] of Object.entries(byPkg)) {
    console.log(p, ':', c);
  }
  process.exit(0);
}
checkQuestionsTimeline().catch(console.error);
