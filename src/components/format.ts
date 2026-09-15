import { formatAed, formatAedCompact } from "@/lib/investment";

export { formatAed, formatAedCompact };

export function humanizeEnumValue(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function listingTypeLabel(listingType: string | null): string | null {
  if (!listingType) return null;
  switch (listingType) {
    case "BUY":
      return "Buy";
    case "RENT":
      return "Rent";
    case "OFFPLAN":
      return "Off-plan";
    default:
      return humanizeEnumValue(listingType);
  }
}

export function budgetRangeLabel(
  min: number | null,
  max: number | null,
): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) {
    return `${formatAedCompact(min)} - ${formatAedCompact(max)}`;
  }
  if (max !== null) return `Up to ${formatAedCompact(max)}`;
  if (min !== null) return `${formatAedCompact(min)}+`;
  return null;
}

export function bedsRangeLabel(
  min: number | null,
  max: number | null,
): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) {
    return min === max ? `${min} bed${min === 1 ? "" : "s"}` : `${min}-${max} beds`;
  }
  if (max !== null) return `Up to ${max} beds`;
  if (min !== null) return `${min}+ beds`;
  return null;
}

export function formatPct(value: number | null, digits = 1): string | null {
  if (value === null || Number.isNaN(value)) return null;
  return `${value.toFixed(digits)}%`;
}

export function formatSqft(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) return null;
  return `${new Intl.NumberFormat("en-AE").format(Math.round(value))} sqft`;
}

export function formatHandover(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-AE", { year: "numeric", month: "short" });
}

/// Dubai community slugs often contain short acronyms (JBR, DIFC, JLT) that
/// read oddly title-cased ("Jbr") - treat any short all-letters segment as
/// an acronym rather than maintaining a fixed community list. Mirrors the
/// (unexported) helper in src/lib/brokers.ts.
export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) =>
      word.length <= 4 && /^[a-z]+$/i.test(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}
