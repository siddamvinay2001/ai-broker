"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { formatAed, formatHandover, formatPct, formatSqft } from "@/components/format";
import type { WireProperty } from "@/components/discover/types";

type PropertyCardProps = {
  property: WireProperty;
  index: number;
};

export function PropertyCard({ property, index }: PropertyCardProps) {
  const yieldLabel = formatPct(property.investment.grossYieldPct);
  const handover = formatHandover(property.handoverDate);
  const isOffPlan = property.listingType === "OFFPLAN";
  const priceSuffix = property.listingType === "RENT" ? " / year" : "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/property/${property.id}`}
        className="group block overflow-hidden rounded-2xl border border-hairline bg-surface/40 transition-transform hover:-translate-y-1"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-ground-raised">
          {property.images[0] && (
            <Image
              src={property.images[0]}
              alt={property.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {yieldLabel && (
              <span className="rounded-full border border-hairline-strong bg-surface-glass px-2.5 py-1 text-xs text-accent-strong backdrop-blur-md">
                {yieldLabel} yield
              </span>
            )}
            {property.investment.goldenVisaEligible && (
              <span className="rounded-full border border-hairline-strong bg-surface-glass px-2.5 py-1 text-xs text-accent-strong backdrop-blur-md">
                Golden Visa eligible
              </span>
            )}
            {isOffPlan && handover && (
              <span className="rounded-full border border-hairline-strong bg-surface-glass px-2.5 py-1 text-xs text-ink backdrop-blur-md">
                Handover {handover}
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          <p className="font-display text-lg text-ink">
            {formatAed(property.price)}
            {priceSuffix && <span className="text-sm text-ink-faint">{priceSuffix}</span>}
          </p>
          <h3 className="mt-1 line-clamp-1 text-sm text-ink-muted">{property.title}</h3>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-faint">
            <span>{property.beds} bed</span>
            <span>{property.baths} bath</span>
            {formatSqft(property.sizeSqft) && <span>{formatSqft(property.sizeSqft)}</span>}
          </div>

          <p className="mt-3 text-xs tracking-wide text-ink-faint uppercase">
            {property.communityName}
          </p>
        </div>
      </Link>
    </motion.article>
  );
}
