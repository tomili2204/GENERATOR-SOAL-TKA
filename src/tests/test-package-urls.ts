async function testUrls() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ayotka.id", password: "admin123" }),
  });
  const cookie = loginRes.headers.get("set-cookie");
  console.log("Login cookie:", Boolean(cookie));

  const targetPkg = "pkg-ai-1789603333013-7984u";

  console.log("\n1. Testing /author/packages/" + targetPkg);
  const authorRes = await fetch("http://localhost:3000/author/packages/" + targetPkg, {
    headers: { Cookie: cookie || "" },
    redirect: "manual",
  });
  console.log("Author URL Status:", authorRes.status);
  console.log("Location header:", authorRes.headers.get("location"));

  console.log("\n2. Testing /pembuat/paket/" + targetPkg);
  const pembuatRes = await fetch("http://localhost:3000/pembuat/paket/" + targetPkg, {
    headers: { Cookie: cookie || "" },
  });
  console.log("Pembuat URL Status:", pembuatRes.status);
  const html = await pembuatRes.text();
  console.log("HTML length:", html.length);
  console.log("Contains Paket / Dashboard text:", html.includes("Paket") || html.includes("SMP") || html.includes("Matematika"));
}

testUrls().catch(console.error);
