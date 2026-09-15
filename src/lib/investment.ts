/// Pure domain-math helpers for Dubai property investment figures. No I/O,
/// no Prisma, no network - everything here is a plain function over plain
/// data so it can be unit tested and reused from the UI, the intent
/// pipeline, or a batch job alike.

/// Structural input type - deliberately NOT imported from Prisma so this
/// module stays dependency-free. Any object shaped like this works,
/// whether it came from the DB, a mock, or a form.
export type PropertyFinancials = {
  listingType: "BUY" | "RENT" | "OFFPLAN";
  price: number;
  sizeSqft: number;
  serviceChargePerSqft: number;
  /// Community average annual rent per sqft, used to estimate rent for a sale listing.
  communityAvgRentPerSqft: number;
  handoverDate?: Date | string | null;
  paymentPlan?: string | null;
};

export type InvestmentFigures = {
  annualServiceCharge: number | null;
  estimatedAnnualRent: number | null;
  grossYieldPct: number | null;
  netYieldPct: number | null;
  dldFee: number | null;
  totalAcquisitionCost: number | null;
  goldenVisaEligible: boolean;
  pricePerSqft: number | null;
  assumptions: string[];
};

export type PaymentMilestone = {
  label: string;
  pct: number;
};

export type ScheduledPayment = {
  label: string;
  pct: number;
  amountAed: number;
  dueLabel: string;
};

export type PaymentSchedule = {
  milestones: ScheduledPayment[];
  warning: string | null;
};

const DLD_TRANSFER_FEE_PCT = 0.04;
const DLD_ADMIN_FEE_AED = 580;
const GOLDEN_VISA_THRESHOLD_AED = 2_000_000;
const AGENCY_COMMISSION_PCT = 0.02;
const MANAGEMENT_ALLOWANCE_PCT = 0.05;
const VACANCY_ALLOWANCE_PCT = 0.05;
/// Milestone parsing tolerance: percentages should sum to ~100 but rounding
/// in the source text ("33%, 33%, 34%" style) can drift slightly.
const PAYMENT_PLAN_SUM_TOLERANCE = 0.5;

/// Rent is a known fact for a RENT listing (the price itself), but has to be
/// estimated from the community average for a sale or off-plan listing.
export function estimateAnnualRent(p: PropertyFinancials): number | null {
  if (p.listingType === "RENT") {
    return p.price > 0 ? round0(p.price) : null;
  }
  if (p.sizeSqft <= 0 || p.communityAvgRentPerSqft <= 0) return null;
  return round0(p.communityAvgRentPerSqft * p.sizeSqft);
}

export function computeInvestment(p: PropertyFinancials): InvestmentFigures {
  const assumptions: string[] = [];

  const pricePerSqft =
    p.sizeSqft > 0 && p.price > 0 ? round0(p.price / p.sizeSqft) : null;
  if (pricePerSqft === null) {
    assumptions.push(
      "Price per sqft could not be computed: price or size is zero.",
    );
  }

  const annualServiceCharge =
    p.sizeSqft > 0 && p.serviceChargePerSqft >= 0
      ? round0(p.serviceChargePerSqft * p.sizeSqft)
      : null;
  if (annualServiceCharge === null) {
    assumptions.push(
      "Annual service charge could not be computed: size is zero.",
    );
  }

  const estimatedAnnualRent = estimateAnnualRent(p);
  if (p.listingType === "RENT") {
    assumptions.push("Estimated annual rent is the listing's annual price.");
  } else {
    assumptions.push(
      "Estimated annual rent = community average rent per sqft x size sqft (no rent history for this unit).",
    );
  }
  if (estimatedAnnualRent === null) {
    assumptions.push(
      "Estimated annual rent could not be computed: missing size, price, or community average rent.",
    );
  }

  // Yields are meaningless for a RENT listing (there's no purchase price to
  // compare rent against), so we deliberately leave them null rather than
  // fabricating a number against a rent-as-price figure.
  let grossYieldPct: number | null = null;
  let netYieldPct: number | null = null;
  if (p.listingType === "RENT") {
    assumptions.push(
      "Gross/net yield not applicable to a RENT listing (no purchase price).",
    );
  } else if (p.price > 0 && estimatedAnnualRent !== null) {
    grossYieldPct = roundPct((estimatedAnnualRent / p.price) * 100);

    assumptions.push(
      `Net yield deducts annual service charge, a ${pctLabel(MANAGEMENT_ALLOWANCE_PCT)} management allowance, and a ${pctLabel(VACANCY_ALLOWANCE_PCT)} vacancy allowance, all as a fraction of annual rent.`,
    );
    const managementCost = estimatedAnnualRent * MANAGEMENT_ALLOWANCE_PCT;
    const vacancyCost = estimatedAnnualRent * VACANCY_ALLOWANCE_PCT;
    const serviceChargeForNet = annualServiceCharge ?? 0;
    const netAnnualIncome =
      estimatedAnnualRent - serviceChargeForNet - managementCost - vacancyCost;
    netYieldPct = roundPct((netAnnualIncome / p.price) * 100);
  } else {
    assumptions.push(
      "Yield could not be computed: price is zero or rent could not be estimated.",
    );
  }

  // DLD fee, acquisition cost, and Golden Visa eligibility are all purchase
  // concepts. For a RENT listing `price` is annual rent, not a purchase
  // price, so applying these formulas to it would produce a nonsensical
  // figure - we deliberately leave them null instead.
  const isPurchase = p.listingType !== "RENT";

  let dldFee: number | null = null;
  if (!isPurchase) {
    assumptions.push("DLD transfer fee not applicable to a RENT listing.");
  } else if (p.price > 0) {
    dldFee = round0(p.price * DLD_TRANSFER_FEE_PCT + DLD_ADMIN_FEE_AED);
    assumptions.push(
      `DLD transfer fee assumed at ${pctLabel(DLD_TRANSFER_FEE_PCT)} of price plus a fixed AED ${DLD_ADMIN_FEE_AED} admin fee.`,
    );
  } else {
    assumptions.push("DLD fee could not be computed: price is zero.");
  }

  let totalAcquisitionCost: number | null = null;
  if (!isPurchase) {
    assumptions.push(
      "Total acquisition cost not applicable to a RENT listing.",
    );
  } else if (p.price > 0 && dldFee !== null) {
    const commission = p.price * AGENCY_COMMISSION_PCT;
    assumptions.push(
      `Total acquisition cost includes a typical ${pctLabel(AGENCY_COMMISSION_PCT)} agency commission.`,
    );
    totalAcquisitionCost = round0(p.price + dldFee + commission);
  } else {
    assumptions.push(
      "Total acquisition cost could not be computed: price is zero.",
    );
  }

  const goldenVisaEligible = isPurchase && p.price >= GOLDEN_VISA_THRESHOLD_AED;
  if (isPurchase) {
    assumptions.push(
      `Golden Visa property threshold assumed at ${formatAed(GOLDEN_VISA_THRESHOLD_AED)}.`,
    );
  } else {
    assumptions.push("Golden Visa eligibility not applicable to a RENT listing.");
  }

  return {
    annualServiceCharge,
    estimatedAnnualRent,
    grossYieldPct,
    netYieldPct,
    dldFee,
    totalAcquisitionCost,
    goldenVisaEligible,
    pricePerSqft,
    assumptions,
  };
}

/// Parses free-text payment plans like
/// "20% down, 40% during construction, 40% on handover" into milestones.
/// Never throws - a string that doesn't match returns an empty array so
/// callers can fall back to "no structured plan available" rather than
/// crashing on messy, model-extracted or user-entered text.
export function parsePaymentPlan(
  plan: string | null | undefined,
): PaymentMilestone[] {
  if (!plan) return [];

  const milestones: PaymentMilestone[] = [];
  // Split on commas/semicolons/"and" - typical separators in this kind of
  // brochure text, e.g. "20% down, 40% during construction, and 40% on handover".
  const parts = plan.split(/,|;|\band\b/i);

  for (const part of parts) {
    const match = part.match(/(\d+(?:\.\d+)?)\s*%\s*(.*)/);
    if (!match) continue;
    const pct = Number(match[1]);
    if (!Number.isFinite(pct) || pct <= 0) continue;
    const label = cleanLabel(match[2]) || "Payment";
    milestones.push({ label, pct });
  }

  return milestones;
}

function cleanLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^(down\s*payment|down)$/i, "Down payment")
    .replace(/^on\s+/i, "On ")
    .replace(/^during\s+/i, "During ")
    .replace(/\s+/g, " ")
    .trim();
}

/// Turns parsed milestones into AED amounts and a rough due-date label.
/// Flags a mismatched total via `warning` instead of throwing, since a
/// brochure's payment plan may have been transcribed imprecisely upstream.
export function computePaymentSchedule(
  price: number,
  plan: string | null | undefined,
  handoverDate?: Date | string | null,
): PaymentSchedule {
  const milestones = parsePaymentPlan(plan);
  if (milestones.length === 0) {
    return { milestones: [], warning: null };
  }

  const totalPct = milestones.reduce((sum, m) => sum + m.pct, 0);
  const warning =
    Math.abs(totalPct - 100) > PAYMENT_PLAN_SUM_TOLERANCE
      ? `Parsed milestones sum to ${roundPct(totalPct)}%, not 100% - the payment plan text may be incomplete or ambiguous.`
      : null;

  const handoverLabel = formatHandoverDate(handoverDate);

  const scheduled: ScheduledPayment[] = milestones.map((m) => {
    const isHandover = /handover/i.test(m.label);
    return {
      label: m.label,
      pct: m.pct,
      amountAed: price > 0 ? round0(price * (m.pct / 100)) : 0,
      dueLabel: isHandover && handoverLabel ? handoverLabel : m.label,
    };
  });

  return { milestones: scheduled, warning };
}

function formatHandoverDate(handoverDate?: Date | string | null): string | null {
  if (!handoverDate) return null;
  const d = handoverDate instanceof Date ? handoverDate : new Date(handoverDate);
  if (Number.isNaN(d.getTime())) return null;
  return `On handover (${d.toLocaleDateString("en-AE", { year: "numeric", month: "short" })})`;
}

/// "AED 2,850,000" style formatting for full-precision display.
export function formatAed(n: number): string {
  if (!Number.isFinite(n)) return "AED -";
  return `AED ${new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: 0,
  }).format(n)}`;
}

/// "AED 2.85M" / "AED 650K" style formatting for compact display, e.g. cards
/// and list views where full precision would be noisy.
export function formatAedCompact(n: number): string {
  if (!Number.isFinite(n)) return "AED -";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `AED ${trimTrailingZero((n / 1_000_000).toFixed(2))}M`;
  }
  if (abs >= 1_000) {
    return `AED ${trimTrailingZero((n / 1_000).toFixed(0))}K`;
  }
  return formatAed(n);
}

function trimTrailingZero(s: string): string {
  return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function round0(n: number): number {
  return Math.round(n);
}

function roundPct(n: number): number {
  return Math.round(n * 10) / 10;
}

function pctLabel(fraction: number): string {
  return `${roundPct(fraction * 100)}%`;
}
