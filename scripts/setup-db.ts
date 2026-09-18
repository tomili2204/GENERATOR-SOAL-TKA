import { PGlite } from "@electric-sql/pglite";
import path from "path";
import fs from "fs";

export async function setupDatabase(targetDir: string) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const pidFile = path.join(targetDir, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {}
  }

  const client = new PGlite(targetDir);

  const createTablesSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      instansi TEXT,
      assigned_jenjang JSONB DEFAULT '[]'::jsonb NOT NULL,
      assigned_mapel JSONB DEFAULT '[]'::jsonb NOT NULL,
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
      assigned_validator_id TEXT,
      assigned_at TIMESTAMPTZ,
      assigned_by TEXT,
      tanggal_generate TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      jumlah_soal INTEGER DEFAULT 30 NOT NULL,
      distribusi_bentuk_soal JSONB DEFAULT '{}'::jsonb NOT NULL,
      distribusi_kesulitan JSONB DEFAULT '{}'::jsonb NOT NULL,
      status TEXT DEFAULT 'draft' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

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
      tema_konteks TEXT,
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
      tema_konteks TEXT,
      distribusi_tema JSONB DEFAULT '{}'::jsonb,
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

    CREATE TABLE IF NOT EXISTS tema_konteks_pool (
      id TEXT PRIMARY KEY,
      nama_tema TEXT NOT NULL,
      sub_konteks JSONB DEFAULT '[]'::jsonb NOT NULL,
      jenjang_cocok JSONB DEFAULT '["SD/MI","SMP/MTs","SMA/MA","SMK/MAK"]'::jsonb NOT NULL,
      aktif BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  console.log("Executing schema creation...");
  await client.exec(createTablesSql);
  console.log("Schema creation done.");
  await client.close();
}

const targetDir = process.argv[2] || path.join(process.cwd(), ".data", "test_fresh_pg");
setupDatabase(targetDir)
  .then(() => console.log("Database setup complete."))
  .catch((err) => console.error("Database setup error:", err));
