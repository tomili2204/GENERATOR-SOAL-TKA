async function findQuestion() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ayotka.id", password: "admin123" }),
  });
  const cookie = loginRes.headers.get("set-cookie");

  const res = await fetch("http://localhost:3000/api/packages/A01-SMP-MAT", {
    headers: { Cookie: cookie || "" },
  });
  const data = await res.json();
  const slots = data.data?.slots || [];
  
  for (const s of slots) {
    const text = s.question?.payload?.pembahasan || "";
    if (text.includes("U_{10}") || text.includes("U_10") || text.includes("Pola:") || text.includes("a = 15")) {
      console.log("FOUND QUESTION:", s.question.code);
      console.log("RAW PEMBAHASAN:");
      console.log(JSON.stringify(text));
      console.log("\nFORMATTED:");
      console.log(text);
      return;
    }
  }
  console.log("Not found in A01-SMP-MAT. Package list length:", slots.length);
}

findQuestion().catch(console.error);
