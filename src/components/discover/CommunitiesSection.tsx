import { SectionEyebrow } from "@/components/discover/Chip";
import { CommunityCard } from "@/components/discover/CommunityCard";
import { SkeletonRow } from "@/components/discover/Skeleton";
import type { WireCommunity } from "@/components/discover/types";

type CommunitiesSectionProps = {
  communities: WireCommunity[] | null;
};

export function CommunitiesSection({ communities }: CommunitiesSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
      <SectionEyebrow>Areas worth a look</SectionEyebrow>
      <h2 className="mb-8 font-display text-2xl tracking-tight text-ink sm:text-3xl">
        Communities matched to your brief
      </h2>

      {communities === null ? (
        <SkeletonRow cards={3} />
      ) : communities.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No community matches yet - try widening your brief.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {communities.map((community, i) => (
            <CommunityCard key={community.id} community={community} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
