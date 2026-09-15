import "dotenv/config";
import assert from "node:assert/strict";
import prisma from "@/lib/prisma";
import { retrieveProperties, selectCommunities } from "@/lib/retrieval";
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

  // Areas must follow the brief, not a fixed yield ranking.
  const marinaIntent = intent({ communities: ["Dubai Marina"] });
  const marinaProps = await retrieveProperties(marinaIntent, null, 6);
  const marinaComms = await selectCommunities(marinaIntent, marinaProps, 3);
  assert.equal(marinaComms[0].name, "Dubai Marina", `named area must lead, got ${marinaComms[0].name}`);
  console.log(`  named "Dubai Marina" -> ${marinaComms.map((c) => c.name).join(", ")}`);

  const palmIntent = intent({ communities: ["Palm Jumeirah"] });
  const palmProps = await retrieveProperties(palmIntent, null, 6);
  const palmComms = await selectCommunities(palmIntent, palmProps, 3);
  assert.equal(palmComms[0].name, "Palm Jumeirah", `named area must lead, got ${palmComms[0].name}`);
  assert.notDeepEqual(
    marinaComms.map((c) => c.slug),
    palmComms.map((c) => c.slug),
    "different briefs must not return identical areas",
  );
  console.log(`  named "Palm Jumeirah" -> ${palmComms.map((c) => c.name).join(", ")}`);

  // The lead area should be one the recommended homes are actually in.
  const yieldIntent = intent({ goals: ["RENTAL_YIELD"], listingType: "BUY", budgetMax: 1_000_000 });
  const yieldProps = await retrieveProperties(yieldIntent, null, 6);
  const yieldComms = await selectCommunities(yieldIntent, yieldProps, 3);
  const propSlugs = new Set(yieldProps.map((p) => p.communitySlug));
  assert.ok(propSlugs.has(yieldComms[0].slug), "lead area must contain a recommended home");
  console.log(`  yield brief -> ${yieldComms.map((c) => c.name).join(", ")}`);

  console.log("\nretrieval: ALL PASS");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
