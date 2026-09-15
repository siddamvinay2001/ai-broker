import { formatSqft, humanizeEnumValue } from "@/components/format";

type SpecRow = {
  label: string;
  value: string | null;
};

type PropertySpecTableProps = {
  beds: number;
  baths: number;
  sizeSqft: number;
  propertyType: string;
  furnishing: string;
  view: string;
  developer: string;
  completionStatus: string;
  refNo: string;
};

export function PropertySpecTable(props: PropertySpecTableProps) {
  const rows: SpecRow[] = [
    { label: "Type", value: humanizeEnumValue(props.propertyType) },
    { label: "Bedrooms", value: String(props.beds) },
    { label: "Bathrooms", value: String(props.baths) },
    { label: "Size", value: formatSqft(props.sizeSqft) },
    { label: "Furnishing", value: humanizeEnumValue(props.furnishing) },
    { label: "View", value: props.view || null },
    { label: "Developer", value: props.developer || null },
    { label: "Status", value: humanizeEnumValue(props.completionStatus) },
    { label: "Reference", value: props.refNo },
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
      {rows
        .filter((row) => row.value !== null)
        .map((row) => (
          <div key={row.label}>
            <dt className="text-xs tracking-wide text-ink-faint uppercase">{row.label}</dt>
            <dd className="mt-1 text-sm text-ink">{row.value}</dd>
          </div>
        ))}
    </dl>
  );
}
