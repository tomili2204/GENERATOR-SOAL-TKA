async function testGenerate() {
  console.log("1. Logging in as admin...");
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ayotka.id", password: "admin123" }),
  });
  console.log("Login HTTP Status:", loginRes.status);
  const cookie = loginRes.headers.get("set-cookie");
  console.log("Got auth cookie:", Boolean(cookie));

  console.log("\n2. Triggering generator for SMP Bahasa Indonesia with forceMock=true...");
  const triggerRes = await fetch("http://localhost:3000/api/admin/generator/trigger", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie || "",
    },
    body: JSON.stringify({
      jenjang: "SMP/MTs",
      mapel: "Bahasa Indonesia",
      forceMock: true,
      totalSoal: 30,
    }),
  });

  const resData = await triggerRes.json();
  console.log("Trigger result HTTP status:", triggerRes.status);
  console.log("Trigger result:", JSON.stringify(resData, null, 2));

  if (resData.success && resData.data?.packageId) {
    console.log("\n3. Fetching generated package detail:", resData.data.packageId);
    const detailRes = await fetch(`http://localhost:3000/api/packages/${resData.data.packageId}`, {
      headers: { Cookie: cookie || "" },
    });
    const detail = await detailRes.json();
    const pkg = detail.data?.package;
    console.log("Package Code:", pkg?.code);
    console.log("Package Title:", pkg?.nama);
    const slots = detail.data?.slots || [];
    console.log("Total Slots:", slots.length);
    console.log("Filled Slots:", slots.filter((s: any) => s.isFilled).length);
    
    const q1 = slots[0]?.question;
    const q4 = slots[3]?.question;
    const q5 = slots[4]?.question;

    console.log("\n--- SLOT 1 ---");
    console.log("Bentuk:", q1?.bentukSoal);
    console.log("Soal:", q1?.payload?.soal_text);
    console.log("Pembahasan:", q1?.payload?.pembahasan);

    console.log("\n--- SLOT 4 (Geometri & SVG Diagram) ---");
    console.log("Bentuk:", q4?.bentukSoal);
    console.log("Soal:", q4?.payload?.soal_text);
    console.log("Gambar field in DB:", JSON.stringify(q4?.gambar));
    console.log("Gambar field in Payload:", JSON.stringify(q4?.payload?.gambar));

    console.log("\n--- SLOT 5 (Grup Stimulus Koperasi Mandiri) ---");
    console.log("Bentuk:", q5?.bentukSoal);
    console.log("Jenis Soal:", q5?.jenisSoal);
    console.log("Stimulus ID:", q5?.stimulusId);
    console.log("Stimulus Konten preview:", q5?.stimulus?.konten?.slice(0, 150));
    console.log("Soal:", q5?.payload?.soal_text);
    console.log("Pembahasan:", q5?.payload?.pembahasan);
  }
}

testGenerate().catch(console.error);
