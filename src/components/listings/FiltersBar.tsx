import { PROPERTY_TYPES } from "@/lib/types/intent";
import { humanizeEnumValue } from "@/components/format";
import { BEDS_OPTIONS, SORT_OPTIONS, type ParsedFilters } from "@/components/listings/filterLogic";

type CommunityOption = { slug: string; name: string };

type FiltersBarProps = {
  filters: ParsedFilters;
  communities: CommunityOption[];
};

const selectClass =
  "w-full rounded-xl border border-hairline bg-ground-raised px-3 py-2.5 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const labelClass = "mb-1.5 block text-xs tracking-wide text-ink-faint uppercase";

export function FiltersBar({ filters, communities }: FiltersBarProps) {
  return (
    <form
      method="GET"
      action="/listings"
      className="rounded-2xl border border-hairline bg-surface/40 p-5 sm:p-6"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label htmlFor="type" className={labelClass}>
            Listing
          </label>
          <select id="type" name="type" defaultValue={filters.type ?? ""} className={selectClass}>
            <option value="">Any</option>
            <option value="BUY">Buy</option>
            <option value="RENT">Rent</option>
            <option value="OFFPLAN">Off-plan</option>
          </select>
        </div>

        <div>
          <label htmlFor="class" className={labelClass}>
            Type
          </label>
          <select
            id="class"
            name="class"
            defaultValue={filters.propertyClass ?? ""}
            className={selectClass}
          >
            <option value="">Any</option>
            {PROPERTY_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanizeEnumValue(t)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="community" className={labelClass}>
            Community
          </label>
          <select
            id="community"
            name="community"
            defaultValue={filters.community ?? ""}
            className={selectClass}
          >
            <option value="">Any</option>
            {communities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="beds" className={labelClass}>
            Beds
          </label>
          <select
            id="beds"
            name="beds"
            defaultValue={filters.beds !== null ? String(filters.beds) : ""}
            className={selectClass}
          >
            <option value="">Any</option>
            {BEDS_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="minPrice" className={labelClass}>
            Min price (AED)
          </label>
          <input
            id="minPrice"
            name="minPrice"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="No min"
            defaultValue={filters.minPrice ?? ""}
            className={selectClass}
          />
        </div>

        <div>
          <label htmlFor="maxPrice" className={labelClass}>
            Max price (AED)
          </label>
          <input
            id="maxPrice"
            name="maxPrice"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="No max"
            defaultValue={filters.maxPrice ?? ""}
            className={selectClass}
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-faint">
        Price is the sale price for Buy/Off-plan listings and the annual rent for Rent listings.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
        <div className="flex-1 min-w-[160px]">
          <label htmlFor="sort" className={labelClass}>
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={filters.sort} className={selectClass}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-accent px-6 py-2.5 text-sm font-medium tracking-wide text-ground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Apply filters
        </button>

        <a
          href="/listings"
          className="rounded-xl border border-hairline-strong px-6 py-2.5 text-sm text-ink-muted transition-colors hover:border-accent hover:text-accent"
        >
          Clear
        </a>
      </div>
    </form>
  );
}
