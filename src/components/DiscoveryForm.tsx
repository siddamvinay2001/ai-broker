"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { type FormEvent, type KeyboardEvent } from "react";

type DiscoveryFormProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

export function DiscoveryForm({ query, onQueryChange }: DiscoveryFormProps) {
  const router = useRouter();
  const canSubmit = query.trim().length > 0;

  function submit() {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/discover?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  // The composer is multi-line, so Enter must insert a newline. Cmd/Ctrl+Enter
  // is the send shortcut people already expect from every other chat input.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <motion.form
      id="discover"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="group relative mx-auto w-full max-w-2xl"
    >
      {/* Accent bloom behind the composer, lit on focus. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[28px] bg-[radial-gradient(60%_120%_at_50%_0%,var(--color-accent-soft),transparent_70%)] opacity-0 blur-md transition-opacity duration-500 group-focus-within:opacity-100"
      />

      <div className="relative overflow-hidden rounded-[28px] border border-hairline-strong bg-surface-glass shadow-[0_24px_70px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl transition-colors duration-300 focus-within:border-accent/45">
        <label htmlFor="brief" className="sr-only">
          Describe your budget, goals, and how you want to live
        </label>

        <textarea
          id="brief"
          name="brief"
          rows={3}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell us your budget, your goals, and how you want to live..."
          className="block max-h-56 min-h-[92px] w-full resize-none bg-transparent px-5 pb-2 pt-5 text-left text-base leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none sm:text-lg"
        />

        {/* Footer row keeps the action anchored to the composer, so nothing
            depends on the textarea and button happening to be the same height. */}
        <div className="flex items-center justify-between gap-3 border-t border-hairline px-3 py-3 sm:px-4">
          <p className="hidden text-xs text-ink-faint sm:block">
            Press{" "}
            <kbd className="rounded border border-hairline bg-surface/70 px-1.5 py-0.5 font-sans text-[11px] text-ink-muted">
              ⌘
            </kbd>{" "}
            <kbd className="rounded border border-hairline bg-surface/70 px-1.5 py-0.5 font-sans text-[11px] text-ink-muted">
              ↵
            </kbd>{" "}
            to search
          </p>
          <span className="text-xs text-ink-faint sm:hidden">Describe it your way</span>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium tracking-wide text-ground transition-all duration-200 hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-accent"
          >
            Find my home
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 transition-transform duration-200 group-focus-within:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 8h12M9 3l5 5-5 5" />
            </svg>
          </button>
        </div>
      </div>
    </motion.form>
  );
}
