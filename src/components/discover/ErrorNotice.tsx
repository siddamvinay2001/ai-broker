import Link from "next/link";

type ErrorNoticeProps = {
  message: string;
};

export function ErrorNotice({ message }: ErrorNoticeProps) {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center sm:px-8">
      <p className="mb-4 text-xs font-medium tracking-[0.3em] text-accent">
        SOMETHING WENT WRONG
      </p>
      <p className="mb-8 text-lg leading-relaxed text-ink-muted">{message}</p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-2xl border border-hairline-strong px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
      >
        Back to start
      </Link>
    </div>
  );
}
