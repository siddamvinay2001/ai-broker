/// Plain runnable script - no test framework installed.
/// Run with: npx tsx src/lib/__tests__/investment.test.ts
import assert from "node:assert/strict";
import {
  computeInvestment,
  computePaymentSchedule,
  estimateAnnualRent,
  formatAed,
  formatAedCompact,
  parsePaymentPlan,
  type PropertyFinancials,
} from "@/lib/investment";

function noNaNOrInfinity(value: unknown, path: string): void {
  if (typeof value === "number") {
    assert.ok(
      Number.isFinite(value),
      `${path} must be finite, got ${value}`,
    );
  }
}

// --- 1. Ready 2BR Marina apartment sale (hand-verified numbers) ------------
{
  const marinaApartment: PropertyFinancials = {
    listingType: "BUY",
    price: 2_850_000,
    sizeSqft: 1_100,
    serviceChargePerSqft: 18,
    communityAvgRentPerSqft: 130,
  };

  const result = computeInvestment(marinaApartment);

  // rent = 130 * 1100 = 143,000
  assert.equal(result.estimatedAnnualRent, 143_000);
  // gross yield = 143,000 / 2,850,000 * 100 = 5.0175...% -> 5.0
  assert.equal(result.grossYieldPct, 5.0);
  // service charge = 18 * 1100 = 19,800
  assert.equal(result.annualServiceCharge, 19_800);
  // net income = 143,000 - 19,800 - (5% * 143,000) - (5% * 143,000)
  //            = 143,000 - 19,800 - 7,150 - 7,150 = 108,900
  // net yield = 108,900 / 2,850,000 * 100 = 3.8210...% -> 3.8
  assert.equal(result.netYieldPct, 3.8);
  // DLD fee = 2,850,000 * 4% + 580 = 114,000 + 580 = 114,580
  assert.equal(result.dldFee, 114_580);
  // total acquisition = 2,850,000 + 114,580 + (2% * 2,850,000 = 57,000) = 3,021,580
  assert.equal(result.totalAcquisitionCost, 3_021_580);
  assert.equal(result.goldenVisaEligible, true); // 2.85M >= 2M threshold
  // price per sqft = 2,850,000 / 1,100 = 2590.9... -> 2591
  assert.equal(result.pricePerSqft, 2_591);
  assert.ok(result.assumptions.length > 0);
  Object.entries(result).forEach(([k, v]) => noNaNOrInfinity(v, k));

  console.log("PASS: ready 2BR Marina apartment sale figures hand-verified");
}

// --- 2. RENT listing: price IS the annual rent -----------------------------
{
  const rentalUnit: PropertyFinancials = {
    listingType: "RENT",
    price: 180_000,
    sizeSqft: 900,
    serviceChargePerSqft: 15,
    communityAvgRentPerSqft: 140, // must be ignored for RENT
  };

  assert.equal(estimateAnnualRent(rentalUnit), 180_000);

  const result = computeInvestment(rentalUnit);
  assert.equal(result.estimatedAnnualRent, 180_000);
  assert.equal(result.annualServiceCharge, 13_500); // 15 * 900
  // Purchase-only concepts must not be fabricated off an annual rent figure.
  assert.equal(result.grossYieldPct, null);
  assert.equal(result.netYieldPct, null);
  assert.equal(result.dldFee, null);
  assert.equal(result.totalAcquisitionCost, null);
  assert.equal(result.goldenVisaEligible, false);
  assert.ok(
    result.assumptions.some((a) => /not applicable to a RENT listing/i.test(a)),
  );
  Object.entries(result).forEach(([k, v]) => noNaNOrInfinity(v, k));

  console.log("PASS: RENT listing treats price as annual rent, not a sale price");
}

// --- 3. Off-plan property with a parseable payment plan --------------------
{
  const plan = "20% down, 40% during construction, 40% on handover";
  const milestones = parsePaymentPlan(plan);

  assert.equal(milestones.length, 3);
  const totalPct = milestones.reduce((sum, m) => sum + m.pct, 0);
  assert.equal(totalPct, 100);
  assert.equal(milestones[0].pct, 20);
  assert.equal(milestones[1].pct, 40);
  assert.equal(milestones[2].pct, 40);

  const schedule = computePaymentSchedule(1_500_000, plan, "2027-06-01");
  assert.equal(schedule.warning, null); // sums to exactly 100
  assert.equal(schedule.milestones.length, 3);
  assert.equal(schedule.milestones[0].amountAed, 300_000); // 20% of 1.5M
  assert.equal(schedule.milestones[1].amountAed, 600_000); // 40% of 1.5M
  assert.equal(schedule.milestones[2].amountAed, 600_000); // 40% of 1.5M
  // handover milestone should carry a handover-dated due label
  assert.match(schedule.milestones[2].dueLabel, /handover/i);
  assert.match(schedule.milestones[2].dueLabel, /2027/);

  const offplanProperty: PropertyFinancials = {
    listingType: "OFFPLAN",
    price: 1_500_000,
    sizeSqft: 1_200,
    serviceChargePerSqft: 16,
    communityAvgRentPerSqft: 110,
    handoverDate: "2027-06-01",
    paymentPlan: plan,
  };
  const investment = computeInvestment(offplanProperty);
  // off-plan rent is still estimated from the community average, same as BUY
  assert.equal(investment.estimatedAnnualRent, 110 * 1_200);
  Object.entries(investment).forEach(([k, v]) => noNaNOrInfinity(v, k));

  console.log("PASS: off-plan payment plan parses and schedules to 100%");
}

// --- 4. Malformed payment plan never throws, returns [] --------------------
{
  assert.deepEqual(parsePaymentPlan("mostly due at handover, rest whenever"), []);
  assert.deepEqual(parsePaymentPlan(""), []);
  assert.deepEqual(parsePaymentPlan(null), []);
  assert.deepEqual(parsePaymentPlan(undefined), []);
  assert.deepEqual(parsePaymentPlan("gibberish text with no percentages"), []);

  const schedule = computePaymentSchedule(1_000_000, "gibberish", null);
  assert.deepEqual(schedule.milestones, []);
  assert.equal(schedule.warning, null);

  console.log("PASS: malformed payment plan strings return [] without throwing");
}

// --- 4b. Payment plan that doesn't sum to 100 gets flagged, not thrown -----
{
  const plan = "30% down, 30% during construction, 30% on handover"; // sums to 90
  const schedule = computePaymentSchedule(1_000_000, plan, null);
  assert.equal(schedule.milestones.length, 3);
  assert.ok(schedule.warning !== null);
  assert.match(schedule.warning!, /90/);

  console.log("PASS: payment plan not summing to 100 is flagged via warning");
}

// --- 5. Zero price / zero size guards return null, never NaN/Infinity -----
{
  const zeroPrice: PropertyFinancials = {
    listingType: "BUY",
    price: 0,
    sizeSqft: 1_000,
    serviceChargePerSqft: 15,
    communityAvgRentPerSqft: 100,
  };
  const zeroPriceResult = computeInvestment(zeroPrice);
  assert.equal(zeroPriceResult.grossYieldPct, null);
  assert.equal(zeroPriceResult.netYieldPct, null);
  assert.equal(zeroPriceResult.dldFee, null);
  assert.equal(zeroPriceResult.totalAcquisitionCost, null);
  assert.equal(zeroPriceResult.goldenVisaEligible, false);
  assert.equal(zeroPriceResult.pricePerSqft, null);
  Object.entries(zeroPriceResult).forEach(([k, v]) => noNaNOrInfinity(v, k));

  const zeroSize: PropertyFinancials = {
    listingType: "BUY",
    price: 2_000_000,
    sizeSqft: 0,
    serviceChargePerSqft: 15,
    communityAvgRentPerSqft: 100,
  };
  const zeroSizeResult = computeInvestment(zeroSize);
  assert.equal(zeroSizeResult.pricePerSqft, null);
  assert.equal(zeroSizeResult.annualServiceCharge, null);
  assert.equal(zeroSizeResult.estimatedAnnualRent, null);
  assert.equal(zeroSizeResult.grossYieldPct, null);
  assert.equal(zeroSizeResult.netYieldPct, null);
  Object.entries(zeroSizeResult).forEach(([k, v]) => noNaNOrInfinity(v, k));

  const zeroEverything: PropertyFinancials = {
    listingType: "BUY",
    price: 0,
    sizeSqft: 0,
    serviceChargePerSqft: 0,
    communityAvgRentPerSqft: 0,
  };
  const zeroEverythingResult = computeInvestment(zeroEverything);
  Object.entries(zeroEverythingResult).forEach(([k, v]) => noNaNOrInfinity(v, k));

  console.log("PASS: zero price / zero size guards return null, never NaN or Infinity");
}

// --- 6. Formatting helpers ---------------------------------------------------
{
  assert.equal(formatAed(2_850_000), "AED 2,850,000");
  assert.equal(formatAedCompact(2_850_000), "AED 2.85M");
  assert.equal(formatAedCompact(650_000), "AED 650K");
  assert.equal(formatAedCompact(3_000_000), "AED 3M");
  assert.equal(formatAed(Number.NaN), "AED -");
  assert.equal(formatAedCompact(Number.POSITIVE_INFINITY), "AED -");

  console.log("PASS: formatAed / formatAedCompact produce expected strings");
}

console.log("\nAll investment.ts tests passed.");
