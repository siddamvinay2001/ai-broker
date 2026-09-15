/**
 * Turns a visitor's free-text brief into a structured BuyerIntent.
 *
 * Two readers run, not one. A deterministic parser handles the constraints
 * that must be exactly right - budget, bedrooms, buy vs rent - and the model
 * handles the soft signals it is genuinely better at: lifestyle, phrasing,
 * and the summary. Where both have an opinion on a hard constraint, the rules
 * win. That is deliberate: in testing, most models read "a 2-bed I can rent
 * out" as a tenancy (RENT) when it is plainly a purchase (BUY), and a wrong
 * listingType silently returns annual rents next to sale prices.
 */
import {
  BuyerIntentSchema,
  EMPTY_INTENT,
  GOALS,
  LISTING_TYPES,
  PROPERTY_TYPES,
  type BuyerIntent,
} from "@/lib/types/intent";
import { completeJson, MODEL_FAST } from "@/lib/llm";
import { parseIntentRules, type KnownCommunity } from "@/lib/intent-rules";

/** AED. Below this, "Golden Visa" talk doesn't actually qualify - used to
 * floor budgetMin when the model tags the GOLDEN_VISA goal. */
const GOLDEN_VISA_THRESHOLD = 2_000_000;

const SYSTEM_PROMPT = `You are a Dubai real-estate brief parser. Read a visitor's free-text \
message and extract a structured buyer intent brief. Return ONLY JSON matching the given \
schema - no prose, no markdown fences.

Domain knowledge you must apply:

- All money amounts are AED unless the visitor names another currency. Parse shorthand: \
"3M" / "3 million" / "AED 3,000,000" all mean 3000000. "30k per month" or "30k/month" is a \
MONTHLY rent - multiply by 12 to get 360000, because rent budgets in this schema \
(budgetMin/budgetMax for a RENT listing) are always ANNUAL figures.
- Golden Visa: the UAE Golden Visa property-investment threshold is AED 2,000,000. If the \
visitor mentions the Golden Visa (or wanting residency via property investment), add \
"GOLDEN_VISA" to goals AND make sure budgetMin is at least 2000000 (raise it if they stated \
a lower number or none at all).
- "rent it out", "yield", "ROI", "rental return" imply the visitor is BUYING a property in \
order to lease it out for income. Set listingType to "BUY" (never "RENT") and add both \
"INVESTMENT" and "RENTAL_YIELD" to goals.
- "I want to rent", "looking to lease", "need a rental" imply listingType "RENT".
- "off-plan", "payment plan", "before handover", "under construction" imply listingType \
"OFFPLAN".
- Recognise real Dubai community/area names (e.g. Dubai Marina, Downtown Dubai, Palm \
Jumeirah, JVC, Business Bay, Arabian Ranches, Dubai Hills Estate, DIFC, JBR, Al Barsha, Mirdif, \
Dubai Silicon Oasis, Jumeirah Village Circle, Emaar Beachfront, Dubai South, Motor City) and \
put them in "communities" verbatim as the visitor wrote them.
- "summary" must be exactly one sentence, addressed to the visitor in second person ("You're \
looking for..."), reflecting their brief back to them.
- Leave any field the visitor did not address as null (or an empty array for list fields) - \
never invent a constraint they didn't state.`;

/** Plain JSON Schema (not zod) so it can be handed straight to
 * `output_config.format` - keep this in sync with BuyerIntentSchema by hand
 * since the two are deliberately decoupled representations. */
const INTENT_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    budgetMin: { type: ["number", "null"] },
    budgetMax: { type: ["number", "null"] },
    listingType: { type: ["string", "null"], enum: [...LISTING_TYPES, null] },
    propertyTypes: {
      type: "array",
      items: { type: "string", enum: [...PROPERTY_TYPES] },
    },
    bedsMin: { type: ["integer", "null"] },
    bedsMax: { type: ["integer", "null"] },
    communities: { type: "array", items: { type: "string" } },
    goals: { type: "array", items: { type: "string", enum: [...GOALS] } },
    lifestyle: { type: "array", items: { type: "string" } },
    languagePreference: { type: ["string", "null"] },
    timeline: { type: ["string", "null"] },
    summary: { type: "string" },
  },
  required: [
    "budgetMin",
    "budgetMax",
    "listingType",
    "propertyTypes",
    "bedsMin",
    "bedsMax",
    "communities",
    "goals",
    "lifestyle",
    "languagePreference",
    "timeline",
    "summary",
  ],
  additionalProperties: false,
};

/** Cheap, deterministic repairs for common model mistakes - applied before
 * schema validation so a fixable slip doesn't trigger the EMPTY_INTENT
 * fallback. Only touches fields whose "obviously wrong" shape is cheap to
 * detect from the parsed JSON alone. */
function repairRawIntent(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const data = raw as Record<string, unknown>;

  // Missing/malformed list fields default to [] rather than fail validation.
  for (const key of ["propertyTypes", "communities", "goals", "lifestyle"] as const) {
    if (!Array.isArray(data[key])) data[key] = [];
  }

  // A swapped min/max is a common model slip, not a real validation failure.
  if (
    typeof data.budgetMin === "number" &&
    typeof data.budgetMax === "number" &&
    data.budgetMin > data.budgetMax
  ) {
    const min = data.budgetMin;
    data.budgetMin = data.budgetMax;
    data.budgetMax = min;
  }

  // Golden Visa floor, in case the model tagged the goal but forgot the
  // budget implication (or understated it).
  if (Array.isArray(data.goals) && data.goals.includes("GOLDEN_VISA")) {
    const currentMin = typeof data.budgetMin === "number" ? data.budgetMin : 0;
    data.budgetMin = Math.max(currentMin, GOLDEN_VISA_THRESHOLD);
  }

  return data;
}

/** Pulls the first text block out of a Messages API response without
 * depending on the SDK's ContentBlock union type - narrowed by hand so this
 * works regardless of which content block variants the SDK version exports. */

/// The model returns tags like "FAMILY_FRIENDLY" while the rules return
/// "family-friendly". Without normalising, both survive and the UI shows the
/// same signal twice in two different styles.
function dedupeLifestyle(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const label = raw.trim().replace(/_/g, " ").toLowerCase();
    if (!label) continue;
    const key = label.replace(/[^a-z]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/// Rules win on hard constraints they resolved; the model fills the gaps and
/// owns the soft signals. Never let the model overwrite a constraint the
/// rules were certain about.
function mergeIntents(rules: BuyerIntent, model: BuyerIntent): BuyerIntent {
  const prefer = <T,>(ruleValue: T | null, modelValue: T | null): T | null =>
    ruleValue !== null ? ruleValue : modelValue;

  // Budget is merged as a PAIR, never field by field. "AED 3M" is a ceiling,
  // and the rules read it that way; models routinely also set budgetMin to
  // 3M, which turns a ceiling into an exact-price filter and returns nothing.
  // If the rules resolved either bound, their reading of the budget stands.
  const rulesHaveBudget = rules.budgetMin !== null || rules.budgetMax !== null;

  return {
    budgetMin: rulesHaveBudget ? rules.budgetMin : model.budgetMin,
    budgetMax: rulesHaveBudget ? rules.budgetMax : model.budgetMax,
    listingType: prefer(rules.listingType, model.listingType),
    bedsMin: prefer(rules.bedsMin, model.bedsMin),
    bedsMax: prefer(rules.bedsMax, model.bedsMax),
    propertyTypes: rules.propertyTypes.length ? rules.propertyTypes : model.propertyTypes,
    communities: rules.communities.length ? rules.communities : model.communities,
    goals: [...new Set([...rules.goals, ...model.goals])],
    lifestyle: dedupeLifestyle([...model.lifestyle, ...rules.lifestyle]),
    languagePreference: prefer(rules.languagePreference, model.languagePreference),
    timeline: model.timeline ?? rules.timeline,
    summary: model.summary?.trim() || rules.summary,
  };
}

export async function extractIntent(
  query: string,
  knownCommunities: KnownCommunity[] = [],
): Promise<BuyerIntent> {
  const rules = parseIntentRules(query, knownCommunities);

  try {
    const raw = await completeJson({
      model: MODEL_FAST,
      system: SYSTEM_PROMPT,
      user: query,
      schemaName: "buyer_intent",
      schema: INTENT_JSON_SCHEMA as Record<string, unknown>,
      maxTokens: 3000,
    });

    const result = BuyerIntentSchema.safeParse(repairRawIntent(raw));
    if (!result.success) {
      throw new Error(`schema validation failed: ${result.error.message}`);
    }

    const merged = mergeIntents(rules, result.data);

    // The AED 2M floor is a real legal threshold, so it may only be applied
    // when the visitor actually raised the Golden Visa - which the rules
    // detect from their words. Models sometimes tag the goal unprompted, and
    // acting on that silently imposes a minimum price nobody asked for.
    if (rules.goals.includes("GOLDEN_VISA")) {
      merged.budgetMin = Math.max(merged.budgetMin ?? 0, GOLDEN_VISA_THRESHOLD);
    }
    return merged;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`extractIntent: model unavailable, using rule-based parse only - ${reason}`);
    return rules.summary ? rules : { ...EMPTY_INTENT, summary: query };
  }
}
