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
    <div className="flex flex-wrap justify-center gap-2.5">
      {EXAMPLE_PROMPTS.map((prompt, index) => (
        <motion.button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.5 + index * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="rounded-full border border-hairline bg-surface/60 px-4 py-2 text-left text-xs text-ink-muted transition-colors hover:border-accent/60 hover:text-accent sm:text-sm"
        >
          {prompt}
        </motion.button>
      ))}
    </div>
  );
}
