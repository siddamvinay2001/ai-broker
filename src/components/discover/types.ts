/// Wire-shape types for the /api/discover NDJSON stream. Deliberately
/// declared locally (not imported from src/lib) because the stream is JSON
/// over the wire: Dates and other server-side types arrive as plain strings,
/// which differs from the Prisma/retrieval types used on the server.

export type WireListingType = "BUY" | "RENT" | "OFFPLAN";

export type WireIntent = {
  budgetMin: number | null;
  budgetMax: number | null;
  listingType: WireListingType | null;
  propertyTypes: string[];
  bedsMin: number | null;
  bedsMax: number | null;
  communities: string[];
  goals: string[];
  lifestyle: string[];
  languagePreference: string | null;
  timeline: string | null;
  summary: string;
};

export type WireCommunity = {
  id: string;
  slug: string;
  name: string;
  description: string;
  avgPricePerSqft: number | null;
  avgRentPerSqft: number | null;
  avgGrossYield: number | null;
  serviceChargeAvg: number | null;
  lifestyleTags: string[];
  schools: string[];
  metroAccess: string;
  beachProximity: string;
  heroImage: string;
};

export type WireInvestment = {
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

export type WireScheduledPayment = {
  label: string;
  pct: number;
  amountAed: number;
  dueLabel: string;
};

export type WireSchedule = {
  milestones: WireScheduledPayment[];
  warning: string | null;
} | null;

export type WireProperty = {
  id: string;
  refNo: string;
  title: string;
  description: string;
  listingType: string;
  propertyType: string;
  price: number;
  beds: number;
  baths: number;
  sizeSqft: number;
  view: string;
  furnishing: string;
  developer: string;
  handoverDate: string | null;
  paymentPlan: string | null;
  completionStatus: string;
  images: string[];
  communityName: string;
  communitySlug: string;
  investment: WireInvestment;
  schedule: WireSchedule;
};

export type WireBroker = {
  id: string;
  slug: string;
  name: string;
  photo: string;
  languages: string[];
  dealsClosed: number;
  avgDealSize: number;
  rating: number;
  yearsExperience: number;
  reraBrn: string;
  bio: string;
  specializationCommunities: string[];
  specializationTypes: string[];
};

export type WireRankedBroker = {
  broker: WireBroker;
  score: number;
  reasons: string[];
};

export type DiscoverEvent =
  | { type: "intent"; intent: WireIntent }
  | { type: "communities"; communities: WireCommunity[] }
  | { type: "properties"; properties: WireProperty[] }
  | { type: "brokers"; brokers: WireRankedBroker[] }
  | { type: "narrative_delta"; text: string }
  | { type: "narrative_unavailable" }
  | { type: "done"; enquiryId: string }
  | { type: "error"; message: string };
