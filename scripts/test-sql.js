const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');

async function test() {
  const dir = path.join(process.cwd(), '.data', 'test_pg');
  const pid = path.join(dir, 'postmaster.pid');
  if (fs.existsSync(pid)) fs.unlinkSync(pid);

  const client = new PGlite(dir);
  console.log('PGlite instance created');
  const res = await client.query('SELECT 1 as test');
  console.log('Query result:', res.rows);
  await client.close();
}

test().catch(console.error);
