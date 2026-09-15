/**
 * Turns a visitor's free-text brief into a structured BuyerIntent using the
 * cheap/fast Bedrock model. This sits in front of vector search: on any
 * failure we degrade to EMPTY_INTENT (pure vector search) rather than
 * throwing, since a broken extractor should never take down search.
 */
import {
  BuyerIntentSchema,
  EMPTY_INTENT,
  GOALS,
  LISTING_TYPES,
  PROPERTY_TYPES,
  type BuyerIntent,
} from "@/lib/types/intent";
import { getBedrockClient, MODEL_FAST } from "@/lib/bedrock";

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
function extractResponseText(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined;
  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: unknown }).type === "text" &&
      typeof (block as { text?: unknown }).text === "string"
    ) {
      return (block as { text: string }).text;
    }
  }
  return undefined;
}

export async function extractIntent(query: string): Promise<BuyerIntent> {
  try {
    const client = getBedrockClient();
    const response = await client.messages.create({
      model: MODEL_FAST,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: "json_schema", schema: INTENT_JSON_SCHEMA },
      },
      messages: [{ role: "user", content: query }],
    });

    const text = extractResponseText(response.content);
    if (text === undefined) {
      throw new Error("Bedrock response had no text block to parse as intent JSON");
    }

    const raw: unknown = JSON.parse(text);
    const repaired = repairRawIntent(raw);

    const result = BuyerIntentSchema.safeParse(repaired);
    if (!result.success) {
      throw new Error(`Intent extraction failed schema validation: ${result.error.message}`);
    }

    return result.data;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`extractIntent: falling back to EMPTY_INTENT - ${reason}`);
    return { ...EMPTY_INTENT, summary: query };
  }
}
