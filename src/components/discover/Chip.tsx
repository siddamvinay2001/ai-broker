import type { ReactNode } from "react";

type ChipProps = {
  children: ReactNode;
  tone?: "default" | "accent";
};

export function Chip({ children, tone = "default" }: ChipProps) {
  const toneClass =
    tone === "accent"
      ? "border-accent/50 bg-accent-soft text-accent-strong"
      : "border-hairline text-ink-muted";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-medium tracking-[0.3em] text-accent">
      {children}
    </p>
  );
}
