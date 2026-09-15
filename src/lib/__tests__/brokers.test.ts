/// Plain runnable script - no test framework installed.
/// Run with: npx tsx src/lib/__tests__/brokers.test.ts
import assert from "node:assert/strict";
import {
  rankBrokers,
  scoreBroker,
  type BrokerProfile,
  type RecommendationContext,
} from "@/lib/brokers";
import { EMPTY_INTENT, type BuyerIntent } from "@/lib/types/intent";

function noNaNOrInfinity(value: unknown, path: string): void {
  if (typeof value === "number") {
    assert.ok(Number.isFinite(value), `${path} must be finite, got ${value}`);
  }
}

const marinaSpecialist: BrokerProfile = {
  id: "b1",
  slug: "amina-marina",
  name: "Amina Khan",
  languages: ["English", "Arabic"],
  specializationCommunities: ["dubai-marina", "jbr"],
  specializationTypes: ["APARTMENT", "PENTHOUSE"],
  dealsClosed: 220,
  avgDealSize: 2_900_000,
  rating: 4.8,
  yearsExperience: 9,
};

const officeSpecialist: BrokerProfile = {
  id: "b2",
  slug: "raj-commercial",
  name: "Raj Patel",
  languages: ["English", "Hindi"],
  specializationCommunities: ["business-bay", "difc"],
  specializationTypes: ["OFFICE"],
  dealsClosed: 150,
  avgDealSize: 6_500_000,
  rating: 4.3,
  yearsExperience: 12,
};

// --- 1. Marina apartment specialist must outrank an office specialist -----
{
  const intent: BuyerIntent = {
    ...EMPTY_INTENT,
    propertyTypes: ["APARTMENT"],
    languagePreference: null,
  };
  const context: RecommendationContext = {
    recommendedCommunitySlugs: ["dubai-marina"],
    medianRecommendedPrice: 2_850_000,
    recommendedPropertyTypes: ["APARTMENT"],
  };

  const ranked = rankBrokers([officeSpecialist, marinaSpecialist], intent, context);

  assert.equal(ranked[0].broker.id, "b1", "Marina apartment specialist should rank first");
  assert.equal(ranked[1].broker.id, "b2");
  assert.ok(ranked[0].score > ranked[1].score);
  assert.ok(
    ranked[0].reasons.some((r) => /marina/i.test(r)),
    "top broker's reasons should mention Marina specialization",
  );
  ranked.forEach((r) => noNaNOrInfinity(r.score, `score for ${r.broker.id}`));

  console.log("PASS: Marina apartment specialist outranks office specialist");
  console.log(`  ${marinaSpecialist.name}: score=${ranked[0].score}, reasons=${JSON.stringify(ranked[0].reasons)}`);
  console.log(`  ${officeSpecialist.name}: score=${ranked[1].score}, reasons=${JSON.stringify(ranked[1].reasons)}`);
}

// --- 2. Community overlap dominates when everything else is neutral -------
{
  const intent: BuyerIntent = { ...EMPTY_INTENT };
  const context: RecommendationContext = {
    recommendedCommunitySlugs: ["dubai-marina", "jbr"],
    medianRecommendedPrice: null,
  };
  const { score, reasons } = scoreBroker(marinaSpecialist, intent, context);
  assert.ok(score > 60, `expected high score from full community overlap, got ${score}`);
  assert.ok(reasons.some((r) => /Marina/.test(r) && /JBR/.test(r)));
  noNaNOrInfinity(score, "score");

  console.log("PASS: full community overlap scores highly and is explained");
}

// --- 3. Language preference match/mismatch ---------------------------------
{
  const context: RecommendationContext = {
    recommendedCommunitySlugs: [],
    medianRecommendedPrice: null,
  };

  const wantsArabic: BuyerIntent = { ...EMPTY_INTENT, languagePreference: "Arabic" };
  const matchResult = scoreBroker(marinaSpecialist, wantsArabic, context);
  assert.ok(matchResult.reasons.some((r) => /Speaks Arabic/i.test(r)));

  const wantsMandarin: BuyerIntent = { ...EMPTY_INTENT, languagePreference: "Mandarin" };
  const mismatchResult = scoreBroker(marinaSpecialist, wantsMandarin, context);
  assert.ok(!mismatchResult.reasons.some((r) => /Speaks/i.test(r)));
  assert.ok(matchResult.score > mismatchResult.score);

  console.log("PASS: language preference match/mismatch affects score and reasons");
}

// --- 4. Price-band fit: close avgDealSize scores well, 10x off scores near zero ---
{
  const context: RecommendationContext = {
    recommendedCommunitySlugs: [],
    medianRecommendedPrice: 3_000_000,
  };
  const intent: BuyerIntent = { ...EMPTY_INTENT };

  const closeBroker: BrokerProfile = { ...marinaSpecialist, avgDealSize: 3_200_000 };
  const farBroker: BrokerProfile = { ...marinaSpecialist, avgDealSize: 30_000_000 };

  const closeResult = scoreBroker(closeBroker, intent, context);
  const farResult = scoreBroker(farBroker, intent, context);

  assert.ok(
    closeResult.reasons.some((r) => /Typical deal size/i.test(r)),
    "close price band should be called out as a reason",
  );
  assert.ok(!farResult.reasons.some((r) => /Typical deal size/i.test(r)));
  assert.ok(closeResult.score > farResult.score);

  console.log("PASS: price-band fit rewards close deal sizes over order-of-magnitude mismatches");
}

// --- 5. No recommended context (cold start) never throws or produces NaN ---
{
  const context: RecommendationContext = {
    recommendedCommunitySlugs: [],
    medianRecommendedPrice: null,
  };
  const { score, reasons } = scoreBroker(marinaSpecialist, EMPTY_INTENT, context);
  noNaNOrInfinity(score, "cold-start score");
  assert.ok(score >= 0 && score <= 100);
  assert.ok(Array.isArray(reasons));

  console.log("PASS: missing context (no recommendations yet) degrades gracefully");
}

console.log("\nAll brokers.ts tests passed.");
