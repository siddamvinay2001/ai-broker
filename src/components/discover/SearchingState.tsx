"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/// Stages mirror the real pipeline events, so the progress shown is honest:
/// each one ticks over only when its event has actually arrived.
export type SearchStage = {
  label: string;
  done: boolean;
};

const REASSURANCES = [
  "Reading your brief the way a broker would",
  "Checking yields, service charges and payment plans",
  "Your dream home is closer than you think",
  "Matching you to specialists who actually work your areas",
];

type SearchingStateProps = {
  stages: SearchStage[];
};

export function SearchingState({ stages }: SearchingStateProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setMessageIndex((i) => (i + 1) % REASSURANCES.length),
      2600,
    );
    return () => clearInterval(id);
  }, []);

  const activeIndex = stages.findIndex((s) => !s.done);
  const completed = stages.filter((s) => s.done).length;
  const progress = Math.round((completed / stages.length) * 100);

  return (
    <section className="mx-auto max-w-2xl px-6 py-20 sm:px-8 sm:py-28">
      <div className="flex flex-col items-center text-center">
        {/* Radar sweep: concentric rings expanding out from a steady core. */}
        <div className="relative mb-10 flex h-24 w-24 items-center justify-center">
          {[0, 1, 2].map((ring) => (
            <motion.span
              key={ring}
              aria-hidden
              className="absolute rounded-full border border-accent/40"
              initial={{ width: 24, height: 24, opacity: 0.7 }}
              animate={{ width: 96, height: 96, opacity: 0 }}
              transition={{
                duration: 2.4,
                delay: ring * 0.8,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
          <motion.span
            aria-hidden
            className="h-3 w-3 rounded-full bg-accent"
            animate={{ scale: [1, 1.25, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <h2 className="font-display text-2xl leading-tight text-ink sm:text-3xl">
          Searching Dubai for your match
        </h2>

        <div className="mt-3 h-6 w-full">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm text-ink-muted"
            >
              {REASSURANCES[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress reflects completed stages, never a timer. */}
        <div className="mt-10 h-px w-full max-w-sm overflow-hidden bg-hairline">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.max(progress, 6)}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>

        <ul className="mt-8 w-full max-w-sm space-y-3 text-left">
          {stages.map((stage, index) => {
            const isActive = index === activeIndex;
            return (
              <motion.li
                key={stage.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className={`flex items-center gap-3 text-sm transition-colors duration-300 ${
                  stage.done
                    ? "text-ink-muted"
                    : isActive
                      ? "text-ink"
                      : "text-ink-faint"
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {stage.done ? (
                    <motion.svg
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      viewBox="0 0 16 16"
                      className="h-4 w-4 text-accent"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3 8.5l3.5 3.5L13 5" />
                    </motion.svg>
                  ) : isActive ? (
                    <motion.span
                      aria-hidden
                      className="h-2 w-2 rounded-full bg-accent"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  ) : (
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-hairline-strong" />
                  )}
                </span>
                {stage.label}
              </motion.li>
            );
          })}
        </ul>

        <p className="sr-only" role="status" aria-live="polite">
          {completed} of {stages.length} steps complete
        </p>
      </div>
    </section>
  );
}
