import { db } from '@/db';
import { stimulus, questions } from '@/db/schema';
import { eq, ilike } from 'drizzle-orm';

async function checkKopStims() {
  const stims = await db.select().from(stimulus).where(ilike(stimulus.konten, '%Maju Bersama%'));
  for (const s of stims) {
    const qs = await db.select().from(questions).where(eq(questions.stimulusId, s.id));
    console.log('Stimulus ID:', s.id, 'Paket:', qs[0]?.paketId, 'Mapel:', s.mapel, 'Jenjang:', s.jenjang);
    console.log('Judul:', s.judul);
    console.log('Snippet:', s.konten.substring(0, 120).replace(/\n/g, ' '));
    console.log('Questions linked:', qs.length, qs.map(q => q.code));
  }
  process.exit(0);
}
checkKopStims().catch(console.error);
