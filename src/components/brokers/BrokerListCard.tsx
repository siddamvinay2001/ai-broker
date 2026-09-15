import Image from "next/image";
import Link from "next/link";
import { humanizeSlug } from "@/components/format";

export type BrokerListItem = {
  slug: string;
  name: string;
  photo: string;
  rating: number;
  yearsExperience: number;
  dealsClosed: number;
  languages: string[];
  specializationCommunities: string[];
};

type BrokerListCardProps = {
  broker: BrokerListItem;
};

export function BrokerListCard({ broker }: BrokerListCardProps) {
  return (
    <Link
      href={`/broker/${broker.slug}`}
      className="group block rounded-2xl border border-hairline bg-surface/40 p-6 transition-transform hover:-translate-y-1"
    >
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-hairline bg-ground-raised">
          {broker.photo && (
            <Image src={broker.photo} alt={broker.name} fill sizes="64px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg text-ink">{broker.name}</h3>
          <p className="text-xs text-ink-faint">
            {broker.rating.toFixed(1)}★ &middot; {broker.yearsExperience} yrs &middot;{" "}
            {broker.dealsClosed} deals
          </p>
        </div>
      </div>

      {broker.languages.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {broker.languages.map((lang) => (
            <span
              key={lang}
              className="rounded-full border border-hairline px-2.5 py-1 text-[11px] text-ink-faint"
            >
              {lang}
            </span>
          ))}
        </div>
      )}

      {broker.specializationCommunities.length > 0 && (
        <p className="mt-4 border-t border-hairline pt-4 text-xs leading-relaxed text-ink-muted">
          Specializes in{" "}
          {broker.specializationCommunities.map(humanizeSlug).join(", ")}
        </p>
      )}

      <span className="mt-4 inline-block text-xs text-accent transition-colors group-hover:text-accent-strong">
        View profile &rarr;
      </span>
    </Link>
  );
}
