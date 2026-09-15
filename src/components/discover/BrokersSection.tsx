import { SectionEyebrow } from "@/components/discover/Chip";
import { BrokerCard } from "@/components/discover/BrokerCard";
import { SkeletonRow } from "@/components/discover/Skeleton";
import type { WireRankedBroker } from "@/components/discover/types";

type BrokersSectionProps = {
  brokers: WireRankedBroker[] | null;
};

export function BrokersSection({ brokers }: BrokersSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10 sm:pb-20 sm:px-8">
      <SectionEyebrow>Your matched specialists</SectionEyebrow>
      <h2 className="mb-8 font-display text-2xl tracking-tight text-ink sm:text-3xl">
        Talk to the right broker
      </h2>

      {brokers === null ? (
        <SkeletonRow cards={3} />
      ) : brokers.length === 0 ? (
        <p className="text-sm text-ink-muted">No brokers available right now.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {brokers.map((ranked, i) => (
            <BrokerCard key={ranked.broker.id} ranked={ranked} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
