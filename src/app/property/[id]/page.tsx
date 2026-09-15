import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import prisma from "@/lib/prisma";
import { computeInvestment, computePaymentSchedule } from "@/lib/investment";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Chip } from "@/components/discover/Chip";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { PropertySpecTable } from "@/components/property/PropertySpecTable";
import { InvestmentPanel } from "@/components/property/InvestmentPanel";
import { PaymentTimeline } from "@/components/property/PaymentTimeline";
import {
  formatAed,
  formatHandover,
  humanizeEnumValue,
  listingTypeLabel,
} from "@/components/format";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
};

async function getProperty(id: string) {
  return prisma.property.findUnique({
    where: { id, deletedAt: null },
    include: { community: true },
  });
}

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) return { title: "Property not found | Brick & Musk" };
  return {
    title: `${property.title} | Brick & Musk`,
    description: property.description.slice(0, 160),
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;
  const property = await getProperty(id);
  if (!property) notFound();

  const investment = computeInvestment({
    listingType: property.listingType,
    price: property.price,
    sizeSqft: property.sizeSqft,
    serviceChargePerSqft: property.serviceChargePerSqft,
    communityAvgRentPerSqft: property.community.avgRentPerSqft,
    handoverDate: property.handoverDate,
    paymentPlan: property.paymentPlan,
  });

  const schedule = property.paymentPlan
    ? computePaymentSchedule(property.price, property.paymentPlan, property.handoverDate)
    : null;

  const handover = formatHandover(
    property.handoverDate ? property.handoverDate.toISOString() : null,
  );
  const priceSuffix = property.listingType === "RENT" ? " / year" : "";

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-14">
          <Link
            href="/discover"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-accent"
          >
            &larr; Back to results
          </Link>

          <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <PropertyGallery images={property.images} title={property.title} />

              <div className="mt-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="accent">{listingTypeLabel(property.listingType)}</Chip>
                  {investment.goldenVisaEligible && <Chip tone="accent">Golden Visa eligible</Chip>}
                  {property.completionStatus === "OFF_PLAN" && handover && (
                    <Chip>Handover {handover}</Chip>
                  )}
                </div>

                <h1 className="mt-4 text-balance font-display text-3xl tracking-tight text-ink sm:text-4xl">
                  {property.title}
                </h1>
                <p className="mt-2 text-sm tracking-wide text-ink-faint uppercase">
                  {property.community.name}
                </p>

                <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-ink-muted">
                  {property.description}
                </p>

                <div className="mt-10 border-t border-hairline pt-8">
                  <PropertySpecTable
                    beds={property.beds}
                    baths={property.baths}
                    sizeSqft={property.sizeSqft}
                    propertyType={property.propertyType}
                    furnishing={property.furnishing}
                    view={property.view}
                    developer={property.developer}
                    completionStatus={property.completionStatus}
                    refNo={property.refNo}
                  />
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-hairline-strong bg-surface-glass p-6 backdrop-blur-md">
                <p className="font-display text-3xl text-ink">
                  {formatAed(property.price)}
                  {priceSuffix && <span className="text-base text-ink-faint">{priceSuffix}</span>}
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  {humanizeEnumValue(property.propertyType)} &middot; {property.beds} bed &middot;{" "}
                  {property.baths} bath
                </p>
              </div>

              <InvestmentPanel investment={investment} />

              {schedule && <PaymentTimeline schedule={schedule} />}
            </aside>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
