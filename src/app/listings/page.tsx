import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { FiltersBar } from "@/components/listings/FiltersBar";
import { ActiveFilterChips } from "@/components/listings/ActiveFilterChips";
import { ResultsSummary } from "@/components/listings/ResultsSummary";
import { EmptyState } from "@/components/listings/EmptyState";
import { ListingPropertyCard } from "@/components/listings/ListingPropertyCard";
import { parseFilters, type RawSearchParams } from "@/components/listings/filterLogic";

export const metadata: Metadata = {
  title: "Listings | Brick & Musk",
  description: "Browse Dubai properties to buy, rent, or reserve off-plan - filters that actually work.",
};

type ListingsPageProps = {
  searchParams: Promise<RawSearchParams>;
};

function buildOrderBy(sort: string): Prisma.PropertyOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { price: "asc" };
    case "price-desc":
      return { price: "desc" };
    case "beds-desc":
      return { beds: "desc" };
    default:
      return { createdAt: "desc" };
  }
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const rawParams = await searchParams;
  const filters = parseFilters(rawParams);

  const where: Prisma.PropertyWhereInput = { deletedAt: null };
  if (filters.type) where.listingType = filters.type;
  if (filters.propertyClass) where.propertyType = filters.propertyClass;
  if (filters.community) where.community = { slug: filters.community };
  if (filters.beds !== null) where.beds = { gte: filters.beds };
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    where.price = {
      ...(filters.minPrice !== null ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== null ? { lte: filters.maxPrice } : {}),
    };
  }

  const [properties, communities] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: buildOrderBy(filters.sort),
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
    }),
    prisma.community.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const cards = properties.map((p) => ({
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
          <div className="mb-8">
            <p className="mb-3 text-xs font-medium tracking-[0.3em] text-accent">LISTINGS</p>
            <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
              Every filter here actually filters
            </h1>
            <p className="mt-3 max-w-xl text-sm text-ink-muted sm:text-base">
              Change any option below and the URL - and the results - change with it. Bookmark it,
              share it, reload it: what you see is what the filters say.
            </p>
          </div>

          <FiltersBar filters={filters} communities={communities} />

          <div className="mt-8 space-y-6">
            <ResultsSummary count={cards.length} />
            <ActiveFilterChips filters={filters} communities={communities} />
          </div>

          <div className="mt-8">
            {cards.length === 0 ? (
              <EmptyState />
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
