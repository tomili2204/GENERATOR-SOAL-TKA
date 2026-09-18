import { repairLatexString } from "../lib/latex/latex-repair";
import katex from "katex";

const content = "A: Jarak AC = $\\sqrt{120^2 + 90^2} = \\sqrt{14400 + 8100} = \\sqrt{22500} = 150$ km (Benar).";

// Simulate LatexPreview steps
let text = repairLatexString(content);
text = text.replace(/\$([^\$\n]+?)\$/g, (_match, math) => {
  return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
});

console.log("Does rendered text contain <svg?", text.includes("<svg"));
const svgMatches = text.match(/<svg[\s\S]*?<\/svg>/gi);
console.log("Total SVG matches inside KaTeX output:", svgMatches?.length);
if (svgMatches) {
  console.log("First match starts with:", svgMatches[0].slice(0, 150));
}
