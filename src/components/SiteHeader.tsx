"use client";

import { motion } from "motion/react";

const NAV_LINKS = ["Buy", "Rent", "Off-Plan", "Brokers"] as const;

export function SiteHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-hairline bg-surface-glass backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        <a
          href="#"
          className="font-display text-sm font-medium tracking-[0.28em] text-ink"
        >
          BRICK &amp; MUSK
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 sm:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm text-ink-muted transition-colors hover:text-accent"
            >
              {link}
            </a>
          ))}
        </nav>

        <a
          href="#discover"
          className="rounded-full border border-hairline-strong px-4 py-2 text-xs font-medium tracking-wide text-ink transition-colors hover:border-accent hover:text-accent sm:hidden"
        >
          Discover
        </a>
      </div>
    </motion.header>
  );
}
