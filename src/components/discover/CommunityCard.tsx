"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { formatPct } from "@/components/format";
import type { WireCommunity } from "@/components/discover/types";

type CommunityCardProps = {
  community: WireCommunity;
  index: number;
};

export function CommunityCard({ community, index }: CommunityCardProps) {
  const yield_ = formatPct(community.avgGrossYield);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="group overflow-hidden rounded-2xl border border-hairline bg-surface/40 transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 focus-within:border-accent/50"
    >
      <Link
        href={`/listings?community=${community.slug}`}
        className="block focus:outline-none"
        aria-label={`Browse homes in ${community.name}`}
      >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ground-raised">
        {community.heroImage && (
          <Image
            src={community.heroImage}
            alt={community.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {yield_ && (
          <span className="absolute right-3 top-3 rounded-full border border-hairline-strong bg-surface-glass px-2.5 py-1 text-xs text-accent-strong backdrop-blur-md">
            {yield_} avg yield
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg text-ink">{community.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">
          {community.description}
        </p>

        {community.lifestyleTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {community.lifestyleTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-hairline px-2.5 py-1 text-[11px] text-ink-faint"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-accent transition-colors group-hover:text-accent-strong">
          Browse homes here
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
            &rarr;
          </span>
        </p>
      </div>
      </Link>
    </motion.article>
  );
}
