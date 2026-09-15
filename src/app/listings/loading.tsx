import { SiteHeader } from "@/components/SiteHeader";
import { SkeletonBar, SkeletonRow } from "@/components/discover/Skeleton";

export default function ListingsLoading() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8 sm:py-16">
          <SkeletonBar className="mb-4 h-3 w-24" />
          <SkeletonBar className="mb-8 h-10 w-full max-w-lg" />
          <div className="mb-8 h-40 animate-pulse rounded-2xl border border-hairline bg-surface/40" />
          <SkeletonRow cards={6} />
        </div>
      </main>
    </div>
  );
}
