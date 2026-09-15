"use client";

import { motion } from "motion/react";

const STEPS = [
  {
    number: "01",
    title: "Describe your brief",
    description:
      "Budget, lifestyle, timeline - in your own words. No forms, no filters to wrestle with.",
  },
  {
    number: "02",
    title: "We match areas, homes and brokers",
    description:
      "Our AI reads the intent behind your brief and narrows Dubai's market to what actually fits.",
  },
  {
    number: "03",
    title: "Talk to the right specialist",
    description:
      "Get connected to the broker who knows that building, that community, that deal - not a call centre.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-28">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 text-center font-display text-2xl tracking-tight text-ink sm:mb-16 sm:text-3xl"
        >
          How it works
        </motion.h2>

        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.6,
                delay: index * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="rounded-2xl border border-hairline bg-surface/40 p-6 transition-transform hover:-translate-y-1"
            >
              <span className="font-display text-sm text-accent">
                {step.number}
              </span>
              <h3 className="mt-4 font-display text-lg text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
