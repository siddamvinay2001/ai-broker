"use client";

import { useState } from "react";
import { motion } from "motion/react";

import { SiteHeader } from "@/components/SiteHeader";
import { DiscoveryForm } from "@/components/DiscoveryForm";
import { ExamplePromptChips } from "@/components/ExamplePromptChips";
import { HowItWorks } from "@/components/HowItWorks";
import { SiteFooter } from "@/components/SiteFooter";

export default function Home() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-accent-soft),_transparent_60%)]"
          />

          <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pb-20 pt-14 text-center sm:px-8 sm:pb-28 sm:pt-20">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-hairline bg-surface/40 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-accent backdrop-blur-sm sm:text-[11px]"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              Dubai real estate, guided by AI
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="text-balance font-display text-4xl leading-[1.05] tracking-tight text-ink sm:text-6xl sm:leading-[1.05] md:text-7xl"
            >
              Find the address that matches your{" "}
              <em className="not-italic text-accent">ambition</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-lg text-balance text-base leading-relaxed text-ink-muted sm:text-lg"
            >
              Describe your brief in plain language and we&apos;ll match you to
              the areas, homes and brokers built for how you want to live.
            </motion.p>

            <div className="mt-10 w-full sm:mt-12">
              <DiscoveryForm query={query} onQueryChange={setQuery} />
            </div>

            <div className="mt-8 w-full">
              <ExamplePromptChips onSelect={setQuery} />
            </div>
          </div>
        </section>

        <HowItWorks />
      </main>

      <SiteFooter />
    </div>
  );
}
