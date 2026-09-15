import { SectionEyebrow } from "@/components/discover/Chip";
import { PropertyCard } from "@/components/discover/PropertyCard";
import { SkeletonRow } from "@/components/discover/Skeleton";
import type { WireProperty } from "@/components/discover/types";

type PropertiesSectionProps = {
  properties: WireProperty[] | null;
};

export function PropertiesSection({ properties }: PropertiesSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
      <SectionEyebrow>Shortlist</SectionEyebrow>
      <h2 className="mb-8 font-display text-2xl tracking-tight text-ink sm:text-3xl">
        Properties that fit
      </h2>

      {properties === null ? (
        <SkeletonRow cards={6} />
      ) : properties.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nothing in our current inventory matches that brief yet - widen the
          budget or the area and try again.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property, i) => (
            <PropertyCard key={property.id} property={property} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
