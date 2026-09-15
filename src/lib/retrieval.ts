import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { BuyerIntent } from "@/lib/types/intent";

/// A stated budget is a signal, not a hard wall - brokers routinely show a
/// little above. 10% is the stretch we allow, and never more: showing an
/// AED 40M penthouse to an AED 3M buyer is exactly the bug we are fixing.
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
    clauses.push(Prisma.sql`p."price" <= ${intent.budgetMax * BUDGET_STRETCH}`);
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

export async function retrieveCommunities(
  queryVector: string | null,
  limit = 3,
): Promise<RetrievedCommunity[]> {
  if (!queryVector) {
    return prisma.$queryRaw<RetrievedCommunity[]>`
      SELECT c.*, NULL::float8 AS "distance"
      FROM "community" c
      ORDER BY c."avgGrossYield" DESC
      LIMIT ${limit}
    `;
  }

  return prisma.$queryRaw<RetrievedCommunity[]>`
    SELECT c.*, (c."embedding" <=> ${queryVector}::vector)::float8 AS "distance"
    FROM "community" c
    WHERE c."embedding" IS NOT NULL
    ORDER BY c."embedding" <=> ${queryVector}::vector
    LIMIT ${limit}
  `;
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
