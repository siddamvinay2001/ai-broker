type SkeletonBarProps = {
  className?: string;
};

export function SkeletonBar({ className = "" }: SkeletonBarProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-full bg-surface ${className}`}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      aria-hidden
      className="rounded-2xl border border-hairline bg-surface/40 p-5"
    >
      <div className="mb-4 aspect-[4/3] w-full animate-pulse rounded-xl bg-surface" />
      <SkeletonBar className="mb-3 h-4 w-3/4" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar key={i} className="mb-2 h-3 w-full last:w-1/2" />
      ))}
    </div>
  );
}

export function SkeletonRow({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
