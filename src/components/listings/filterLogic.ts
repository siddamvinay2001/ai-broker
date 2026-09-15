/// Pure parsing/URL-building logic for the /listings filter bar. No React,
/// no Prisma - kept separate so the page component, the filter form, and the
/// active-filter chips can all agree on the exact same rules without
/// duplicating them.

import { LISTING_TYPES, PROPERTY_TYPES } from "@/lib/types/intent";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type ListingType = (typeof LISTING_TYPES)[number];
export type PropertyClass = (typeof PROPERTY_TYPES)[number];

export type SortOption = "newest" | "price-asc" | "price-desc" | "beds-desc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "beds-desc", label: "Most bedrooms" },
];

export const BEDS_OPTIONS = [1, 2, 3, 4, 5] as const;

export type ParsedFilters = {
  type: ListingType | null;
  propertyClass: PropertyClass | null;
  community: string | null;
  beds: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  sort: SortOption;
};

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

function parseListingType(raw: string | undefined): ListingType | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  return (LISTING_TYPES as readonly string[]).includes(upper)
    ? (upper as ListingType)
    : null;
}

/// Accepts both our own canonical enum values ("VILLA") and the loose plural
/// form a visitor (or a link copied from elsewhere) might use ("villas").
function parsePropertyClass(raw: string | undefined): PropertyClass | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if ((PROPERTY_TYPES as readonly string[]).includes(upper)) {
    return upper as PropertyClass;
  }
  const singular = upper.endsWith("S") ? upper.slice(0, -1) : upper;
  return (PROPERTY_TYPES as readonly string[]).includes(singular)
    ? (singular as PropertyClass)
    : null;
}

function parsePositiveInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parsePositiveNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseSort(raw: string | undefined): SortOption {
  const valid = SORT_OPTIONS.map((o) => o.value);
  return valid.includes(raw as SortOption) ? (raw as SortOption) : "newest";
}

export function parseFilters(searchParams: RawSearchParams): ParsedFilters {
  return {
    type: parseListingType(first(searchParams.type)),
    propertyClass: parsePropertyClass(first(searchParams.class)),
    community: first(searchParams.community) ?? null,
    beds: parsePositiveInt(first(searchParams.beds)),
    minPrice: parsePositiveNumber(first(searchParams.minPrice)),
    maxPrice: parsePositiveNumber(first(searchParams.maxPrice)),
    sort: parseSort(first(searchParams.sort)),
  };
}

/// Builds a query string for the current filter set with `overrides` applied
/// (a key set to `null` removes it entirely). Used both by the filter chips
/// (to build "remove this filter" links) and could be reused for pagination.
export function buildListingsHref(
  filters: ParsedFilters,
  overrides: Partial<Record<keyof ParsedFilters, string | null>> = {},
): string {
  const raw: Record<string, string | null> = {
    type: filters.type,
    class: filters.propertyClass,
    community: filters.community,
    beds: filters.beds !== null ? String(filters.beds) : null,
    minPrice: filters.minPrice !== null ? String(filters.minPrice) : null,
    maxPrice: filters.maxPrice !== null ? String(filters.maxPrice) : null,
    sort: filters.sort !== "newest" ? filters.sort : null,
  };

  for (const [key, value] of Object.entries(overrides)) {
    const paramKey = key === "propertyClass" ? "class" : key;
    raw[paramKey] = value;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value !== null && value !== "") params.set(key, value);
  }

  const qs = params.toString();
  return qs ? `/listings?${qs}` : "/listings";
}
