import { getStoredAiConfig } from "../lib/generator/gemini-generator";

async function main() {
  const cfg = await getStoredAiConfig();
  console.log("API Key configured?", Boolean(cfg.apiKey && cfg.apiKey.length > 10));
  console.log("Model:", cfg.modelName);
  process.exit(0);
}
main();
