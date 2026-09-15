import Link from "next/link";

export function EmptyState() {
  return (
    <div className="rounded-2xl border border-hairline bg-surface/40 px-6 py-16 text-center">
      <p className="mb-2 font-display text-xl text-ink">Nothing matches these filters</p>
      <p className="mb-6 text-sm text-ink-muted">
        Try widening your price range, or clear the filters to see everything we have.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/listings"
          className="rounded-xl border border-hairline-strong px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
        >
          Clear filters
        </Link>
        <Link
          href="/discover"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-ground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Describe what you want instead
        </Link>
      </div>
    </div>
  );
}
