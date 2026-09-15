import { EMPTY_INTENT, type BuyerIntent } from "@/lib/types/intent";

/// A deterministic reading of a buyer's brief. This is not a replacement for
/// the model - it is the floor. When Bedrock is unreachable, rate limited, or
/// returns something malformed, the product still understands "AED 3M, 2-bed,
/// rent it out" rather than falling back to showing everything.

const GOLDEN_VISA_THRESHOLD = 2_000_000;

/// Dubai buyers write amounts every possible way: "3M", "AED 3 million",
/// "3,000,000", "800k". One parser handles them all.
function parseAmount(raw: string, unit: string | undefined): number | null {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const u = (unit ?? "").toLowerCase();
  if (u.startsWith("m")) return n * 1_000_000;
  if (u.startsWith("k") || u.startsWith("thousand")) return n * 1_000;
  return n;
}

const AMOUNT = String.raw`(?:aed\s*)?(\d[\d,]*(?:\.\d+)?)\s*(million|thousand|m\b|k\b)?`;

type BudgetRead = { min: number | null; max: number | null; monthly: boolean };

function readBudget(q: string): BudgetRead {
  const monthly = /\b(per month|a month|monthly|\/\s*month|pm\b)\b/.test(q);

  const between = q.match(new RegExp(String.raw`between\s+${AMOUNT}\s+(?:and|to|-)\s+${AMOUNT}`, "i"));
  if (between) {
    const lo = parseAmount(between[1], between[2]);
    const hi = parseAmount(between[3], between[4]);
    if (lo !== null && hi !== null) return { min: Math.min(lo, hi), max: Math.max(lo, hi), monthly };
  }

  // A trailing "+" ("AED 2M+", "3 million plus") is a floor, not a ceiling.
  const trailingPlus = q.match(new RegExp(String.raw`${AMOUNT}\s*(?:\+|plus\b|or more\b|and above\b|upwards\b)`, "i"));
  if (trailingPlus) {
    const v = parseAmount(trailingPlus[1], trailingPlus[2]);
    if (v !== null && v >= 10_000) return { min: v, max: null, monthly };
  }

  const upper = q.match(new RegExp(String.raw`\b(?:under|below|less than|up to|max(?:imum)?|no more than|within|budget of|around|about|roughly|circa)\s+${AMOUNT}`, "i"));
  const lower = q.match(new RegExp(String.raw`\b(?:above|over|more than|at least|from|min(?:imum)?|starting at|north of)\s+${AMOUNT}`, "i"));

  let min = lower ? parseAmount(lower[1], lower[2]) : null;
  let max = upper ? parseAmount(upper[1], upper[2]) : null;

  // A bare amount with no qualifier ("I have AED 3M") reads as a ceiling.
  if (min === null && max === null) {
    const bare = q.match(new RegExp(String.raw`\b(?:aed|budget|have|spend)\D{0,12}?${AMOUNT}`, "i"))
      ?? q.match(new RegExp(String.raw`\b${AMOUNT}`, "i"));
    if (bare) {
      const v = parseAmount(bare[1], bare[2]);
      // Guard against picking up "2 bed" or "3 bathrooms" as a budget.
      if (v !== null && v >= 10_000) max = v;
    }
  }

  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  return { min, max, monthly };
}

const TYPE_PATTERNS: [RegExp, BuyerIntent["propertyTypes"][number]][] = [
  [/\b(villas?)\b/i, "VILLA"],
  [/\b(town\s?houses?)\b/i, "TOWNHOUSE"],
  [/\b(penthouses?)\b/i, "PENTHOUSE"],
  [/\b(duplex(?:es)?)\b/i, "DUPLEX"],
  [/\b(mansions?)\b/i, "MANSION"],
  [/\b(hotel\s+apartments?)\b/i, "HOTEL_APARTMENT"],
  [/\b(offices?|commercial\s+space)\b/i, "OFFICE"],
  [/\b(apartments?|flats?|studios?)\b/i, "APARTMENT"],
];

function readBeds(q: string): { min: number | null; max: number | null } {
  if (/\bstudios?\b/i.test(q)) return { min: 0, max: 0 };

  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
  const wordMatch = q.match(/\b(one|two|three|four|five|six|seven)[\s-]*(?:bed|bedroom|br)\b/i);
  if (wordMatch) {
    const n = words[wordMatch[1].toLowerCase()];
    return { min: n, max: n };
  }

  const plus = q.match(/\b(\d)\s*\+\s*(?:bed|bedroom|br)/i);
  if (plus) return { min: Number(plus[1]), max: null };

  const exact = q.match(/\b(\d)\s*[-\s]?\s*(?:bed(?:room)?s?|br)\b/i);
  if (exact) {
    const n = Number(exact[1]);
    return { min: n, max: n };
  }
  return { min: null, max: null };
}

const LIFESTYLE_PATTERNS: [RegExp, string][] = [
  [/\b(schools?|education)\b/i, "near a school"],
  [/\b(family|families|kids|children)\b/i, "family-friendly"],
  [/\b(beach|sea\s?view|seafront|waterfront|marina view)\b/i, "waterfront"],
  [/\b(walkab(le|ility))\b/i, "walkable"],
  [/\b(metro|tram|public transport)\b/i, "near transport"],
  [/\b(quiet|peaceful|calm)\b/i, "quiet"],
  [/\b(golf)\b/i, "golf"],
  [/\b(gym|pool|amenities)\b/i, "strong amenities"],
  [/\b(nightlife|restaurants|dining)\b/i, "nightlife and dining"],
];

export type KnownCommunity = { slug: string; name: string };

/// Common shorthands Dubai buyers actually type, mapped to seed slugs.
const COMMUNITY_ALIASES: Record<string, string> = {
  jvc: "jumeirah-village-circle",
  marina: "dubai-marina",
  downtown: "downtown-dubai",
  palm: "palm-jumeirah",
  "creek harbour": "dubai-creek-harbour",
  creek: "dubai-creek-harbour",
  "dubai hills": "dubai-hills-estate",
  hills: "dubai-hills-estate",
  ranches: "arabian-ranches",
  "business bay": "business-bay",
};

function readCommunities(q: string, known: KnownCommunity[]): string[] {
  const lower = q.toLowerCase();
  const hits = new Set<string>();

  for (const c of known) {
    if (lower.includes(c.name.toLowerCase()) || lower.includes(c.slug.replace(/-/g, " "))) {
      hits.add(c.name);
    }
  }
  for (const [alias, slug] of Object.entries(COMMUNITY_ALIASES)) {
    if (new RegExp(String.raw`\b${alias}\b`, "i").test(lower)) {
      const match = known.find((c) => c.slug === slug);
      if (match) hits.add(match.name);
    }
  }
  return [...hits];
}

export function parseIntentRules(query: string, known: KnownCommunity[] = []): BuyerIntent {
  const q = query.toLowerCase();

  // Order matters: "rent it out" is a purchase, not a tenancy.
  const investorLet = /\b(rent (it |them )?out|buy to let|rental income|yield|roi|return on investment)\b/.test(q);
  const offPlan = /\b(off[-\s]?plan|payment plan|before handover|under construction|pre[-\s]?launch)\b/.test(q);
  const wantsTenancy = /\b(to rent|for rent|looking to rent|renting|lease|leasing|tenant|rental for me)\b/.test(q) && !investorLet;

  let listingType: BuyerIntent["listingType"] = null;
  if (offPlan) listingType = "OFFPLAN";
  else if (wantsTenancy) listingType = "RENT";
  else if (investorLet || /\b(buy|buying|purchase|purchasing|invest)\b/.test(q)) listingType = "BUY";

  const budget = readBudget(q);
  let budgetMin = budget.min;
  let budgetMax = budget.max;

  // Dubai annual rents top out around AED 2M. A budget well above that with
  // no stated verb is a purchase, not a tenancy.
  const PLAUSIBLE_MAX_ANNUAL_RENT = 1_000_000;

  // A monthly figure is a rent quote; our prices are annual.
  if (budget.monthly) {
    if (budgetMin !== null) budgetMin *= 12;
    if (budgetMax !== null) budgetMax *= 12;
    if (listingType === null) listingType = "RENT";
  }

  if (listingType === null && !budget.monthly) {
    const ceiling = budgetMax ?? budgetMin;
    if (ceiling !== null && ceiling > PLAUSIBLE_MAX_ANNUAL_RENT) listingType = "BUY";
  }

  const goals: BuyerIntent["goals"] = [];
  const goldenVisa = /\bgolden\s?visa\b/.test(q);
  if (goldenVisa) goals.push("GOLDEN_VISA");
  if (investorLet) goals.push("INVESTMENT", "RENTAL_YIELD");
  if (/\b(flip|resell|resale|capital appreciation|appreciation)\b/.test(q)) goals.push("FLIP");
  if (/\b(live in|move in|family home|for my family|my home|end user)\b/.test(q)) goals.push("END_USE");

  // The Golden Visa threshold is a hard floor, so it overrides a lower budget.
  if (goldenVisa) budgetMin = Math.max(budgetMin ?? 0, GOLDEN_VISA_THRESHOLD);

  const propertyTypes = [...new Set(
    TYPE_PATTERNS.filter(([re]) => re.test(q)).map(([, t]) => t),
  )];

  const beds = readBeds(q);
  const lifestyle = [...new Set(
    LIFESTYLE_PATTERNS.filter(([re]) => re.test(q)).map(([, label]) => label),
  )];

  const languageMatch = q.match(/\b(?:speaks?|speaking|in)\s+(arabic|russian|hindi|urdu|mandarin|chinese|french|german|english)\b/i);

  return {
    ...EMPTY_INTENT,
    budgetMin,
    budgetMax,
    listingType,
    propertyTypes,
    bedsMin: beds.min,
    bedsMax: beds.max,
    communities: readCommunities(query, known),
    goals: [...new Set(goals)],
    lifestyle,
    languagePreference: languageMatch ? languageMatch[1] : null,
    timeline: null,
    summary: buildSummary({ budgetMin, budgetMax, listingType, propertyTypes, beds, goals }),
  };
}

function buildSummary(p: {
  budgetMin: number | null; budgetMax: number | null;
  listingType: BuyerIntent["listingType"];
  propertyTypes: BuyerIntent["propertyTypes"];
  beds: { min: number | null; max: number | null };
  goals: BuyerIntent["goals"];
}): string {
  const aed = (n: number) => `AED ${new Intl.NumberFormat("en-US").format(Math.round(n))}`;
  const parts: string[] = [];

  if (p.beds.min === 0 && p.beds.max === 0) parts.push("a studio");
  else if (p.beds.min !== null) parts.push(`a ${p.beds.min}-bedroom`);

  const type = p.propertyTypes[0]?.toLowerCase().replace(/_/g, " ");
  if (type) parts.push(type);
  else if (parts.length === 0) parts.push("a property");

  let s = `You're looking for ${parts.join(" ")}`;
  if (p.listingType === "RENT") s += " to rent";
  else if (p.listingType === "OFFPLAN") s += " off-plan";

  if (p.budgetMax !== null && p.budgetMin !== null) s += ` between ${aed(p.budgetMin)} and ${aed(p.budgetMax)}`;
  else if (p.budgetMax !== null) s += ` up to ${aed(p.budgetMax)}`;
  else if (p.budgetMin !== null) s += ` from ${aed(p.budgetMin)}`;

  if (p.goals.includes("GOLDEN_VISA")) s += ", with the Golden Visa threshold in mind";
  else if (p.goals.includes("RENTAL_YIELD")) s += ", focused on rental yield";

  return s + ".";
}
