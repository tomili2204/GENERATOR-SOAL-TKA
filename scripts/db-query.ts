import { Client } from "ssh2";
import * as fs from "fs";

function loadConfig() {
  let envFile = "";
  if (fs.existsSync(".env.local")) {
    envFile = fs.readFileSync(".env.local", "utf8");
  } else if (fs.existsSync(".env")) {
    envFile = fs.readFileSync(".env", "utf8");
  }

  const get = (key: string) => {
    return (
      process.env[key] ||
      envFile.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "")
    );
  };

  const host = get("VPS_HOST") || "187.77.115.29";
  const username = get("VPS_USERNAME") || "root";
  const password = get("VPS_PASSWORD");
  const port = Number(get("VPS_PORT")) || 22;

  if (!password) {
    throw new Error("Kredensial VPS_PASSWORD tidak ditemukan di environment atau .env.local");
  }

  return { host, port, username, password };
}

export interface QueryDbOptions {
  root?: boolean;
  database?: string;
  raw?: boolean;
}

/**
 * Eksekusi query ke MariaDB di VPS Hostinger.
 * Mendukung operasi penuh CRUD (CREATE TABLE, SELECT, INSERT, UPDATE, DELETE).
 * Jika root=true, mengeksekusi dengan izin root (bisa CREATE DATABASE, SHOW DATABASES, dll).
 */
export async function queryDb(sql: string, options: QueryDbOptions = {}): Promise<string> {
  const config = loadConfig();
  const ssh = new Client();

  await new Promise<void>((resolve, reject) => {
    ssh.on("ready", resolve).on("error", reject).connect(config);
  });

  const b64 = Buffer.from(sql).toString("base64");
  const dbTarget = options.database ? `"${options.database}"` : `"\${DB_NAME:-wp_tomilistiawan}"`;
  const formatFlag = options.raw ? "-B" : "-t";

  let remoteCmd = "";
  if (options.root) {
    // Mode Root: Langsung akses via unix_socket (hak penuh CREATE DATABASE, CREATE USER, dll)
    remoteCmd = `bash -c '
      echo "${b64}" | base64 -d | mariadb ${options.database ? `"${options.database}"` : ""} ${formatFlag}
    '`;
  } else {
    // Mode User: Akses dengan user database (hak CRUD penuh pada database target)
    remoteCmd = `bash -c '
      set -a; [ -f /root/.wp-tomilistiawan.id.db ] && . /root/.wp-tomilistiawan.id.db; set +a
      echo "${b64}" | base64 -d | mariadb -u "\${DB_USER:-root}" -p"$DB_PASSWORD" ${dbTarget} ${formatFlag}
    '`;
  }

  const output = await new Promise<string>((resolve, reject) => {
    ssh.exec(remoteCmd, (err, stream) => {
      if (err) return reject(err);
      let res = "";
      stream.on("data", (d: Buffer) => (res += d.toString()));
      stream.stderr.on("data", (d: Buffer) => (res += d.toString()));
      stream.on("close", () => resolve(res.trim()));
    });
  });

  ssh.end();
  return output;
}

// Jika dijalankan langsung dari CLI (terminal Claude Code / Antigravity):
if (require.main === module || process.argv[1]?.endsWith("db-query.ts")) {
  const args = process.argv.slice(2);
  const isRoot = args.includes("--root");
  const isRaw = args.includes("--raw");
  const dbMatch = args.find((a) => a.startsWith("--db="))?.split("=")[1];

  const sqlArgs = args.filter((a) => !a.startsWith("--")).join(" ").trim() || "SHOW TABLES;";

  console.log(`[MariaDB @ VPS] (${isRoot ? "ROOT" : "CRUD Mode"}) Menjalankan: ${sqlArgs}\n`);

  queryDb(sqlArgs, { root: isRoot, database: dbMatch, raw: isRaw })
    .then((out) => {
      console.log(out || "(Query berhasil, tidak ada baris yang dikembalikan)");
    })
    .catch((err) => {
      console.error("Gagal menjalankan query:", err.message);
      process.exit(1);
    });
}
