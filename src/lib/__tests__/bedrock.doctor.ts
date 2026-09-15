import "dotenv/config";
import { embed, getBedrockClient } from "@/lib/bedrock";

const CANDIDATES = [
  "anthropic.claude-opus-5",
  "anthropic.claude-haiku-4-5",
  "anthropic.claude-sonnet-5",
  "anthropic.claude-opus-4-8",
  "anthropic.claude-opus-4-7",
  "anthropic.claude-opus-4-6",
  "anthropic.claude-sonnet-4-6",
  "anthropic.claude-sonnet-4-5",
  "anthropic.claude-haiku-4-5-20251001",
  "anthropic.claude-3-7-sonnet",
  "anthropic.claude-3-5-haiku",
  "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  "us.anthropic.claude-haiku-4-5-20251001-v1:0",
];

async function probe(model: string) {
  try {
    const res = await getBedrockClient().messages.create({
      model, max_tokens: 16, messages: [{ role: "user", content: "hi" }],
    });
    const t = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return `OK      ${model}  -> ${JSON.stringify(t.slice(0, 40))}`;
  } catch (e) {
    const m = (e as Error).message;
    const code = m.match(/^(\d{3})/)?.[1] ?? "ERR";
    const reason = m.match(/"message":"([^"]{0,90})/)?.[1] ?? m.slice(0, 80);
    return `${code}     ${model}  -> ${reason}`;
  }
}

async function main() {
  console.log(`region: ${process.env.AWS_REGION}`);
  console.log(`bearer token present: ${Boolean(process.env.AWS_BEARER_TOKEN_BEDROCK)}`);
  console.log("\nMessages API (403 = model exists but not enabled; 404 = no such model):");
  const results = await Promise.all(CANDIDATES.map(probe));
  results.forEach((r) => console.log("  " + r));

  console.log("\nTitan embeddings:");
  try {
    const v = await embed("2 bedroom apartment in Dubai Marina");
    console.log(`  OK  ${v.length} dims`);
  } catch (e) {
    console.log(`  FAILED  ${(e as Error).message.slice(0, 200)}`);
  }
}
main();
