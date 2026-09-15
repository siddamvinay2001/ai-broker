import "dotenv/config";
import assert from "node:assert/strict";
import prisma from "@/lib/prisma";
import { retrieveProperties, retrieveCommunities } from "@/lib/retrieval";
import { EMPTY_INTENT, type BuyerIntent } from "@/lib/types/intent";

const intent = (o: Partial<BuyerIntent>): BuyerIntent => ({ ...EMPTY_INTENT, ...o });

async function main() {
  const budget = intent({ budgetMax: 3_000_000, listingType: "BUY" });
  const res = await retrieveProperties(budget, null, 20);
  assert.ok(res.length > 0, "budget search returned nothing");
  const over = res.filter((p) => p.price > 3_000_000 * 1.1);
  assert.equal(over.length, 0, `budget breach: ${over.map((p) => `${p.refNo}@${p.price}`).join(", ")}`);
  assert.ok(res.every((p) => p.listingType === "BUY"), "listingType filter leaked");
  console.log(`  budget<=3M BUY -> ${res.length} results, max price AED ${Math.max(...res.map((p) => p.price)).toLocaleString()}`);

  const villas = await retrieveProperties(intent({ propertyTypes: ["VILLA", "MANSION"] }), null, 20);
  assert.ok(villas.every((p) => ["VILLA", "MANSION"].includes(p.propertyType)), "propertyType filter leaked");
  console.log(`  VILLA|MANSION -> ${villas.length} results`);

  const rent = await retrieveProperties(intent({ listingType: "RENT", budgetMax: 200_000 }), null, 20);
  assert.ok(rent.every((p) => p.listingType === "RENT" && p.price <= 220_000), "rent filter leaked");
  console.log(`  RENT<=200k/yr -> ${rent.length} results`);

  const beds = await retrieveProperties(intent({ bedsMin: 3 }), null, 20);
  assert.ok(beds.every((p) => p.beds >= 3), "bedsMin filter leaked");
  console.log(`  beds>=3 -> ${beds.length} results`);

  const tight = await retrieveProperties(intent({ budgetMax: 800_000, listingType: "BUY" }), null, 20);
  assert.ok(tight.every((p) => p.price <= 880_000), "tight budget leaked");
  console.log(`  budget<=800k BUY -> ${tight.length} results (${tight.map((p) => p.refNo).join(", ")})`);

  const comms = await retrieveCommunities(null, 3);
  assert.equal(comms.length, 3, "expected 3 communities");
  console.log(`  communities -> ${comms.map((c) => c.name).join(", ")}`);

  console.log("\nretrieval: ALL PASS");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
