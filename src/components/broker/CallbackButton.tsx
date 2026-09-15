"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type CallbackButtonProps = {
  brokerName: string;
};

/// Callback booking is not built yet. Rather than bounce the visitor to the
/// home page, which looks like a broken link, the button admits what it is and
/// shows a placeholder line. A disclosure rather than an alert(), which blocks
/// the page and reads as an error.
export function CallbackButton({ brokerName }: CallbackButtonProps) {
  const [open, setOpen] = useState(false);
  const firstName = brokerName.split(" ")[0];

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-medium tracking-wide text-ground transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Request a callback
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="text-xs"
        >
          &#9662;
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 max-w-md rounded-2xl border border-hairline bg-surface/60 p-5 text-left">
              <p className="text-xs uppercase tracking-[0.2em] text-accent">
                Demo build
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Callback booking is not wired up yet. In production this books
                straight into {firstName}&apos;s calendar and opens the lead in
                the agent workspace.
              </p>
              <p className="mt-4 text-sm text-ink">
                <span className="text-ink-faint">Placeholder line: </span>
                +971 4 000 0000
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
