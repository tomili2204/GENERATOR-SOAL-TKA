import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import path from "path";
import fs from "fs";
import * as schema from "./schema";
import { ensureThemesSeeded } from "@/lib/generator/seed-themes";

const globalForDb = globalThis as unknown as {
  dbInstance?: any;
  pgliteClient?: PGlite;
  pgPool?: Pool;
  tablesInitialized?: boolean;
};

function getPgliteInstance(): PGlite {
  if (globalForDb.pgliteClient) return globalForDb.pgliteClient;
  const dataDir = path.join(process.cwd(), ".data", "soal_ayotka_pg");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const pidFile = path.join(dataDir, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {}
  }
  globalForDb.pgliteClient = new PGlite(dataDir);
  return globalForDb.pgliteClient;
}

export function getDb() {
  if (globalForDb.dbInstance) return globalForDb.dbInstance;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim() !== "") {
    if (!globalForDb.pgPool) {
      globalForDb.pgPool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 5,
        connectionTimeoutMillis: 10000,
      });
      // Koneksi idle ke Supabase pooler sesekali diputus paksa oleh server (ECONNRESET).
      // Tanpa listener ini, error tersebut jadi unhandled 'error' event dan mem-crash
      // seluruh proses Node — bukan hanya query yang sedang berjalan.
      globalForDb.pgPool.on("error", (err) => {
        console.warn("[DB Pool] Koneksi idle terputus, akan dibuat ulang otomatis:", err.message);
      });
    }
    globalForDb.dbInstance = drizzlePg(globalForDb.pgPool, { schema });
    return globalForDb.dbInstance;
  }

  // Fallback lokal tanpa butuh docker/server: PGlite (PostgreSQL 16 WASM in Node.js)
  const client = getPgliteInstance();
  globalForDb.dbInstance = drizzlePglite(client, { schema });
  return globalForDb.dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    const instance = getDb();
    return (instance as any)[prop];
  },
});

// Helper untuk inisialisasi tabel secara otomatis saat aplikasi pertama kali berjalan
export async function ensureTablesCreated() {
  if (globalForDb.tablesInitialized) return;
  globalForDb.tablesInitialized = true;

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.trim() !== "") {
    return;
  }

  const incrementalSql = `
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS tema_konteks TEXT;
    ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS tema_konteks TEXT;
    ALTER TABLE generation_logs ADD COLUMN IF NOT EXISTS distribusi_tema JSONB DEFAULT '{}'::jsonb;

    CREATE TABLE IF NOT EXISTS tema_konteks_pool (
      id TEXT PRIMARY KEY,
      nama_tema TEXT NOT NULL,
      sub_konteks JSONB DEFAULT '[]'::jsonb NOT NULL,
      jenjang_cocok JSONB DEFAULT '["SD/MI","SMP/MTs","SMA/MA","SMK/MAK"]'::jsonb NOT NULL,
      aktif BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    ALTER TABLE tema_konteks_pool ADD COLUMN IF NOT EXISTS jenjang_cocok JSONB DEFAULT '["SD/MI","SMP/MTs","SMA/MA","SMK/MAK"]'::jsonb NOT NULL;

    ALTER TABLE questions ADD COLUMN IF NOT EXISTS previous_payload JSONB;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS previous_validation_notes TEXT;
  `;

  const dataDir = path.join(process.cwd(), ".data", "soal_ayotka_pg");

  // Jika direktori basis data sudah berisi data postgresql, jalankan hanya incremental migration
  if (fs.existsSync(path.join(dataDir, "base"))) {
    try {
      if (databaseUrl && databaseUrl.trim() !== "") {
        if (!globalForDb.pgPool) {
          globalForDb.pgPool = new Pool({
            connectionString: databaseUrl,
            ssl: { rejectUnauthorized: false },
            max: 10,
            connectionTimeoutMillis: 10000,
          });
          globalForDb.pgPool.on("error", (err) => {
            console.warn("[DB Pool] Koneksi idle terputus, akan dibuat ulang otomatis:", err.message);
          });
          globalForDb.pgPool.on("connect", (client) => {
            client.query("SET search_path TO soal, public;");
          });
        }
        await globalForDb.pgPool.query("CREATE SCHEMA IF NOT EXISTS soal; SET search_path TO soal, public;");
        await globalForDb.pgPool.query(incrementalSql);
      } else {
        const client = getPgliteInstance();
        await client.exec(incrementalSql);
      }
      await ensureThemesSeeded();
    } catch (err) {
      console.warn("Incremental migration notice:", err);
    }
    return;
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;

    const createTablesSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS generator_configs (
      id TEXT PRIMARY KEY,
      jenjang TEXT NOT NULL,
      mapel TEXT NOT NULL,
      is_auto_active BOOLEAN DEFAULT FALSE NOT NULL,
      daily_target_quota INTEGER DEFAULT 20 NOT NULL,
      config JSONB DEFAULT '{}'::jsonb NOT NULL,
      updated_by TEXT REFERENCES users(id),
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fixed_taxonomies (
      id TEXT PRIMARY KEY,
      jenjang TEXT NOT NULL,
      mapel TEXT NOT NULL,
      category TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
      sort_order INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    ALTER TABLE fixed_taxonomies ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE fixed_taxonomies ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
    ALTER TABLE fixed_taxonomies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS stimulus (
      id TEXT PRIMARY KEY,
      jenjang TEXT NOT NULL,
      mapel TEXT NOT NULL,
      tipe TEXT NOT NULL,
      judul TEXT DEFAULT 'Stimulus' NOT NULL,
      konten TEXT NOT NULL,
      jumlah_kata INTEGER,
      dibuat_oleh TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS question_packages (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      nama TEXT NOT NULL,
      jenjang TEXT NOT NULL,
      mapel TEXT NOT NULL,
      tipe_sumber TEXT DEFAULT 'manual' NOT NULL,
      author_id TEXT REFERENCES users(id),
      tanggal_generate TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      jumlah_soal INTEGER DEFAULT 30 NOT NULL,
      distribusi_bentuk_soal JSONB DEFAULT '{}'::jsonb NOT NULL,
      distribusi_kesulitan JSONB DEFAULT '{}'::jsonb NOT NULL,
      status TEXT DEFAULT 'draft' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    ALTER TABLE question_packages ADD COLUMN IF NOT EXISTS code TEXT;
    ALTER TABLE question_packages ADD COLUMN IF NOT EXISTS nama TEXT;
    ALTER TABLE question_packages ADD COLUMN IF NOT EXISTS tipe_sumber TEXT DEFAULT 'manual';
    ALTER TABLE question_packages ADD COLUMN IF NOT EXISTS author_id TEXT;

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      nomor_urut INTEGER,
      jenjang TEXT NOT NULL,
      mapel TEXT NOT NULL,
      elemen TEXT NOT NULL,
      sub_elemen TEXT,
      kompetensi TEXT,
      level_kognitif TEXT,
      tingkat_kesulitan TEXT,
      bentuk_soal TEXT DEFAULT 'PG' NOT NULL,
      jenis_soal TEXT DEFAULT 'tunggal' NOT NULL,
      stimulus_id TEXT REFERENCES stimulus(id),
      paket_id TEXT REFERENCES question_packages(id),
      sumber TEXT DEFAULT 'manual_upload' NOT NULL,
      status TEXT DEFAULT 'menunggu_validasi' NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id),
      validator_id TEXT REFERENCES users(id),
      validation_notes TEXT,
      validated_at TIMESTAMPTZ,
      payload JSONB DEFAULT '{}'::jsonb NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    ALTER TABLE questions ADD COLUMN IF NOT EXISTS nomor_urut INTEGER;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS sub_elemen TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS kompetensi TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS level_kognitif TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS tingkat_kesulitan TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS bentuk_soal TEXT DEFAULT 'PG';
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS jenis_soal TEXT DEFAULT 'tunggal';
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS stimulus_id TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS paket_id TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS sumber TEXT DEFAULT 'manual_upload';
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS previous_payload JSONB;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS previous_validation_notes TEXT;

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_resource TEXT NOT NULL,
      details JSONB DEFAULT '{}'::jsonb NOT NULL,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS validation_logs (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      question_code TEXT NOT NULL,
      validator_id TEXT NOT NULL REFERENCES users(id),
      validator_email TEXT NOT NULL,
      action TEXT NOT NULL,
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS generation_logs (
      id TEXT PRIMARY KEY,
      config_id TEXT REFERENCES generator_configs(id),
      jenjang TEXT NOT NULL,
      mapel TEXT NOT NULL,
      package_id TEXT REFERENCES question_packages(id),
      package_code TEXT,
      status TEXT NOT NULL,
      total_diminta INTEGER DEFAULT 30 NOT NULL,
      total_diterima INTEGER DEFAULT 0 NOT NULL,
      total_lolos INTEGER DEFAULT 0 NOT NULL,
      total_gagal INTEGER DEFAULT 0 NOT NULL,
      detail_pemeriksaan JSONB DEFAULT '[]'::jsonb NOT NULL,
      error_message TEXT,
      triggered_by TEXT DEFAULT 'schedule' NOT NULL,
      admin_id TEXT REFERENCES users(id),
      started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value JSONB DEFAULT '{}'::jsonb NOT NULL,
      updated_by TEXT REFERENCES users(id),
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS instansi TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_jenjang JSONB DEFAULT '[]'::jsonb NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_mapel JSONB DEFAULT '[]'::jsonb NOT NULL;

    ALTER TABLE question_packages ADD COLUMN IF NOT EXISTS assigned_validator_id TEXT;
    ALTER TABLE question_packages ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;
    ALTER TABLE question_packages ADD COLUMN IF NOT EXISTS assigned_by TEXT;

    CREATE TABLE IF NOT EXISTS honorarium_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      jenis_tugas TEXT NOT NULL,
      periode TEXT NOT NULL,
      paket_id TEXT REFERENCES question_packages(id),
      total_soal INTEGER DEFAULT 0 NOT NULL,
      total_paket INTEGER DEFAULT 0 NOT NULL,
      tarif_per_item INTEGER DEFAULT 25000 NOT NULL,
      total_nominal INTEGER DEFAULT 0 NOT NULL,
      status_bayar TEXT DEFAULT 'belum_dibayar' NOT NULL,
      tanggal_bayar TIMESTAMPTZ,
      catatan_bayar TEXT,
      diproses_oleh TEXT REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  if (databaseUrl && databaseUrl.trim() !== "") {
    if (!globalForDb.pgPool) {
      globalForDb.pgPool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 10000,
      });
      globalForDb.pgPool.on("error", (err) => {
        console.warn("[DB Pool] Koneksi idle terputus, akan dibuat ulang otomatis:", err.message);
      });
      globalForDb.pgPool.on("connect", (client) => {
        client.query("SET search_path TO soal, public;");
      });
    }
    await globalForDb.pgPool.query("CREATE SCHEMA IF NOT EXISTS soal; SET search_path TO soal, public;");
    await globalForDb.pgPool.query(createTablesSql);
  } else {
    const client = getPgliteInstance();
    await client.exec(createTablesSql);
  }
    globalForDb.tablesInitialized = true;
  } catch (err) {
    console.warn("ensureTablesCreated notice:", err);
    globalForDb.tablesInitialized = true;
  }
}
