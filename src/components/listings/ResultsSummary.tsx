import Link from "next/link";

type ResultsSummaryProps = {
  count: number;
};

export function ResultsSummary({ count }: ResultsSummaryProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <p className="font-display text-xl text-ink">
        {count} {count === 1 ? "home matches" : "homes match"}
      </p>
      <Link
        href="/#discover"
        className="text-sm text-ink-muted underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-accent"
      >
        Not sure? Describe what you want instead
      </Link>
    </div>
  );
}
