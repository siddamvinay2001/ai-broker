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

/// True once the embedding backfill has run. The API uses this to decide
/// whether to attempt vector search at all.
export async function embeddingsReady(): Promise<boolean> {
  const [row] = await prisma.$queryRaw<{ missing: bigint }[]>`
    SELECT COUNT(*) AS missing FROM "property" WHERE "embedding" IS NULL
  `;
  return Number(row?.missing ?? 1) === 0;
}
