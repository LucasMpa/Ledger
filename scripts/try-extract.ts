import "dotenv/config";
import { readFileSync } from "node:fs";

import { extractReceipt } from "@/lib/extraction";

/**
 * Dev-only: run the real extraction pipeline against a local image file,
 * bypassing the browser and auth. Usage:
 *   npx tsx scripts/try-extract.ts path/to/receipt.png
 */
async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: npx tsx scripts/try-extract.ts <image path>");
    process.exit(1);
  }

  const data = readFileSync(path).toString("base64");
  const mimeType = path.toLowerCase().endsWith(".png")
    ? ("image/png" as const)
    : path.toLowerCase().endsWith(".webp")
      ? ("image/webp" as const)
      : ("image/jpeg" as const);

  console.log(`model:   ${process.env.EXTRACTION_MODEL ?? "claude-sonnet-5"}`);
  console.log(`prompt:  ${process.env.PROMPT_VERSION ?? "v1"}`);
  console.log(`image:   ${path} (${mimeType})\n`);

  const { result, rawJson } = await extractReceipt({ data, mimeType });

  console.log("--- ExtractionResult ---");
  console.log(JSON.stringify(result, null, 2));
  console.log("\n--- raw model output ---");
  console.log(JSON.stringify(rawJson, null, 2));
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
