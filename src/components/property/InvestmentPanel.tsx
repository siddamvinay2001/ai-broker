import type { InvestmentFigures } from "@/lib/investment";
import { formatAed, formatPct } from "@/components/format";

type FigureRow = {
  label: string;
  value: string | null;
};

type InvestmentPanelProps = {
  investment: InvestmentFigures;
};

export function InvestmentPanel({ investment }: InvestmentPanelProps) {
  const figures: FigureRow[] = [
    { label: "Price per sqft", value: investment.pricePerSqft !== null ? formatAed(investment.pricePerSqft) : null },
    {
      label: "Annual service charge",
      value: investment.annualServiceCharge !== null ? formatAed(investment.annualServiceCharge) : null,
    },
    {
      label: "Estimated annual rent",
      value: investment.estimatedAnnualRent !== null ? formatAed(investment.estimatedAnnualRent) : null,
    },
    { label: "Gross yield", value: formatPct(investment.grossYieldPct) },
    { label: "Net yield", value: formatPct(investment.netYieldPct) },
    { label: "DLD transfer fee", value: investment.dldFee !== null ? formatAed(investment.dldFee) : null },
    {
      label: "Total acquisition cost",
      value: investment.totalAcquisitionCost !== null ? formatAed(investment.totalAcquisitionCost) : null,
    },
  ].filter((row) => row.value !== null);

  if (figures.length === 0 && !investment.goldenVisaEligible) return null;

  return (
    <div className="rounded-2xl border border-hairline bg-surface/40 p-6 sm:p-8">
      <p className="mb-5 text-xs font-medium tracking-[0.3em] text-accent">
        THE NUMBERS
      </p>

      {investment.goldenVisaEligible && (
        <span className="mb-5 inline-flex rounded-full border border-accent/50 bg-accent-soft px-3 py-1 text-xs text-accent-strong">
          Golden Visa eligible
        </span>
      )}

      {figures.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          {figures.map((row) => (
            <div key={row.label}>
              <dt className="text-xs tracking-wide text-ink-faint uppercase">{row.label}</dt>
              <dd className="mt-1 font-display text-lg text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {investment.assumptions.length > 0 && (
        <ul className="mt-6 space-y-1.5 border-t border-hairline pt-5">
          {investment.assumptions.map((assumption, i) => (
            <li key={i} className="text-xs leading-relaxed text-ink-faint">
              {assumption}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
