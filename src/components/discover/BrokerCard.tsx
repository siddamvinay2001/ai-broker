"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { formatAedCompact } from "@/components/format";
import type { WireRankedBroker } from "@/components/discover/types";

type BrokerCardProps = {
  ranked: WireRankedBroker;
  index: number;
};

export function BrokerCard({ ranked, index }: BrokerCardProps) {
  const { broker, reasons } = ranked;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-hairline bg-surface/40 p-6 transition-transform hover:-translate-y-1"
    >
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-hairline bg-ground-raised">
          {broker.photo && (
            <Image
              src={broker.photo}
              alt={broker.name}
              fill
              sizes="56px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg text-ink">{broker.name}</h3>
          <p className="text-xs text-ink-faint">
            {broker.rating.toFixed(1)}★ &middot; {broker.dealsClosed} deals closed
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {broker.languages.map((lang) => (
          <span
            key={lang}
            className="rounded-full border border-hairline px-2.5 py-1 text-[11px] text-ink-faint"
          >
            {lang}
          </span>
        ))}
      </div>

      <p className="mt-4 text-xs text-ink-faint">
        Typical deal size {formatAedCompact(broker.avgDealSize)} &middot;{" "}
        {broker.yearsExperience} yrs experience
      </p>

      {reasons.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-hairline pt-4">
          {reasons.map((reason, i) => (
            <li key={i} className="flex gap-2 text-sm text-ink-muted">
              <span aria-hidden className="text-accent">
                &bull;
              </span>
              {reason}
            </li>
          ))}
        </ul>
      )}
    </motion.article>
  );
}
