import CryptoJS from "crypto-js";
import https from "https";
import fs from "fs";
import path from "path";

const SECRET_KEY = "KJ2HJ3LK45JH23K4JH5234H5234K5JH232K3J5KL";
const BASE_URL = "https://tka.kemendikdasmen.go.id/hasiltka/hasil-api-2026/api/services/apps/";

function encryptPayload(data: any): string {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}

function decryptPayload(ciphertext: string): any {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
  if (!decryptedText) throw new Error("Decryption failed");
  try {
    return JSON.parse(decryptedText);
  } catch {
    return decryptedText;
  }
}

function apiPost(endpoint: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const encryptedData = {
      encrypted: true,
      data: encryptPayload(payload),
    };
    const bodyStr = JSON.stringify(encryptedData);
    const u = new URL(BASE_URL + endpoint);

    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
          "User-Agent": "Mozilla/5.0",
          Referer: "https://tka.kemendikdasmen.go.id/hasiltka/daya-serap",
        },
      },
      (res) => {
        let respBody = "";
        res.on("data", (chunk) => (respBody += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(respBody);
            if (json.encrypted === true && json.data) {
              resolve(decryptPayload(json.data));
            } else if (json.data) {
              resolve(json.data);
            } else {
              resolve(json);
            }
          } catch (e) {
            resolve(respBody);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

export interface FlattenedIndicator {
  jenjang: string;
  kd_mapel: string;
  nama_mapel: string;
  elemen: string;
  subelemen: string;
  kompetensi: string;
  subkompetensi?: string;
  indikator: string;
  urutan: number;
  nilai_nasional?: number;
}

async function extractForMapel(jenjang: string, kd_mapel: string, nama_mapel: string): Promise<FlattenedIndicator[]> {
  const res = await apiPost("daya-serap/nasional", {
    kd_mapel: kd_mapel,
    even_tka: jenjang.toLowerCase() === "sma" ? "smasmk" : jenjang.toLowerCase(),
    kd_jenjang: "T",
    jenis_sekolah: "T",
    status_sekolah: "T",
  });

  const list: FlattenedIndicator[] = [];
  const hierarchy = res?.data?.detail_hierarchy || [];

  for (const el of hierarchy) {
    const elemen = el.elemen || "-";
    for (const sub of el.subelemen_list || []) {
      const subelemen = sub.subelemen || "-";

      // 1. Direct indikator_list (used by Bahasa Indonesia)
      if (Array.isArray(sub.indikator_list) && sub.indikator_list.length > 0) {
        for (const ind of sub.indikator_list) {
          list.push({
            jenjang,
            kd_mapel,
            nama_mapel,
            elemen,
            subelemen,
            kompetensi: subelemen, // For Bahasa Indonesia, subelemen describes the competency
            indikator: ind.indikator,
            urutan: ind.urutan,
            nilai_nasional: ind.nilai,
          });
        }
      }

      // 2. Nested kompetensi_list (used by Matematika & Sciences)
      for (const kom of sub.kompetensi_list || []) {
        const kompetensi = kom.kompetensi || "-";
        for (const subkom of kom.subkompetensi_list || []) {
          const subkompetensi = subkom.subkompetensi || "-";
          for (const ind of subkom.indikator_list || []) {
            list.push({
              jenjang,
              kd_mapel,
              nama_mapel,
              elemen,
              subelemen,
              kompetensi,
              subkompetensi,
              indikator: ind.indikator,
              urutan: ind.urutan,
              nilai_nasional: ind.nilai,
            });
          }
        }
      }
    }
  }

  console.log(`-> Found ${list.length} indicators for ${jenjang} - ${nama_mapel} (${kd_mapel})`);
  return list;
}

async function main() {
  const mapelSD = await apiPost("daya-serap/mapel", { even_tka: "sd" });
  const mapelSMP = await apiPost("daya-serap/mapel", { even_tka: "smp" });
  const mapelSMA = await apiPost("daya-serap/mapel", { even_tka: "smasmk" });

  const allIndicators: FlattenedIndicator[] = [];

  // Extract SD
  for (const m of mapelSD.data || []) {
    const items = await extractForMapel("SD", m.kd_mapel, m.nama_mapel);
    allIndicators.push(...items);
  }

  // Extract SMP
  for (const m of mapelSMP.data || []) {
    const items = await extractForMapel("SMP", m.kd_mapel, m.nama_mapel);
    allIndicators.push(...items);
  }

  // Extract SMA Core: Bahasa Indonesia & Matematika
  for (const m of (mapelSMA.data || []).slice(0, 4)) {
    const items = await extractForMapel("SMA", m.kd_mapel, m.nama_mapel);
    allIndicators.push(...items);
  }

  const outDir = path.resolve(__dirname, "../src/lib/taxonomy");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, "kemendikdasmen-official.json");
  fs.writeFileSync(outFile, JSON.stringify(allIndicators, null, 2), "utf-8");
  console.log(`\n=== SUCCESS ===\nSaved ${allIndicators.length} official indicators to ${outFile}`);
}

main().catch(console.error);
