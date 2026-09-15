"use client";

import { motion } from "motion/react";
import { SectionEyebrow } from "@/components/discover/Chip";
import { SkeletonBar } from "@/components/discover/Skeleton";

export type NarrativeStatus = "pending" | "streaming" | "done" | "unavailable";

type NarrativeSectionProps = {
  text: string;
  status: NarrativeStatus;
};

export function NarrativeSection({ text, status }: NarrativeSectionProps) {
  if (status === "unavailable") return null;

  const paragraphs = text.split(/\n{2,}/).filter(Boolean);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-3xl px-6 py-12 sm:px-8"
    >
      <div className="rounded-2xl border border-hairline bg-surface/40 p-6 sm:p-8">
        <SectionEyebrow>The read</SectionEyebrow>

        {status === "pending" ? (
          <div>
            <SkeletonBar className="mb-2 h-4 w-full" />
            <SkeletonBar className="mb-2 h-4 w-full" />
            <SkeletonBar className="h-4 w-2/3" />
          </div>
        ) : (
          <div className="space-y-4 text-base leading-relaxed text-ink-muted sm:text-lg">
            {paragraphs.length > 0
              ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
              : null}
            {status === "streaming" && (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-accent align-middle"
              />
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
}
