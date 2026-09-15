import "dotenv/config";
import prisma from "../src/lib/prisma";
import { embedMany, toPgVector } from "../src/lib/bedrock";

/// What gets embedded decides what can be found. Each blob is written the way
/// a buyer would describe the thing, not the way the database stores it.
function propertyText(p: {
  title: string; description: string; propertyType: string; listingType: string;
  beds: number; baths: number; sizeSqft: number; view: string; furnishing: string;
  developer: string; amenities: string[]; completionStatus: string;
  paymentPlan: string | null; price: number;
  community: { name: string; lifestyleTags: string[]; schools: string[]; beachProximity: string; metroAccess: string };
}) {
  return [
    p.title,
    p.description,
    `${p.beds} bedroom ${p.baths} bathroom ${p.propertyType.toLowerCase().replace(/_/g, " ")} of ${p.sizeSqft} sqft`,
    `Located in ${p.community.name}, Dubai.`,
    `Listing type: ${p.listingType}. Status: ${p.completionStatus}. Price AED ${p.price}.`,
    `View: ${p.view}. Furnishing: ${p.furnishing.toLowerCase().replace(/_/g, " ")}. Developer: ${p.developer}.`,
    p.amenities.length ? `Amenities: ${p.amenities.join(", ")}.` : "",
    p.paymentPlan ? `Payment plan: ${p.paymentPlan}.` : "",
    `Neighbourhood character: ${p.community.lifestyleTags.join(", ")}.`,
    p.community.schools.length ? `Nearby schools: ${p.community.schools.join(", ")}.` : "",
    `${p.community.beachProximity}. ${p.community.metroAccess}.`,
  ].filter(Boolean).join(" ");
}

function communityText(c: {
  name: string; description: string; lifestyleTags: string[]; schools: string[];
  metroAccess: string; beachProximity: string; avgGrossYield: number; avgPricePerSqft: number;
}) {
  return [
    `${c.name}, Dubai.`,
    c.description,
    `Character: ${c.lifestyleTags.join(", ")}.`,
    c.schools.length ? `Schools: ${c.schools.join(", ")}.` : "",
    `${c.beachProximity}. ${c.metroAccess}.`,
    `Average AED ${c.avgPricePerSqft} per sqft with roughly ${c.avgGrossYield}% gross rental yield.`,
  ].filter(Boolean).join(" ");
}

function brokerText(b: {
  name: string; bio: string; languages: string[]; specializationCommunities: string[];
  specializationTypes: string[]; yearsExperience: number; dealsClosed: number;
}) {
  return [
    `${b.name}, Dubai real estate broker.`,
    b.bio,
    `Specializes in ${b.specializationCommunities.join(", ")}.`,
    `Deals in ${b.specializationTypes.map((t) => t.toLowerCase().replace(/_/g, " ")).join(", ")}.`,
    `Speaks ${b.languages.join(", ")}.`,
    `${b.yearsExperience} years experience, ${b.dealsClosed} deals closed.`,
  ].join(" ");
}

/// Vector columns are Unsupported() in the Prisma schema, so they can only be
/// written through raw SQL.
async function writeVectors(table: string, rows: { id: string; vector: number[] }[]) {
  for (const row of rows) {
    await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "embedding" = $1::vector WHERE "id" = $2`,
      toPgVector(row.vector),
      row.id,
    );
  }
}

async function main() {
  const [properties, communities, brokers] = await Promise.all([
    prisma.property.findMany({ include: { community: true } }),
    prisma.community.findMany(),
    prisma.broker.findMany(),
  ]);

  console.log(`Embedding ${communities.length} communities...`);
  const cVecs = await embedMany(communities.map(communityText));
  await writeVectors("community", communities.map((c, i) => ({ id: c.id, vector: cVecs[i] })));

  console.log(`Embedding ${properties.length} properties...`);
  const pVecs = await embedMany(properties.map(propertyText));
  await writeVectors("property", properties.map((p, i) => ({ id: p.id, vector: pVecs[i] })));

  console.log(`Embedding ${brokers.length} brokers...`);
  const bVecs = await embedMany(brokers.map(brokerText));
  await writeVectors("broker", brokers.map((b, i) => ({ id: b.id, vector: bVecs[i] })));

  const [missing] = await prisma.$queryRaw<{ p: bigint; c: bigint; b: bigint }[]>`
    SELECT
      (SELECT COUNT(*) FROM "property"  WHERE "embedding" IS NULL) AS p,
      (SELECT COUNT(*) FROM "community" WHERE "embedding" IS NULL) AS c,
      (SELECT COUNT(*) FROM "broker"    WHERE "embedding" IS NULL) AS b
  `;
  const total = Number(missing.p) + Number(missing.c) + Number(missing.b);
  if (total > 0) throw new Error(`${total} rows still missing embeddings`);
  console.log("All embeddings written and verified.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
