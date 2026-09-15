import { SkeletonBar, SkeletonRow } from "@/components/discover/Skeleton";

export function DiscoverSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto mb-16 max-w-3xl text-center">
        <SkeletonBar className="mx-auto mb-4 h-3 w-40" />
        <SkeletonBar className="mx-auto h-8 w-full max-w-xl" />
      </div>

      <div className="space-y-14">
        <SkeletonRow cards={3} />
        <SkeletonRow cards={6} />
        <SkeletonRow cards={3} />
      </div>
    </div>
  );
}
