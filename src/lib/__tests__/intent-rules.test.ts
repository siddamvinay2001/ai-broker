import assert from "node:assert/strict";
import { parseIntentRules, type KnownCommunity } from "@/lib/intent-rules";

const KNOWN: KnownCommunity[] = [
  { slug: "dubai-marina", name: "Dubai Marina" },
  { slug: "downtown-dubai", name: "Downtown Dubai" },
  { slug: "palm-jumeirah", name: "Palm Jumeirah" },
  { slug: "jumeirah-village-circle", name: "Jumeirah Village Circle (JVC)" },
  { slug: "dubai-hills-estate", name: "Dubai Hills Estate" },
  { slug: "business-bay", name: "Business Bay" },
  { slug: "arabian-ranches", name: "Arabian Ranches" },
  { slug: "dubai-creek-harbour", name: "Dubai Creek Harbour" },
];

const p = (q: string) => parseIntentRules(q, KNOWN);
let n = 0;
const check = (label: string, fn: () => void) => { fn(); n++; console.log(`  PASS  ${label}`); };

// The four example chips on the landing page must all parse correctly.
check("chip 1: AED 3M, 2-bed to rent out, family, school", () => {
  const r = p("AED 3M, 2-bed I can rent out, family-friendly, near a good school");
  assert.equal(r.budgetMax, 3_000_000);
  assert.equal(r.bedsMin, 2);
  assert.equal(r.listingType, "BUY", "rent it OUT is a purchase, not a tenancy");
  assert.ok(r.goals.includes("RENTAL_YIELD"));
  assert.ok(r.lifestyle.includes("family-friendly"));
  assert.ok(r.lifestyle.includes("near a school"));
});

check("chip 2: beachfront villa on the Palm above AED 30M", () => {
  const r = p("Beachfront villa on the Palm, budget is flexible above AED 30M");
  assert.equal(r.budgetMin, 30_000_000);
  assert.deepEqual(r.propertyTypes, ["VILLA"]);
  assert.ok(r.communities.includes("Palm Jumeirah"), `got ${JSON.stringify(r.communities)}`);
});

check("chip 3: off-plan with payment plan, flip before handover", () => {
  const r = p("Off-plan with a payment plan, I want to flip before handover");
  assert.equal(r.listingType, "OFFPLAN");
  assert.ok(r.goals.includes("FLIP"));
});

check("chip 4: Golden Visa floor", () => {
  const r = p("I need AED 2M+ to qualify for the Golden Visa");
  assert.ok(r.goals.includes("GOLDEN_VISA"));
  assert.ok(r.budgetMin !== null && r.budgetMin >= 2_000_000, `budgetMin was ${r.budgetMin}`);
});

check("trailing plus is a floor, not a ceiling", () => {
  const r = p("I need AED 2M+ to qualify for the Golden Visa");
  assert.equal(r.budgetMin, 2_000_000);
  assert.equal(r.budgetMax, null, `"2M+" must not become a ceiling, got ${r.budgetMax}`);
  const r2 = p("looking at 5 million plus for a villa");
  assert.equal(r2.budgetMin, 5_000_000);
  assert.equal(r2.budgetMax, null);
});

check("studio maps to zero bedrooms", () => {
  const r = p("cheap studio in JVC under 700k");
  assert.equal(r.bedsMin, 0);
  assert.equal(r.bedsMax, 0);
  assert.equal(r.budgetMax, 700_000);
  assert.ok(r.communities.includes("Jumeirah Village Circle (JVC)"));
});

check("monthly rent converts to annual and implies RENT", () => {
  const r = p("looking to rent, around 15k per month");
  assert.equal(r.listingType, "RENT");
  assert.equal(r.budgetMax, 180_000, "15k/month should become AED 180,000/year");
});

check("between X and Y reads both bounds", () => {
  const r = p("apartment between 2M and 4M in Downtown Dubai");
  assert.equal(r.budgetMin, 2_000_000);
  assert.equal(r.budgetMax, 4_000_000);
  assert.ok(r.communities.includes("Downtown Dubai"));
});

check("bed count is not mistaken for a budget", () => {
  const r = p("3 bedroom townhouse");
  assert.equal(r.bedsMin, 3);
  assert.equal(r.budgetMax, null, `3 bedrooms leaked into budget as ${r.budgetMax}`);
  assert.deepEqual(r.propertyTypes, ["TOWNHOUSE"]);
});

check("word-form bedrooms and language preference", () => {
  const r = p("two bedroom apartment, broker who speaks Arabic");
  assert.equal(r.bedsMin, 2);
  assert.equal(r.languagePreference?.toLowerCase(), "arabic");
});

check("shorthand community aliases resolve", () => {
  assert.ok(p("villa in the Ranches").communities.includes("Arabian Ranches"));
  assert.ok(p("apartment in Marina").communities.includes("Dubai Marina"));
  assert.ok(p("flat near Creek Harbour").communities.includes("Dubai Creek Harbour"));
});

check("summary is second person and non-empty", () => {
  const r = p("AED 3M, 2-bed I can rent out");
  assert.ok(r.summary.startsWith("You"), r.summary);
  assert.ok(r.summary.length > 20);
  console.log(`        -> ${r.summary}`);
});

check("gibberish degrades without throwing", () => {
  const r = p("asdf qwerty zzz");
  assert.equal(r.budgetMax, null);
  assert.equal(r.listingType, null);
  assert.deepEqual(r.propertyTypes, []);
});

console.log(`\nintent-rules: ${n} checks passed.`);
