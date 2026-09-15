"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Wordmark } from "@/components/Logo";

const NAV_LINKS = [
  { label: "Buy", href: "/listings?type=BUY" },
  { label: "Rent", href: "/listings?type=RENT" },
  { label: "Off-Plan", href: "/listings?type=OFFPLAN" },
  { label: "Brokers", href: "/brokers" },
] as const;

export function SiteHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 border-b border-hairline bg-surface-glass backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
        <Link href="/" className="text-ink">
          <Wordmark className="inline-flex items-center gap-2" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-ink-muted transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/#discover"
          className="rounded-full border border-hairline-strong px-4 py-2 text-xs font-medium tracking-wide text-ink transition-colors hover:border-accent hover:text-accent sm:hidden"
        >
          Discover
        </Link>
      </div>
    </motion.header>
  );
}
