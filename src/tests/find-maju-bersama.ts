import { db } from '@/db';
import { stimulus, questions } from '@/db/schema';
import { ilike } from 'drizzle-orm';

async function findMajuBersama() {
  const stims = await db.select().from(stimulus).where(ilike(stimulus.konten, '%Maju Bersama%'));
  console.log('Stimulus count with Maju Bersama:', stims.length);
  for (const s of stims) {
    console.log('Stimulus ID:', s.id, 'Judul:', s.judul, 'Jenjang:', s.jenjang, 'Mapel:', s.mapel, 'Created:', s.createdAt);
    console.log('Konten:', s.konten);
    const relatedQs = await db.select().from(questions).where(ilike(questions.stimulusId, s.id));
    console.log('Related questions count:', relatedQs.length);
    for (const q of relatedQs) {
      console.log('  Q Code:', q.code, 'Paket:', q.paketId, 'Text:', q.soalText.substring(0, 80));
    }
  }

  // Also check all stimuli containing  Koperasi
  const allKop = await db.select().from(stimulus).where(ilike(stimulus.konten, '%koperasi%'));
  console.log('\nTotal stimuli containing koperasi:', allKop.length);
  for (const k of allKop) {
    console.log('ID:', k.id, 'Mapel:', k.mapel, 'Jenjang:', k.jenjang, 'Judul:', k.judul, 'Snippet:', k.konten.substring(0, 100).replace(/\n/g, ' '));
  }
  process.exit(0);
}
findMajuBersama().catch(console.error);
