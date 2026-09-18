const BASE_URL = "http://localhost:3000";

async function run() {
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ayotka.id", password: "admin123" }),
  });
  const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

  const pkgRes = await fetch(`${BASE_URL}/api/packages`, {
    headers: { Cookie: cookie },
  });
  const pkgs = (await pkgRes.json()).data;

  console.log("=== IDENTIFIKASI PAKET DRAFT & SLOT KOSONG ===");
  for (const p of pkgs) {
    if (p.progress?.filledSoal < 30) {
      const detailRes = await fetch(`${BASE_URL}/api/packages/${p.id}`, {
        headers: { Cookie: cookie },
      });
      const detail = await detailRes.json();
      const slots = detail.data?.slots || [];
      const existingSlots = new Set(slots.filter((s) => s.question).map((s) => s.slotNumber));
      const missing = [];
      for (let i = 1; i <= 30; i++) {
        if (!existingSlots.has(i)) missing.push(i);
      }
      console.log(`- Paket ${p.code} (${p.jenjang} - ${p.mapel}) ID: ${p.id}`);
      console.log(`  Terisi: ${p.progress?.filledSoal}/30 | Slot kosong: [${missing.join(", ")}]`);
    }
  }
}

run().catch((e) => console.error(e));
