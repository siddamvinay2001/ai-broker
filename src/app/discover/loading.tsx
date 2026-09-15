import { SiteHeader } from "@/components/SiteHeader";
import { DiscoverSkeleton } from "@/components/discover/DiscoverSkeleton";

export default function DiscoverLoading() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <DiscoverSkeleton />
      </main>
    </div>
  );
}
