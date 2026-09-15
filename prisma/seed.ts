import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import prisma from "../src/lib/prisma";
import type { CompletionStatus, Furnishing, ListingType, PropertyType } from "@prisma/client";

type SeedCommunity = {
  slug: string; name: string; description: string;
  avgPricePerSqft: number; avgRentPerSqft: number; avgGrossYield: number;
  serviceChargeAvg: number; lifestyleTags: string[]; schools: string[];
  metroAccess: string; beachProximity: string; heroImage: string;
};

type SeedProperty = {
  refNo: string; title: string; description: string;
  listingType: ListingType; propertyType: PropertyType; communitySlug: string;
  price: number; beds: number; baths: number; sizeSqft: number;
  serviceChargePerSqft: number; amenities: string[]; view: string;
  furnishing: Furnishing; developer: string;
  handoverDate: string | null; paymentPlan: string | null;
  completionStatus: CompletionStatus; dldPermit: string; images: string[];
};

type SeedBroker = {
  slug: string; name: string; photo: string; languages: string[];
  specializationCommunities: string[]; specializationTypes: string[];
  dealsClosed: number; avgDealSize: number; rating: number;
  yearsExperience: number; reraBrn: string; bio: string;
};

type SeedFile = {
  communities: SeedCommunity[];
  properties: SeedProperty[];
  brokers: SeedBroker[];
};

/// Handover is a calendar day, not an instant. Anchoring to midnight UTC keeps
/// it from drifting a day in either direction when rendered.
function calendarDay(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid handoverDate: ${value}`);
  return date;
}

async function main() {
  const file = join(process.cwd(), "prisma", "seed-data.json");
  const data = JSON.parse(readFileSync(file, "utf8")) as SeedFile;

  // Truncate rather than upsert: the dataset is curated and small, so a clean
  // reseed is more predictable than reconciling changed rows.
  await prisma.enquiry.deleteMany();
  await prisma.property.deleteMany();
  await prisma.community.deleteMany();
  await prisma.broker.deleteMany();

  const communityIdBySlug = new Map<string, string>();
  for (const c of data.communities) {
    const created = await prisma.community.create({
      data: {
        slug: c.slug, name: c.name, description: c.description,
        avgPricePerSqft: c.avgPricePerSqft, avgRentPerSqft: c.avgRentPerSqft,
        avgGrossYield: c.avgGrossYield, serviceChargeAvg: c.serviceChargeAvg,
        lifestyleTags: c.lifestyleTags, schools: c.schools,
        metroAccess: c.metroAccess, beachProximity: c.beachProximity,
        heroImage: c.heroImage,
      },
      select: { id: true },
    });
    communityIdBySlug.set(c.slug, created.id);
  }

  for (const p of data.properties) {
    const communityId = communityIdBySlug.get(p.communitySlug);
    if (!communityId) throw new Error(`${p.refNo} references unknown community ${p.communitySlug}`);
    await prisma.property.create({
      data: {
        refNo: p.refNo, title: p.title, description: p.description,
        listingType: p.listingType, propertyType: p.propertyType, communityId,
        price: p.price, beds: p.beds, baths: p.baths, sizeSqft: p.sizeSqft,
        serviceChargePerSqft: p.serviceChargePerSqft, amenities: p.amenities,
        view: p.view, furnishing: p.furnishing, developer: p.developer,
        handoverDate: calendarDay(p.handoverDate), paymentPlan: p.paymentPlan,
        completionStatus: p.completionStatus, dldPermit: p.dldPermit, images: p.images,
      },
    });
  }

  for (const b of data.brokers) {
    const unknown = b.specializationCommunities.filter((s) => !communityIdBySlug.has(s));
    if (unknown.length) throw new Error(`Broker ${b.slug} references unknown communities: ${unknown.join(", ")}`);
    await prisma.broker.create({ data: { ...b } });
  }

  const [communities, properties, brokers] = await Promise.all([
    prisma.community.count(), prisma.property.count(), prisma.broker.count(),
  ]);
  console.log(`Seeded ${communities} communities, ${properties} properties, ${brokers} brokers.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
