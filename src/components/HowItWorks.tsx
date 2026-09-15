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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 sm:mb-20"
        >
          <h2 className="font-display text-4xl tracking-tight text-ink sm:text-5xl">
            How it works
          </h2>
          <p className="mt-3 max-w-md text-base text-ink-muted sm:text-lg">
            Three steps between a brief and a broker who already knows the answer.
          </p>
          <div className="mt-8 h-px w-full bg-hairline" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x sm:divide-hairline">
          {STEPS.map((step, index) => (
            <div
              key={step.number}
              className={`sm:px-8 sm:first:pl-0 sm:last:pr-0 ${
                index > 0
                  ? "mt-10 border-t border-hairline pt-10 sm:mt-0 sm:border-t-0 sm:pt-0"
                  : ""
              }`}
            >
              <motion.span
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.15,
                  ease: [0.16, 1, 0.3, 1],
                }}
                aria-hidden
                className="block font-display text-6xl leading-none tracking-tight sm:text-7xl"
                style={{ color: "oklch(0.6 0.11 75)" }}
              >
                {step.number}
              </motion.span>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.15 + 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-3"
              >
                <h3 className="font-display text-xl tracking-tight text-ink sm:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-ink-muted sm:text-lg">
                  {step.description}
                </p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
