"use client";

import { motion } from "motion/react";

export const EXAMPLE_PROMPTS = [
  "AED 3M, 2-bed I can rent out, family-friendly, near a good school",
  "Beachfront villa on the Palm, budget is flexible above AED 30M",
  "Off-plan with a payment plan, I want to flip before handover",
  "I need AED 2M+ to qualify for the Golden Visa",
] as const;

type ExamplePromptChipsProps = {
  onSelect: (prompt: string) => void;
};

export function ExamplePromptChips({ onSelect }: ExamplePromptChipsProps) {
  return (
    // Same max width as the composer so both columns share one edge.
    <div className="mx-auto w-full max-w-2xl">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        className="mb-3 text-center text-[11px] uppercase tracking-[0.22em] text-ink-faint"
      >
        Or start from one of these
      </motion.p>

      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_PROMPTS.map((prompt, index) => (
          <motion.button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.55 + index * 0.07,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="rounded-full border border-hairline bg-surface/50 px-3.5 py-2 text-left text-xs leading-snug text-ink-muted transition-all duration-200 hover:-translate-y-px hover:border-accent/50 hover:bg-surface hover:text-ink sm:text-[13px]"
          >
            {prompt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
