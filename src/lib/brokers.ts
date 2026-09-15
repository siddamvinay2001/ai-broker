/// Pure domain-math helpers for scoring and ranking brokers against a
/// buyer's intent and the properties actually being recommended to them.
/// No I/O, no Prisma, no network.

import type { BuyerIntent } from "@/lib/types/intent";
import { formatAedCompact } from "@/lib/investment";

/// Structural broker type - deliberately NOT imported from Prisma so this
/// module stays dependency-free.
export type BrokerProfile = {
  id: string;
  slug: string;
  name: string;
  languages: string[];
  specializationCommunities: string[]; // community slugs
  specializationTypes: string[]; // PropertyType values
  dealsClosed: number;
  avgDealSize: number;
  rating: number;
  yearsExperience: number;
};

/// What the broker is actually being scored against: the properties
/// currently being recommended to this buyer, not the buyer's raw intent
/// alone - a broker should be judged on fit for what we're about to show,
/// which may be broader or narrower than what the buyer explicitly asked for.
export type RecommendationContext = {
  /// Community slugs of the properties actually being recommended.
  recommendedCommunitySlugs: string[];
  /// Median price (AED) of the properties actually being recommended.
  medianRecommendedPrice: number | null;
  /// Property types of the recommended properties, used as a fallback
  /// target when the buyer's intent didn't specify any.
  recommendedPropertyTypes?: string[];
};

export type BrokerScoreResult = {
  score: number;
  reasons: string[];
};

export type RankedBroker = {
  broker: BrokerProfile;
  score: number;
  reasons: string[];
};

const WEIGHT_COMMUNITY = 35;
const WEIGHT_PROPERTY_TYPE = 20;
const WEIGHT_PRICE_BAND = 20;
const WEIGHT_LANGUAGE = 10;
const WEIGHT_TRACK_RECORD = 15;

/// A subscore is only worth calling out to the buyer once it's clearly
/// good, not merely average - avoids padding `reasons` with faint praise.
const REASON_THRESHOLD = 70;
const RATING_REASON_THRESHOLD = 4.5;
const DEALS_REASON_THRESHOLD = 100;

/// Reference point for the deals-closed log scale: a broker at this many
/// closed deals (or more) gets full marks on that half of track record.
const DEALS_LOG_REFERENCE = 500;

export function scoreBroker(
  broker: BrokerProfile,
  intent: BuyerIntent,
  context: RecommendationContext,
): BrokerScoreResult {
  const reasons: string[] = [];

  const community = scoreCommunityOverlap(broker, context, reasons);
  const propertyType = scorePropertyTypeOverlap(broker, intent, context, reasons);
  const priceBand = scorePriceBand(broker, context, reasons);
  const language = scoreLanguage(broker, intent, reasons);
  const trackRecord = scoreTrackRecord(broker, reasons);

  const score = Math.round(
    (community * WEIGHT_COMMUNITY +
      propertyType * WEIGHT_PROPERTY_TYPE +
      priceBand * WEIGHT_PRICE_BAND +
      language * WEIGHT_LANGUAGE +
      trackRecord * WEIGHT_TRACK_RECORD) /
      100,
  );

  return { score: clamp(score, 0, 100), reasons };
}

export function rankBrokers(
  brokers: BrokerProfile[],
  intent: BuyerIntent,
  context: RecommendationContext,
): RankedBroker[] {
  return brokers
    .map((broker) => {
      const { score, reasons } = scoreBroker(broker, intent, context);
      return { broker, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

/// Fraction of recommended communities the broker specializes in. No
/// recommended communities means no signal either way, so we score it
/// neutral rather than penalizing or rewarding the broker for it.
function scoreCommunityOverlap(
  broker: BrokerProfile,
  context: RecommendationContext,
  reasons: string[],
): number {
  const target = context.recommendedCommunitySlugs;
  if (target.length === 0) return 50;

  const covered = target.filter((slug) =>
    broker.specializationCommunities.includes(slug),
  );
  const fraction = covered.length / target.length;
  const score = fraction * 100;

  if (score >= REASON_THRESHOLD && covered.length > 0) {
    reasons.push(`Specializes in ${covered.map(humanizeSlug).join(" and ")}`);
  }

  return score;
}

/// Overlap against the buyer's stated property types, falling back to the
/// types of the properties actually being recommended when the buyer
/// didn't specify any.
function scorePropertyTypeOverlap(
  broker: BrokerProfile,
  intent: BuyerIntent,
  context: RecommendationContext,
  reasons: string[],
): number {
  const target =
    intent.propertyTypes.length > 0
      ? intent.propertyTypes
      : (context.recommendedPropertyTypes ?? []);
  if (target.length === 0) return 50;

  const covered = target.filter((t) => broker.specializationTypes.includes(t));
  const fraction = covered.length / target.length;
  const score = fraction * 100;

  if (score >= REASON_THRESHOLD && covered.length > 0) {
    reasons.push(
      `Experienced with ${covered.map(humanizePropertyType).join(" and ")} properties`,
    );
  }

  return score;
}

/// Ratio-scale fit between the broker's typical deal size and the median
/// price of what's being recommended. Log-scaled so being within 2x still
/// reads as "close" while an order of magnitude off reads as ~0.
function scorePriceBand(
  broker: BrokerProfile,
  context: RecommendationContext,
  reasons: string[],
): number {
  const median = context.medianRecommendedPrice;
  if (median === null || median <= 0 || broker.avgDealSize <= 0) return 50;

  const ratio =
    Math.max(broker.avgDealSize, median) / Math.min(broker.avgDealSize, median);
  const score = clamp(100 * (1 - Math.log10(ratio)), 0, 100);

  if (score >= REASON_THRESHOLD) {
    reasons.push(
      `Typical deal size ${formatAedCompact(broker.avgDealSize)}, close to your budget`,
    );
  }

  return score;
}

/// Full marks when the buyer stated no language preference (no
/// constraint to fail) or the broker speaks the requested language.
function scoreLanguage(
  broker: BrokerProfile,
  intent: BuyerIntent,
  reasons: string[],
): number {
  const preference = intent.languagePreference;
  if (!preference) return 100;

  const speaks = broker.languages.some(
    (lang) => lang.toLowerCase() === preference.toLowerCase(),
  );
  if (speaks) {
    reasons.push(`Speaks ${capitalize(preference)}`);
    return 100;
  }
  return 0;
}

/// Blend of rating (normalized from a 4.0-5.0 band, since Dubai brokerage
/// ratings rarely fall below 4.0 in practice) and deals closed (log-scaled
/// so a broker with 400 deals doesn't completely swamp one with 140).
function scoreTrackRecord(broker: BrokerProfile, reasons: string[]): number {
  const ratingScore = clamp(((broker.rating - 4.0) / 1.0) * 100, 0, 100);
  const dealsScore = clamp(
    (Math.log10(broker.dealsClosed + 1) / Math.log10(DEALS_LOG_REFERENCE + 1)) *
      100,
    0,
    100,
  );

  if (broker.rating >= RATING_REASON_THRESHOLD) {
    reasons.push(`Highly rated (${broker.rating.toFixed(1)}/5)`);
  }
  if (broker.dealsClosed >= DEALS_REASON_THRESHOLD) {
    reasons.push(`Proven track record with ${broker.dealsClosed} deals closed`);
  }

  return (ratingScore + dealsScore) / 2;
}

/// Dubai community slugs often contain short acronyms (JBR, DIFC, JLT, DIC)
/// that read oddly title-cased ("Jbr") - treat any short all-letters
/// segment as an acronym rather than maintaining a fixed community list.
function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) =>
      word.length <= 4 && /^[a-z]+$/i.test(word)
        ? word.toUpperCase()
        : capitalize(word),
    )
    .join(" ");
}

function humanizePropertyType(type: string): string {
  return type
    .split("_")
    .map((word) => capitalize(word.toLowerCase()))
    .join(" ");
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
