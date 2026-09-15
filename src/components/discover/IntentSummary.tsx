"use client";

import { motion } from "motion/react";
import { Chip, SectionEyebrow } from "@/components/discover/Chip";
import {
  bedsRangeLabel,
  budgetRangeLabel,
  humanizeEnumValue,
  listingTypeLabel,
} from "@/components/format";
import { SkeletonBar } from "@/components/discover/Skeleton";
import type { WireIntent } from "@/components/discover/types";

type IntentSummaryProps = {
  query: string;
  intent: WireIntent | null;
};

export function IntentSummary({ query, intent }: IntentSummaryProps) {
  if (!intent) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-14 text-center sm:px-8 sm:pt-20">
        <SkeletonBar className="mx-auto mb-4 h-3 w-40" />
        <SkeletonBar className="mx-auto h-8 w-full max-w-xl" />
      </div>
    );
  }

  const budget = budgetRangeLabel(intent.budgetMin, intent.budgetMax);
  const beds = bedsRangeLabel(intent.bedsMin, intent.bedsMax);
  const listing = listingTypeLabel(intent.listingType);
  const chips: string[] = [];
  if (budget) chips.push(budget);
  if (listing) chips.push(listing);
  if (beds) chips.push(beds);
  intent.propertyTypes.forEach((t) => chips.push(humanizeEnumValue(t)));
  intent.communities.forEach((c) => chips.push(c));
  intent.goals.forEach((g) => chips.push(humanizeEnumValue(g)));
  intent.lifestyle.forEach((l) => chips.push(l));
  if (intent.languagePreference) chips.push(`Speaks ${intent.languagePreference}`);
  if (intent.timeline) chips.push(intent.timeline);

  const heading = intent.summary || query;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-3xl px-6 pt-14 text-center sm:px-8 sm:pt-20"
    >
      <SectionEyebrow>
        <span className="mx-auto block">Your brief, understood</span>
      </SectionEyebrow>
      <p className="text-balance font-display text-2xl leading-snug tracking-tight text-ink sm:text-3xl">
        &ldquo;{heading}&rdquo;
      </p>

      {chips.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {chips.map((chip, i) => (
            <Chip key={`${chip}-${i}`} tone="accent">
              {chip}
            </Chip>
          ))}
        </div>
      )}
    </motion.div>
  );
}
