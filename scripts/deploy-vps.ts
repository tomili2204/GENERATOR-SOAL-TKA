import { Client } from "ssh2";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const config = {
  host: "187.77.115.29",
  port: 22,
  username: "root",
  password: "Den985985985##",
};

function runSSHCommand(conn: Client, cmd: string): Promise<number> {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> [VPS EXEC] ${cmd.split("\n")[0]}...`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream
        .on("close", (code: number) => {
          resolve(code);
        })
        .on("data", (data: Buffer) => {
          process.stdout.write(data.toString());
        })
        .stderr.on("data", (data: Buffer) => {
          process.stderr.write(data.toString());
        });
    });
  });
}

function uploadFile(conn: Client, localPath: string, remotePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      console.log(`[SFTP] Mengunggah ${path.basename(localPath)} ke VPS...`);
      sftp.fastPut(localPath, remotePath, (uploadErr) => {
        if (uploadErr) return reject(uploadErr);
        console.log(`[SFTP] Upload selesai.`);
        resolve();
      });
    });
  });
}

async function deploy() {
  console.log("🚀 [1/3] Membuat arsip kode terbaru...");
  const projectDir = path.resolve(__dirname, "..");
  const archivePath = path.resolve(__dirname, "app-deploy.tar.gz");
  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);

  // Tar source code, excluding build outputs and heavy dependencies
  const tarCmd = `tar --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="scratch" --exclude=".vercel" --exclude="scripts/*.tar.gz" -czf "${archivePath}" -C "${projectDir}" .`;
  execSync(tarCmd, { stdio: "inherit" });
  const archiveSize = (fs.statSync(archivePath).size / (1024 * 1024)).toFixed(2);
  console.log(`Arsip siap: ${archiveSize} MB`);

  console.log("🔗 [2/3] Menghubungkan ke VPS via SSH...");
  const conn = new Client();
  await new Promise<void>((resolve, reject) => {
    conn
      .on("ready", () => {
        console.log("Terhubung ke Hostinger VPS (187.77.115.29)!");
        resolve();
      })
      .on("error", reject)
      .connect(config);
  });

  await uploadFile(conn, archivePath, "/tmp/app-deploy.tar.gz");
  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);

  console.log("⚡ [3/3] Ekstrak, Build & Zero-Downtime Reload PM2 di VPS...");
  const updateScript = `#!/usr/bin/env bash
set -e
cd /var/www/generator-soal-tka
tar -xzf /tmp/app-deploy.tar.gz -C /var/www/generator-soal-tka
rm -f /tmp/app-deploy.tar.gz

npm install --prefer-offline --no-audit
npm run build
pm2 reload generator-soal-tka --update-env
pm2 save
echo "✅ DEPLOYMENT KE VPS BERHASIL!"
pm2 status
`;

  const exitCode = await runSSHCommand(conn, updateScript);
  conn.end();

  if (exitCode === 0) {
    console.log("\n🎉 SELURUH PERUBAHAN SUDAH LIVE DI HTTPS://SOAL.AYOTKA.ID!");
  } else {
    console.error(`\n❌ Deployment gagal dengan kode: ${exitCode}`);
    process.exit(exitCode);
  }
}

deploy().catch((err) => {
  console.error("Deploy error:", err);
  process.exit(1);
});
