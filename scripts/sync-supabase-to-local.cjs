const { Client } = require('pg');

const SOURCE_URL = 'postgresql://postgres.pyqeqhvouysotijhkhdg:Tomilist2026%21%21%21%21@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
const TARGET_URL = 'postgresql://postgres:194103abacd2617d9f62ca6650164516256083fa9da9aa18@127.0.0.1:5432/postgres';

const TABLES = [
  { name: 'users', pk: 'id' },
  { name: 'user_roles', pk: 'id' },
  { name: 'fixed_taxonomies', pk: 'id' },
  { name: 'generator_configs', pk: 'id' },
  { name: 'system_settings', pk: 'key' },
  { name: 'tema_konteks_pool', pk: 'id' },
  { name: 'stimulus', pk: 'id' },
  { name: 'question_packages', pk: 'id' },
  { name: 'questions', pk: 'id' },
  { name: 'validation_logs', pk: 'id' },
  { name: 'generation_logs', pk: 'id' },
  { name: 'honorarium_records', pk: 'id' },
  { name: 'audit_logs', pk: 'id' },
];

async function syncTable(srcClient, tgtClient, tableName, pkCol) {
  console.log(`\n--- Memproses tabel: soal.${tableName} ---`);
  
  // 1. Ambil data dari Source (Supabase)
  const srcRes = await srcClient.query(`SELECT * FROM soal."${tableName}"`);
  const totalRows = srcRes.rows.length;
  console.log(`[Source Supabase] Ditemukan ${totalRows} baris`);

  if (totalRows === 0) {
    console.log(`Tabel kosong di source, dilewati.`);
    return;
  }

  // 2. Dapatkan kolom dan tipe data yang ada di Target
  const tgtColsRes = await tgtClient.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'soal' AND table_name = $1
  `, [tableName]);
  const colTypeMap = new Map(tgtColsRes.rows.map(r => [r.column_name, r.data_type]));

  // Ambil irisan kolom antara Source dan Target
  const firstRow = srcRes.rows[0];
  const commonCols = Object.keys(firstRow).filter(col => colTypeMap.has(col));

  if (!commonCols.includes(pkCol)) {
    throw new Error(`Primary key ${pkCol} tidak ditemukan di tabel target ${tableName}`);
  }

  const updateCols = commonCols.filter(col => col !== pkCol);

  // Buat query upsert template
  const colListStr = commonCols.map(c => `"${c}"`).join(', ');
  const updateListStr = updateCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');

  // 3. Eksekusi batching
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < totalRows; i += BATCH_SIZE) {
    const batch = srcRes.rows.slice(i, i + BATCH_SIZE);
    
    await tgtClient.query('BEGIN');
    try {
      for (const row of batch) {
        const values = commonCols.map(c => {
          let val = row[c];
          const type = colTypeMap.get(c);
          if ((type === 'jsonb' || type === 'json') && val !== null && val !== undefined) {
            if (typeof val === 'object') {
              return JSON.stringify(val);
            }
          }
          return val;
        });

        const placeholders = commonCols.map((_, idx) => `$${idx + 1}`).join(', ');
        
        let upsertQuery = `
          INSERT INTO soal."${tableName}" (${colListStr})
          VALUES (${placeholders})
          ON CONFLICT ("${pkCol}") DO UPDATE SET ${updateListStr};
        `;
        
        if (updateCols.length === 0) {
          upsertQuery = `
            INSERT INTO soal."${tableName}" (${colListStr})
            VALUES (${placeholders})
            ON CONFLICT ("${pkCol}") DO NOTHING;
          `;
        }

        await tgtClient.query(upsertQuery, values);
        inserted++;
      }
      await tgtClient.query('COMMIT');
    } catch (err) {
      await tgtClient.query('ROLLBACK');
      throw err;
    }

    if (totalRows > 100 && (inserted % 500 === 0 || inserted === totalRows)) {
      process.stdout.write(` Progress: ${inserted}/${totalRows} (${Math.round((inserted / totalRows) * 100)}%)\r`);
    }
  }

  // 4. Verifikasi jumlah di target
  const tgtCheck = await tgtClient.query(`SELECT count(*) FROM soal."${tableName}"`);
  console.log(`\n✓ Selesai: soal.${tableName} sekarang berisi ${tgtCheck.rows[0].count} baris di database lokal VPS.`);
}

async function main() {
  console.log('====================================================');
  console.log('🚀 MEMULAI SINKRONISASI LENGKAP CLOUD SUPABASE -> VPS AYOTKA-DB');
  console.log('====================================================');

  const srcClient = new Client({ connectionString: SOURCE_URL, ssl: { rejectUnauthorized: false } });
  const tgtClient = new Client({ connectionString: TARGET_URL });

  await srcClient.connect();
  console.log('✓ Terhubung ke Cloud Supabase (Source)');

  await tgtClient.connect();
  console.log('✓ Terhubung ke Local VPS ayotka-db (Target)');

  for (const t of TABLES) {
    await syncTable(srcClient, tgtClient, t.name, t.pk);
  }

  console.log('\n====================================================');
  console.log('🎉 SINKRONISASI SEMUA TABEL SUKSES 100%!');
  console.log('====================================================');

  await srcClient.end();
  await tgtClient.end();
}

main().catch(err => {
  console.error('\n❌ ERROR saat sinkronisasi:', err);
  process.exit(1);
});
