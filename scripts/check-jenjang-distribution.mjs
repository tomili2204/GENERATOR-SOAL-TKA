const BASE_URL = "http://localhost:3000";

async function run() {
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ayotka.id", password: "admin123" }),
  });
  const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

  // 1. Check questions
  const qRes = await fetch(`${BASE_URL}/api/questions?limit=1000`, {
    headers: { Cookie: cookie },
  });
  const questions = (await qRes.json()).data || [];
  const qJenjangCount = {};
  for (const q of questions) {
    qJenjangCount[q.jenjang] = (qJenjangCount[q.jenjang] || 0) + 1;
  }
  console.log("Questions jenjang distribution:", qJenjangCount);

  // 2. Check packages
  const pRes = await fetch(`${BASE_URL}/api/packages`, {
    headers: { Cookie: cookie },
  });
  const packages = (await pRes.json()).data || [];
  const pJenjangCount = {};
  for (const p of packages) {
    pJenjangCount[p.jenjang] = (pJenjangCount[p.jenjang] || 0) + 1;
  }
  console.log("Packages jenjang distribution:", pJenjangCount);

  // 3. Check generator_configs
  const cRes = await fetch(`${BASE_URL}/api/admin/generator-toggle`, {
    headers: { Cookie: cookie },
  });
  const configs = (await cRes.json()).data || [];
  const cJenjangCount = {};
  for (const c of configs) {
    cJenjangCount[c.jenjang] = (cJenjangCount[c.jenjang] || 0) + 1;
  }
  console.log("Generator configs jenjang distribution:", cJenjangCount);
}

run().catch((e) => console.error(e));
