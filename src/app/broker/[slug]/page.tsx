import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BrokerHero } from "@/components/broker/BrokerHero";
import { ListingPropertyCard } from "@/components/listings/ListingPropertyCard";
import { formatAedCompact } from "@/components/format";

type BrokerPageProps = {
  params: Promise<{ slug: string }>;
};

async function getBroker(slug: string) {
  return prisma.broker.findUnique({ where: { slug, deletedAt: null } });
}

export async function generateMetadata({ params }: BrokerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const broker = await getBroker(slug);
  if (!broker) return { title: "Broker not found | Brick & Musk" };
  return {
    title: `${broker.name} | Brick & Musk`,
    description: broker.bio.slice(0, 160),
  };
}

export default async function BrokerPage({ params }: BrokerPageProps) {
  const { slug } = await params;
  const broker = await getBroker(slug);
  if (!broker) notFound();

  const listings =
    broker.specializationCommunities.length > 0
      ? await prisma.property.findMany({
          where: {
            deletedAt: null,
            community: { slug: { in: broker.specializationCommunities } },
          },
          orderBy: { createdAt: "desc" },
          take: 9,
          select: {
            id: true,
            title: true,
            listingType: true,
            propertyType: true,
            price: true,
            beds: true,
            baths: true,
            sizeSqft: true,
            images: true,
            community: { select: { name: true } },
          },
        })
      : [];

  const cards = listings.map((p) => ({
    id: p.id,
    title: p.title,
    listingType: p.listingType,
    propertyType: p.propertyType,
    price: p.price,
    beds: p.beds,
    baths: p.baths,
    sizeSqft: p.sizeSqft,
    images: p.images,
    communityName: p.community.name,
  }));

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16">
          <BrokerHero
            name={broker.name}
            photo={broker.photo}
            bio={broker.bio}
            reraBrn={broker.reraBrn}
            rating={broker.rating}
            yearsExperience={broker.yearsExperience}
            dealsClosed={broker.dealsClosed}
            avgDealSize={formatAedCompact(broker.avgDealSize)}
            languages={broker.languages}
            specializationCommunities={broker.specializationCommunities}
            specializationTypes={broker.specializationTypes}
          />

          <div className="mt-14 border-t border-hairline pt-10">
            <p className="mb-3 text-xs font-medium tracking-[0.3em] text-accent">LIVE LISTINGS</p>
            <h2 className="mb-8 font-display text-2xl tracking-tight text-ink sm:text-3xl">
              Properties in {broker.name.split(" ")[0]}&apos;s communities
            </h2>

            {cards.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No live listings in this broker&apos;s specialization communities right now.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((property) => (
                  <ListingPropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
