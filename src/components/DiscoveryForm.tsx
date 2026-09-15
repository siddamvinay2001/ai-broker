"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { type FormEvent } from "react";

type DiscoveryFormProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

export function DiscoveryForm({ query, onQueryChange }: DiscoveryFormProps) {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/discover?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <motion.form
      id="discover"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl rounded-3xl border border-hairline-strong bg-surface-glass p-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md sm:p-3"
    >
      <label htmlFor="brief" className="sr-only">
        Describe your budget, goals, and how you want to live
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <textarea
          id="brief"
          name="brief"
          rows={2}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Tell us your budget, your goals, and how you want to live..."
          className="min-h-[64px] w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:outline-none sm:text-lg"
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-sm font-medium tracking-wide text-ground transition-transform hover:scale-[1.02] active:scale-[0.98] sm:mb-1"
        >
          Find my home
        </button>
      </div>
    </motion.form>
  );
}
