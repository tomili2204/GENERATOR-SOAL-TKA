import { pgTable, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";

export type UserRoleType = "admin" | "pembuat_soal" | "validator_soal";
export type QuestionStatusType = "draft" | "menunggu_validasi" | "direvisi" | "perlu_revisi" | "disetujui" | "ditolak";
export type JenjangType = "SD/MI" | "SMP/MTs" | "SMA/MA" | "SMK/MAK" | "SD" | "SMP";
export type MapelType = "Bahasa Indonesia" | "Matematika" | string;
export type BentukSoalType = "PG" | "PGK_MCMA" | "PGK_KATEGORI";
export type JenisSoalType = "tunggal" | "grup";
export type TingkatKesulitanType = "rendah" | "sedang" | "tinggi";
export type SumberSoalType = "ai_generated" | "manual_upload";
export type StimulusTipeType = "teks" | "data";
export type PaketSoalStatusType = "draft" | "dalam_validasi" | "perlu_revisi" | "siap_rilis";
export type TipeSumberPaketType = "manual" | "ai";

export interface QuestionPayload {
  soal_text: string;
  gambar?: {
    tipe: "svg" | "url" | "perlu_ilustrasi";
    svg_content?: string;
    url?: string;
    deskripsi_alt: string;
  } | null;
  opsi?: Array<{ label: string; text: string }>;
  pernyataan?: Array<{ no: number; text: string }>;
  kategori_respons?: string[];
  kunci_jawaban: string[];
  pembahasan: string;
  [key: string]: any;
}

export type User = typeof users.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type GeneratorConfig = typeof generatorConfigs.$inferSelect;
export type FixedTaxonomy = typeof fixedTaxonomies.$inferSelect;
export type Stimulus = typeof stimulus.$inferSelect;
export type QuestionPackage = typeof questionPackages.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

// Tabel Pengguna Internal AyoTKA
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  instansi: text("instansi"), // Asal Instansi / Asal Sekolah / Lembaga
  isActive: boolean("is_active").default(true).notNull(),
  assignedJenjang: jsonb("assigned_jenjang").default([]).notNull(), // Array e.g. ["SD/MI", "SMP/MTs"]
  assignedMapel: jsonb("assigned_mapel").default([]).notNull(),     // Array e.g. ["Matematika", "Bahasa Indonesia"]
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabel Peran Pengguna (Satu akun dapat memiliki banyak peran)
export const userRoles = pgTable("user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").$type<UserRoleType>().notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabel Stimulus Soal (Relasi satu-ke-banyak ke Soal grup)
export const stimulus = pgTable("stimulus", {
  id: text("id").primaryKey(),
  jenjang: text("jenjang").$type<JenjangType>().notNull(),
  mapel: text("mapel").notNull(),
  tipe: text("tipe").$type<StimulusTipeType>().notNull(), // 'teks' | 'data'
  judul: text("judul").default("Stimulus").notNull(),
  konten: text("konten").notNull(),
  jumlahKata: integer("jumlah_kata"),
  dibuatOleh: text("dibuat_oleh").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabel Paket Soal (Kumpulan soal terstruktur 30 slot blueprint)
export const questionPackages = pgTable("question_packages", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // Contoh: H01-SD-MAT atau A01-SD-MAT
  nama: text("nama").notNull(),
  jenjang: text("jenjang").$type<JenjangType>().notNull(),
  mapel: text("mapel").notNull(),
  tipeSumber: text("tipe_sumber").$type<TipeSumberPaketType>().default("manual").notNull(),
  authorId: text("author_id").notNull().references(() => users.id),
  assignedValidatorId: text("assigned_validator_id").references(() => users.id), // Validator yang ditugaskan khusus oleh Admin
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  assignedBy: text("assigned_by").references(() => users.id),
  tanggalGenerate: timestamp("tanggal_generate", { withTimezone: true }).defaultNow().notNull(),
  jumlahSoal: integer("jumlah_soal").default(30).notNull(),
  distribusiBentukSoal: jsonb("distribusi_bentuk_soal").default({}).notNull(),
  distribusiKesulitan: jsonb("distribusi_kesulitan").default({}).notNull(),
  status: text("status").$type<PaketSoalStatusType>().default("draft").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabel Konfigurasi Generator Otomatis (Per Jenjang + Mapel - Khusus Admin)
export const generatorConfigs = pgTable("generator_configs", {
  id: text("id").primaryKey(),
  jenjang: text("jenjang").$type<JenjangType>().notNull(),
  mapel: text("mapel").notNull(),
  isAutoActive: boolean("is_auto_active").default(false).notNull(),
  dailyTargetQuota: integer("daily_target_quota").default(20).notNull(),
  config: jsonb("config").default({}).notNull(),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabel Nilai Tetap / Taksonomi (Mapel, Elemen Kompetensi, dsb. - Khusus Admin)
export const fixedTaxonomies = pgTable("fixed_taxonomies", {
  id: text("id").primaryKey(),
  jenjang: text("jenjang").$type<JenjangType>().notNull(),
  mapel: text("mapel").notNull(),
  category: text("category").notNull(), // 'elemen' | 'kesulitan' | 'tipe_soal'
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  metadata: jsonb("metadata").default({}).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabel Soal (Fondasi Data dengan kolom spesifik & JSONB payload)
export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // Contoh: TKA-SD-MAT-001 atau H01-SD-MAT-01
  nomorUrut: integer("nomor_urut"), // Slot 1 sampai 30 dalam paket
  jenjang: text("jenjang").$type<JenjangType>().notNull(),
  mapel: text("mapel").notNull(),
  elemen: text("elemen").notNull(),
  subElemen: text("sub_elemen"),
  kompetensi: text("kompetensi"),
  levelKognitif: text("level_kognitif"),
  tingkatKesulitan: text("tingkat_kesulitan").$type<TingkatKesulitanType>(),
  bentukSoal: text("bentuk_soal").$type<BentukSoalType>().default("PG").notNull(),
  jenisSoal: text("jenis_soal").$type<JenisSoalType>().default("tunggal").notNull(),
  stimulusId: text("stimulus_id").references(() => stimulus.id),
  paketId: text("paket_id").references(() => questionPackages.id),
  sumber: text("sumber").$type<SumberSoalType>().default("manual_upload").notNull(),
  status: text("status").$type<QuestionStatusType>().default("menunggu_validasi").notNull(),
  authorId: text("author_id").notNull().references(() => users.id),
  validatorId: text("validator_id").references(() => users.id),
  validationNotes: text("validation_notes"),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  payload: jsonb("payload").default({}).notNull(), // Menyimpan soal_text, opsi, gambar, kunci_jawaban, pembahasan
  temaKonteks: text("tema_konteks"), // Ringkasan tema konteks soal (nullable)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabel Pool Tema Konteks (Variasi Latar & Konteks Cerita Soal AI)
export const temaKonteksPool = pgTable("tema_konteks_pool", {
  id: text("id").primaryKey(),
  namaTema: text("nama_tema").notNull(),
  subKonteks: jsonb("sub_konteks").$type<string[]>().default([]).notNull(),
  jenjangCocok: jsonb("jenjang_cocok").$type<string[]>().default(["SD/MI", "SMP/MTs", "SMA/MA", "SMK/MAK"]).notNull(),
  aktif: boolean("aktif").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type TemaKonteksPoolItem = typeof temaKonteksPool.$inferSelect;

// Tabel Audit Log (Khusus Admin memantau aktivitas sistem & tim)
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  userEmail: text("user_email").notNull(),
  action: text("action").notNull(),
  targetResource: text("target_resource").notNull(),
  details: jsonb("details").default({}).notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Tabel Log Validasi Append-Only (Pencatatan Permanen Setiap Aksi Telaah Validator)
export const validationLogs = pgTable("validation_logs", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  questionCode: text("question_code").notNull(),
  validatorId: text("validator_id").notNull().references(() => users.id),
  validatorEmail: text("validator_email").notNull(),
  action: text("action").notNull(), // 'disetujui' | 'ditolak' | 'direvisi'
  previousStatus: text("previous_status").notNull(),
  newStatus: text("new_status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ValidationLog = typeof validationLogs.$inferSelect;

// Tabel Log Proses Generate AI Harian
export const generationLogs = pgTable("generation_logs", {
  id: text("id").primaryKey(),
  configId: text("config_id").references(() => generatorConfigs.id),
  jenjang: text("jenjang").notNull(),
  mapel: text("mapel").notNull(),
  packageId: text("package_id").references(() => questionPackages.id),
  packageCode: text("package_code"),
  status: text("status").notNull(), // 'berhasil' | 'gagal' | 'sebagian'
  totalDiminta: integer("total_diminta").default(30).notNull(),
  totalDiterima: integer("total_diterima").default(0).notNull(),
  totalLolos: integer("total_lolos").default(0).notNull(),
  totalGagal: integer("total_gagal").default(0).notNull(),
  detailPemeriksaan: jsonb("detail_pemeriksaan").default([]).notNull(),
  errorMessage: text("error_message"),
  triggeredBy: text("triggered_by").default("schedule").notNull(), // 'schedule' | 'manual_admin'
  adminId: text("admin_id").references(() => users.id),
  temaKonteks: text("tema_konteks"), // Tema terpilih untuk batch ini
  distribusiTema: jsonb("distribusi_tema").default({}), // Ringkasan sebaran sub-konteks/tema_konteks
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type GenerationLog = typeof generationLogs.$inferSelect;

// Tabel Pengaturan Global Sistem (Misal: Konfigurasi AI API, Parameter Global)
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").default({}).notNull(),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;

// Tabel Pencatatan Pembayaran Honorarium (HR) Validasi & Penulisan Soal
export const honorariumRecords = pgTable("honorarium_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jenisTugas: text("jenis_tugas").notNull(), // 'validasi_soal' | 'penulisan_soal'
  periode: text("periode").notNull(),        // misal '2026-03' atau kode paket 'A01-SD-MAT'
  paketId: text("paket_id").references(() => questionPackages.id),
  totalSoal: integer("total_soal").default(0).notNull(),
  totalPaket: integer("total_paket").default(0).notNull(),
  tarifPerItem: integer("tarif_per_item").default(25000).notNull(),
  totalNominal: integer("total_nominal").default(0).notNull(),
  statusBayar: text("status_bayar").$type<"belum_dibayar" | "sudah_dibayar">().default("belum_dibayar").notNull(),
  tanggalBayar: timestamp("tanggal_bayar", { withTimezone: true }),
  catatanBayar: text("catatan_bayar"), // No. referensi transfer / kwitansi
  diprosesOleh: text("diproses_oleh").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type HonorariumRecord = typeof honorariumRecords.$inferSelect;

