import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { BuyerIntent } from "@/lib/types/intent";

/// A stated budget is usually a signal rather than a hard wall - brokers
/// routinely show a little above. 10% is the most we ever stretch, and only
/// when the visitor left the ceiling soft: "strictly under AED 4M" must never
/// return AED 4.2M.
const BUDGET_STRETCH = 1.1;

export type RetrievedProperty = {
  id: string;
  refNo: string;
  title: string;
  description: string;
  listingType: string;
  propertyType: string;
  price: number;
  beds: number;
  baths: number;
  sizeSqft: number;
  serviceChargePerSqft: number;
  amenities: string[];
  view: string;
  furnishing: string;
  developer: string;
  handoverDate: Date | null;
  paymentPlan: string | null;
  completionStatus: string;
  images: string[];
  communityId: string;
  communitySlug: string;
  communityName: string;
  communityAvgRentPerSqft: number;
  communityAvgGrossYield: number;
  /// Cosine distance, 0 = identical. Null when embeddings are not yet built.
  distance: number | null;
};

export type RetrievedCommunity = {
  id: string;
  slug: string;
  name: string;
  description: string;
  avgPricePerSqft: number;
  avgRentPerSqft: number;
  avgGrossYield: number;
  serviceChargeAvg: number;
  lifestyleTags: string[];
  schools: string[];
  metroAccess: string;
  beachProximity: string;
  heroImage: string;
  distance: number | null;
};

/// Hard filters derived from the extracted intent. These bind in SQL, so a
/// result can never violate a stated constraint no matter what the vector
/// search thinks is semantically close.
function propertyFilters(intent: BuyerIntent): Prisma.Sql[] {
  const clauses: Prisma.Sql[] = [Prisma.sql`p."deletedAt" IS NULL`];

  if (intent.listingType) {
    clauses.push(Prisma.sql`p."listingType" = ${intent.listingType}::"ListingType"`);
  }
  if (intent.propertyTypes.length > 0) {
    clauses.push(
      Prisma.sql`p."propertyType" IN (${Prisma.join(
        intent.propertyTypes.map((t) => Prisma.sql`${t}::"PropertyType"`),
      )})`,
    );
  }
  if (intent.budgetMax !== null) {
    const ceiling = intent.budgetStrict
      ? intent.budgetMax
      : intent.budgetMax * BUDGET_STRETCH;
    clauses.push(Prisma.sql`p."price" <= ${ceiling}`);
  }
  if (intent.budgetMin !== null) {
    clauses.push(Prisma.sql`p."price" >= ${intent.budgetMin}`);
  }
  if (intent.bedsMin !== null) {
    clauses.push(Prisma.sql`p."beds" >= ${intent.bedsMin}`);
  }
  if (intent.bedsMax !== null) {
    clauses.push(Prisma.sql`p."beds" <= ${intent.bedsMax}`);
  }
  if (intent.communities.length > 0) {
    // The parser yields display names; match those or the slug form, so both
    // "Dubai Marina" and "dubai-marina" resolve.
    const needles = intent.communities.map((c) => c.toLowerCase());
    clauses.push(
      Prisma.sql`(LOWER(c."name") IN (${Prisma.join(needles)}) OR LOWER(REPLACE(c."slug", '-', ' ')) IN (${Prisma.join(
        needles.map((n) => n.replace(/-/g, " ")),
      )}))`,
    );
  }
  return clauses;
}

const PROPERTY_COLUMNS = Prisma.sql`
  p."id", p."refNo", p."title", p."description",
  p."listingType"::text AS "listingType",
  p."propertyType"::text AS "propertyType",
  p."price", p."beds", p."baths", p."sizeSqft", p."serviceChargePerSqft",
  p."amenities", p."view",
  p."furnishing"::text AS "furnishing",
  p."developer", p."handoverDate", p."paymentPlan",
  p."completionStatus"::text AS "completionStatus",
  p."images",
  c."id" AS "communityId", c."slug" AS "communitySlug", c."name" AS "communityName",
  c."avgRentPerSqft" AS "communityAvgRentPerSqft",
  c."avgGrossYield" AS "communityAvgGrossYield"
`;

/// Hybrid search: hard filters narrow the candidate set, then the vector
/// ranks what survives. Without an embedding we still return correctly
/// filtered results, just ordered by price - the app degrades, never breaks.
export async function retrieveProperties(
  intent: BuyerIntent,
  queryVector: string | null,
  limit = 8,
): Promise<RetrievedProperty[]> {
  const where = Prisma.join(propertyFilters(intent), " AND ");

  if (!queryVector) {
    return prisma.$queryRaw<RetrievedProperty[]>`
      SELECT ${PROPERTY_COLUMNS}, NULL::float8 AS "distance"
      FROM "property" p
      JOIN "community" c ON c."id" = p."communityId"
      WHERE ${where}
      ORDER BY p."price" ASC
      LIMIT ${limit}
    `;
  }

  return prisma.$queryRaw<RetrievedProperty[]>`
    SELECT ${PROPERTY_COLUMNS},
           (p."embedding" <=> ${queryVector}::vector)::float8 AS "distance"
    FROM "property" p
    JOIN "community" c ON c."id" = p."communityId"
    WHERE ${where} AND p."embedding" IS NOT NULL
    ORDER BY p."embedding" <=> ${queryVector}::vector
    LIMIT ${limit}
  `;
}

/// Areas used to be "top 3 by yield" for every brief, because the vector path
/// was never taken once embeddings were dropped. That made the section a lie:
/// it claimed to match the brief while ignoring it, and could name areas that
/// none of the recommended homes were even in.
///
/// Selection is now derived from the brief and from the homes actually being
/// shown, so the two sections agree with each other.
export async function selectCommunities(
  intent: BuyerIntent,
  recommended: RetrievedProperty[],
  limit = 3,
): Promise<RetrievedCommunity[]> {
  const all = await prisma.$queryRaw<RetrievedCommunity[]>`
    SELECT c.*, NULL::float8 AS "distance" FROM "community" c
  `;

  const named = new Set(intent.communities.map((c) => c.toLowerCase()));
  const wants = intent.lifestyle.map((l) => l.toLowerCase());
  const chasingYield =
    intent.goals.includes("RENTAL_YIELD") || intent.goals.includes("INVESTMENT");

  // Earlier recommendations count for more, so the lead area tends to be the
  // one the best-matching home sits in.
  const propertyWeight = new Map<string, number>();
  recommended.forEach((p, index) => {
    propertyWeight.set(
      p.communitySlug,
      (propertyWeight.get(p.communitySlug) ?? 0) + Math.max(6 - index, 1),
    );
  });

  const scored = all.map((c) => {
    let score = 0;

    // The visitor naming an area outranks everything else.
    if (named.has(c.name.toLowerCase()) || named.has(c.slug.replace(/-/g, " "))) {
      score += 1000;
    }

    score += (propertyWeight.get(c.slug) ?? 0) * 25;

    const haystack = [...c.lifestyleTags, ...c.schools, c.beachProximity, c.metroAccess]
      .join(" ")
      .toLowerCase();
    for (const want of wants) {
      const key = want.replace(/^near an? /, "").trim();
      if (key && haystack.includes(key)) score += 30;
    }
    if (wants.some((w) => w.includes("school")) && c.schools.length > 0) score += 40;

    // Yield only decides things for someone who said they care about it;
    // otherwise it is a faint tiebreak so ordering stays stable.
    score += c.avgGrossYield * (chasingYield ? 12 : 1);

    return { community: c, score };
  });

  const ranked = scored.sort((a, b) => b.score - a.score);
  const lead = ranked[0];
  if (!lead || limit <= 1) return ranked.slice(0, limit).map((s) => s.community);

  // Filling the remaining slots by yield alone made them identical for every
  // brief. Prefer areas that share the lead area's character instead, so the
  // supporting picks read as "and these are like it" rather than a fixed list.
  const leadTags = new Set(lead.community.lifestyleTags.map((t) => t.toLowerCase()));
  const rest = ranked.slice(1).map((entry) => {
    const overlap = entry.community.lifestyleTags.filter((t) =>
      leadTags.has(t.toLowerCase()),
    ).length;
    return { ...entry, score: entry.score + overlap * 35 };
  });

  return [lead, ...rest.sort((a, b) => b.score - a.score)]
    .slice(0, limit)
    .map((s) => s.community);
}

/// A brief that matches nothing is a dead end for the visitor, so we relax the
/// softest constraints in order and say what we dropped. Budget is relaxed
/// last and never removed - showing someone a home they cannot afford is worse
/// than showing them nothing.
export type RelaxedSearch = {
  properties: RetrievedProperty[];
  relaxations: string[];
  /// How many of `properties` satisfied the brief with no widening at all.
  exactCount: number;
};

/// One exact match is technically correct and a poor viewing. We widen until
/// there is enough to compare, or we run out of constraints to widen.
const MIN_USEFUL_RESULTS = 3;

export async function retrievePropertiesWithFallback(
  intent: BuyerIntent,
  queryVector: string | null,
  limit = 6,
): Promise<RelaxedSearch> {
  // Widening the property type is a real substitution a broker would make.
  // Widening the bedroom count by one is too. Changing BUY into RENT is not -
  // it mixes sale prices with annual rents and is a category error, so
  // listingType and budget are never relaxed.
  const widenBeds = (by: number): BuyerIntent => ({
    ...intent,
    propertyTypes: [],
    bedsMin: intent.bedsMin === null ? null : Math.max(0, intent.bedsMin - by),
    bedsMax: intent.bedsMax === null ? null : intent.bedsMax + by,
  });

  const attempts: { intent: BuyerIntent; note: string | null }[] = [
    { intent, note: null },
    { intent: { ...intent, propertyTypes: [] }, note: "widened the property type" },
    { intent: widenBeds(1), note: "allowed one bedroom either side" },
    { intent: { ...intent, propertyTypes: [], bedsMin: null, bedsMax: null }, note: "set the bedroom count aside" },
    { intent: { ...intent, propertyTypes: [], bedsMin: null, bedsMax: null, communities: [] },
      note: intent.communities.length
        ? `looked beyond ${intent.communities.join(" and ")}`
        : null },
  ];

  // Exact matches always lead. Relaxed attempts only ever APPEND near-misses
  // behind them - a wider search must never displace a precise hit.
  const seen = new Set<string>();
  const properties: RetrievedProperty[] = [];
  const relaxations: string[] = [];
  let exactCount = 0;

  for (const [index, attempt] of attempts.entries()) {
    if (properties.length >= MIN_USEFUL_RESULTS) break;

    const batch = await retrieveProperties(attempt.intent, queryVector, limit);
    const added = batch.filter((p) => !seen.has(p.id));
    if (added.length === 0) continue;

    // Only name a relaxation once it actually contributed a result.
    if (attempt.note) relaxations.push(attempt.note);
    if (index === 0) exactCount = added.length;
    for (const p of added) {
      seen.add(p.id);
      properties.push(p);
      if (properties.length >= limit) break;
    }
  }

  // Last resort: a floor price that excludes the entire catalogue is almost
  // always a misread brief, not a real requirement. Returning nothing is the
  // worst outcome, so drop it rather than show an empty page.
  if (properties.length === 0 && intent.budgetMin !== null) {
    const lastDitch = await retrieveProperties(
      { ...intent, propertyTypes: [], bedsMin: null, bedsMax: null, communities: [], budgetMin: null },
      queryVector,
      limit,
    );
    if (lastDitch.length > 0) {
      return { properties: lastDitch, relaxations: ["set aside the minimum price"], exactCount: 0 };
    }
  }

  return { properties, relaxations, exactCount };
}
