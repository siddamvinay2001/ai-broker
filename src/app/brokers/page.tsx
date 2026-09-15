import type { Metadata } from "next";
import prisma from "@/lib/prisma";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BrokerListCard } from "@/components/brokers/BrokerListCard";

export const metadata: Metadata = {
  title: "Our Brokers | Majlis",
  description: "Meet the specialists behind Majlis's Dubai portfolio.",
};

export default async function BrokersPage() {
  const brokers = await prisma.broker.findMany({
    where: { deletedAt: null },
    orderBy: { rating: "desc" },
    select: {
      slug: true,
      name: true,
      photo: true,
      rating: true,
      yearsExperience: true,
      dealsClosed: true,
      languages: true,
      specializationCommunities: true,
    },
  });

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16">
          <div className="mb-10">
            <p className="mb-3 text-xs font-medium tracking-[0.3em] text-accent">THE TEAM</p>
            <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
              Brokers who know their patch
            </h1>
            <p className="mt-3 max-w-xl text-sm text-ink-muted sm:text-base">
              Every specialist below closes deals in the communities they&apos;re shown
              alongside - not a generalist call centre.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {brokers.map((broker) => (
              <BrokerListCard key={broker.slug} broker={broker} />
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
