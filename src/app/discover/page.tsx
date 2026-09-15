"use client";

import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DiscoverResults } from "@/components/discover/DiscoverResults";
import { DiscoverSkeleton } from "@/components/discover/DiscoverSkeleton";

export default function DiscoverPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<DiscoverSkeleton />}>
          <DiscoverResults />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
