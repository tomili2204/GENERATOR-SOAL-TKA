const raw = "A: Jarak AC = $\\sqrt{120^2 + 90^2} = \\sqrt{14400 + 8100} = \\sqrt{22500} = 150$ km (Benar). B: Arah Utara dan Timur saling tegak lurus, membentuk sudut $90^\\circ$ (Benar). C: Waktu = Jarak / Kecepatan = $150 / 50 = 3$ jam (Benar). D: Jarak total = $120 + 90 = 210$ km (Benar).";

// Format separate items on newlines
const formatted = raw.replace(/(\.\s+|\)\s+)([A-D]:\s+|Opsi\s+[A-D]:|Langkah\s+\d+:)/g, "$1\n$2");
console.log("=== FORMATTED ===");
console.log(formatted);
