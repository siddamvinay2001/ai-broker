import { z } from "zod";

export const LISTING_TYPES = ["BUY", "RENT", "OFFPLAN"] as const;

export const PROPERTY_TYPES = [
  "APARTMENT",
  "VILLA",
  "TOWNHOUSE",
  "PENTHOUSE",
  "DUPLEX",
  "MANSION",
  "HOTEL_APARTMENT",
  "OFFICE",
] as const;

export const GOALS = [
  "INVESTMENT",
  "END_USE",
  "GOLDEN_VISA",
  "FLIP",
  "RENTAL_YIELD",
] as const;

/// What the model extracts from a visitor's free-text description. Every field
/// is nullable because a visitor is never obliged to state any of it - an
/// absent field means "no constraint", not "zero".
export const BuyerIntentSchema = z.object({
  /// AED. For RENT these bound the ANNUAL rent.
  budgetMin: z.number().nullable(),
  budgetMax: z.number().nullable(),
  /// True when the visitor made the ceiling absolute ("strictly under 4M",
  /// "hard limit", "not a dirham over"). A soft budget is shown a little
  /// above; a strict one never is.
  budgetStrict: z.boolean(),
  listingType: z.enum(LISTING_TYPES).nullable(),
  propertyTypes: z.array(z.enum(PROPERTY_TYPES)),
  bedsMin: z.number().int().nullable(),
  bedsMax: z.number().int().nullable(),
  /// Community names the visitor named explicitly, verbatim.
  communities: z.array(z.string()),
  goals: z.array(z.enum(GOALS)),
  /// Free-form lifestyle signals: "family-friendly", "near a school", "walkable".
  lifestyle: z.array(z.string()),
  /// A language they would prefer their broker to speak, if stated.
  languagePreference: z.string().nullable(),
  /// "ready to buy now", "in 6 months", etc.
  timeline: z.string().nullable(),
  /// One sentence, second person, reflecting the brief back to them.
  summary: z.string(),
});

export type BuyerIntent = z.infer<typeof BuyerIntentSchema>;

/// Used when extraction fails, so the pipeline degrades to pure vector search
/// rather than erroring out.
export const EMPTY_INTENT: BuyerIntent = {
  budgetMin: null,
  budgetMax: null,
  budgetStrict: false,
  listingType: null,
  propertyTypes: [],
  bedsMin: null,
  bedsMax: null,
  communities: [],
  goals: [],
  lifestyle: [],
  languagePreference: null,
  timeline: null,
  summary: "",
};
