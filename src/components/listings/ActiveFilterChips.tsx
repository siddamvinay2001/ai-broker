import Link from "next/link";
import { formatAed, humanizeEnumValue, listingTypeLabel } from "@/components/format";
import { buildListingsHref, type ParsedFilters } from "@/components/listings/filterLogic";

type CommunityOption = { slug: string; name: string };

type ActiveFilterChipsProps = {
  filters: ParsedFilters;
  communities: CommunityOption[];
};

export function ActiveFilterChips({ filters, communities }: ActiveFilterChipsProps) {
  const chips: { key: keyof ParsedFilters; label: string }[] = [];

  if (filters.type) {
    chips.push({ key: "type", label: listingTypeLabel(filters.type) ?? filters.type });
  }
  if (filters.propertyClass) {
    chips.push({ key: "propertyClass", label: humanizeEnumValue(filters.propertyClass) });
  }
  if (filters.community) {
    const name = communities.find((c) => c.slug === filters.community)?.name ?? filters.community;
    chips.push({ key: "community", label: name });
  }
  if (filters.beds !== null) {
    chips.push({ key: "beds", label: `${filters.beds}+ beds` });
  }
  if (filters.minPrice !== null) {
    chips.push({ key: "minPrice", label: `From ${formatAed(filters.minPrice)}` });
  }
  if (filters.maxPrice !== null) {
    chips.push({ key: "maxPrice", label: `Up to ${formatAed(filters.maxPrice)}` });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={buildListingsHref(filters, { [chip.key]: null })}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/50 bg-accent-soft px-3 py-1.5 text-xs text-accent-strong transition-colors hover:border-accent"
        >
          {chip.label}
          <span aria-hidden>&times;</span>
        </Link>
      ))}
      <Link
        href="/listings"
        className="text-xs text-ink-faint underline decoration-hairline-strong underline-offset-4 hover:text-accent"
      >
        Clear all
      </Link>
    </div>
  );
}
