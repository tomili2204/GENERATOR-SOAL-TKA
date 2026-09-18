// Script runner untuk menghasilkan sisa paket soal hingga mencapai kuota 5 paket per jenjang dan mapel
const BASE_URL = "http://localhost:3000";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("=================================================");
  console.log("MEMULAI GENERASI TARGET 5 PAKET PER JENJANG/MAPEL");
  console.log("=================================================\n");

  // 1. Login Admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ayotka.id", password: "admin123" }),
  });

  if (!loginRes.ok) {
    console.error("Gagal login sebagai admin!");
    process.exit(1);
  }

  const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

  // 2. Periksa paket yang sudah ada
  const pkgRes = await fetch(`${BASE_URL}/api/packages`, {
    headers: { Cookie: cookie },
  });
  const pkgData = await pkgRes.json();
  const existingPackages = pkgData.data || [];

  const targets = [
    { jenjang: "SD/MI", mapel: "Matematika", configId: "gen-sd-mat" },
    { jenjang: "SMP/MTs", mapel: "Matematika", configId: "gen-smp-mat" },
    { jenjang: "SD/MI", mapel: "Bahasa Indonesia", configId: "gen-sd-indo" },
    { jenjang: "SMP/MTs", mapel: "Bahasa Indonesia", configId: "gen-smp-indo" },
  ];

  for (const t of targets) {
    const isSD = t.jenjang.includes("SD");
    const isSMP = t.jenjang.includes("SMP");
    const isMat = t.mapel.toLowerCase().includes("matematika");
    const isBin = t.mapel.toLowerCase().includes("indonesia");

    const currentCount = existingPackages.filter((p) => {
      const pSD = p.jenjang.includes("SD");
      const pSMP = p.jenjang.includes("SMP");
      const pMat = p.mapel.toLowerCase().includes("matematika");
      const pBin = p.mapel.toLowerCase().includes("indonesia");
      return (isSD ? pSD : pSMP) && (isMat ? pMat : pBin);
    }).length;

    const needed = Math.max(0, 5 - currentCount);
    console.log(`[TARGET] ${t.jenjang} - ${t.mapel}: Ada ${currentCount} paket, butuh ${needed} paket lagi.`);

    for (let i = 0; i < needed; i++) {
      console.log(`\n>> Generating paket ke-${currentCount + i + 1} untuk ${t.jenjang} - ${t.mapel}...`);
      const t0 = Date.now();

      let success = false;
      let attempts = 0;

      while (!success && attempts < 3) {
        attempts++;
        try {
          const res = await fetch(`${BASE_URL}/api/admin/generator/trigger`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: cookie,
            },
            body: JSON.stringify({
              jenjang: t.jenjang,
              mapel: t.mapel,
              configId: t.configId,
              totalSoal: 30,
            }),
          });

          const result = await res.json();
          const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

          if (result.success && result.data?.packageCode) {
            console.log(`   ✅ BERHASIL dalam ${elapsed}s: Paket ${result.data.packageCode} (Lolos: ${result.data.totalLolos}/30)`);
            success = true;
          } else {
            console.warn(`   ⚠️ Percobaan ${attempts} gagal (${elapsed}s): ${result.data?.errorMessage || result.error || "Unknown error"}`);
            if (attempts < 3) {
              console.log("   Menunggu 5 detik sebelum coba lagi...");
              await sleep(5000);
            }
          }
        } catch (err) {
          console.error(`   ❌ Network/fetch error pada percobaan ${attempts}:`, err.message);
          if (attempts < 3) await sleep(5000);
        }
      }

      // Jeda 3 detik antar paket untuk kestabilan
      await sleep(3000);
    }
  }

  // 3. Rekap Hasil Akhir
  console.log("\n=================================================");
  console.log("REKAP KELENGKAPAN SELURUH PAKET SOAL");
  console.log("=================================================");

  const finalRes = await fetch(`${BASE_URL}/api/packages`, {
    headers: { Cookie: cookie },
  });
  const finalData = await finalRes.json();
  const allPkgs = finalData.data || [];

  for (const t of targets) {
    const isSD = t.jenjang.includes("SD");
    const isSMP = t.jenjang.includes("SMP");
    const isMat = t.mapel.toLowerCase().includes("matematika");
    const isBin = t.mapel.toLowerCase().includes("indonesia");

    const pkgs = allPkgs.filter((p) => {
      const pSD = p.jenjang.includes("SD");
      const pSMP = p.jenjang.includes("SMP");
      const pMat = p.mapel.toLowerCase().includes("matematika");
      const pBin = p.mapel.toLowerCase().includes("indonesia");
      return (isSD ? pSD : pSMP) && (isMat ? pMat : pBin);
    });

    console.log(`\n📌 ${t.jenjang} - ${t.mapel} (${pkgs.length}/5 paket):`);
    pkgs.forEach((p) => {
      console.log(`   - [${p.code}] ${p.nama} | ${p.jumlahSoal} butir | status: ${p.status}`);
    });
  }
}

run().catch((e) => console.error("FATAL ERROR:", e));
