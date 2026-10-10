// Tunnel SSH ke VPS tanpa mengetik password: membaca kredensial VPS dari .env.local (sama seperti
// scripts/db-query.ts) lalu meneruskan port lokal ke port localhost di VPS.
//
// Pemakaian (dari folder project ini; biarkan berjalan, hentikan dengan Ctrl+C):
//   npx tsx scripts/ssh-tunnel.ts                → 3306 (MariaDB) dan 20128 (9Router)
//   npx tsx scripts/ssh-tunnel.ts 3306           → hanya port tertentu
import { Client } from "ssh2";
import * as fs from "fs";
import * as net from "net";

function loadConfig() {
  const envFile = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
  const get = (key: string) =>
    process.env[key] || envFile.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim().replace(/^["']|["']$/g, "");

  const password = get("VPS_PASSWORD");
  if (!password) throw new Error("Kredensial VPS_PASSWORD tidak ditemukan di environment atau .env.local");
  return {
    host: get("VPS_HOST") || "187.77.115.29",
    port: Number(get("VPS_PORT")) || 22,
    username: get("VPS_USERNAME") || "root",
    password,
    keepaliveInterval: 30_000,
    keepaliveCountMax: 3,
  };
}

const ports = process.argv.slice(2).map(Number).filter(Boolean);
const forwardPorts = ports.length ? ports : [3306, 20128];

// Jeda sambung ulang bertahap (5 dtk → maks 5 menit) agar tidak membanjiri server yang sedang
// bermasalah (dan tidak memicu fail2ban); kembali ke 5 dtk setelah berhasil tersambung.
const RECONNECT_MIN_MS = 5_000;
const RECONNECT_MAX_MS = 5 * 60_000;
let reconnectDelay = RECONNECT_MIN_MS;
const config = loadConfig();

// Port lokal dibuka sekali; koneksi SSH di belakangnya bisa diganti saat tersambung ulang.
let ssh: Client | null = null;

for (const port of forwardPorts) {
  net
    .createServer((socket) => {
      if (!ssh) {
        socket.destroy();
        return;
      }
      ssh.forwardOut("127.0.0.1", port, "127.0.0.1", port, (err, stream) => {
        if (err) {
          console.error(`[tunnel] gagal meneruskan :${port}: ${err.message}`);
          socket.destroy();
          return;
        }
        socket.pipe(stream).pipe(socket);
        stream.on("error", () => socket.destroy());
        socket.on("error", () => stream.destroy());
      });
    })
    .on("error", (err) => {
      console.error(`[tunnel] port lokal ${port} tidak bisa dipakai: ${err.message}`);
      process.exit(1);
    })
    .listen(port, "127.0.0.1", () => console.log(`[tunnel] 127.0.0.1:${port} → VPS 127.0.0.1:${port}`));
}

// Koneksi lama bisa diputus server/jaringan (ECONNRESET); sambung ulang otomatis.
function connect() {
  const client = new Client();
  client
    .on("ready", () => {
      ssh = client;
      reconnectDelay = RECONNECT_MIN_MS;
      console.log("[tunnel] SSH tersambung");
    })
    .on("error", (err) => console.error(`[tunnel] koneksi SSH gagal: ${err.message}`))
    .on("close", () => {
      if (ssh === client) ssh = null;
      console.error(`[tunnel] koneksi SSH tertutup, sambung ulang dalam ${reconnectDelay / 1000} dtk`);
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
    })
    .connect(config);
}

connect();
