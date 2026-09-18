import katex from "katex";

const html = katex.renderToString("\\sqrt{120^2 + 90^2}", { displayMode: false });
const singleLine = html.replace(/\r?\n/g, " ");

console.log("Original lines:", html.split("\n").length);
console.log("Singleline lines:", singleLine.split("\n").length);
console.log("Contains path d:", singleLine.includes("<path d="));
console.log("Contains c0,-2:", singleLine.includes("c0,-2"));
console.log("Does singleLine have unbroken <svg>...<path.../></svg>?", singleLine.includes("</svg>"));
