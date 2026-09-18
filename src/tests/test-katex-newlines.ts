import katex from "katex";

const html = katex.renderToString("\\sqrt{120^2 + 90^2}", { displayMode: false });
console.log("Does katex HTML contain newline?", html.includes("\n"));
console.log("Total newlines in katex output:", html.split("\n").length);
const lines = html.split("\n");
console.log("Lines containing path d=");
lines.forEach((l, i) => {
  if (l.includes("c0,-2") || l.includes("<path") || l.includes("M834")) {
    console.log(`Line ${i}:`, l);
  }
});
