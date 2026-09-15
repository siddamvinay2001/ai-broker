import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getBedrockClient, MODEL_SMART } from "@/lib/bedrock";
import { extractIntent } from "@/lib/intent";
import { retrieveCommunities, retrievePropertiesWithFallback, type RetrievedProperty } from "@/lib/retrieval";
import { computeInvestment, computePaymentSchedule } from "@/lib/investment";
import { rankBrokers, type BrokerProfile } from "@/lib/brokers";
import type { BuyerIntent } from "@/lib/types/intent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/// Financials are computed here, deterministically, and handed to the model as
/// facts. The model explains the numbers; it never invents them.
function withFinancials(p: RetrievedProperty) {
  const investment = computeInvestment({
    listingType: p.listingType as "BUY" | "RENT" | "OFFPLAN",
    price: p.price,
    sizeSqft: p.sizeSqft,
    serviceChargePerSqft: p.serviceChargePerSqft,
    communityAvgRentPerSqft: p.communityAvgRentPerSqft,
    handoverDate: p.handoverDate,
    paymentPlan: p.paymentPlan,
  });
  const schedule = p.paymentPlan
    ? computePaymentSchedule(p.price, p.paymentPlan, p.handoverDate ?? undefined)
    : null;
  return { ...p, investment, schedule };
}

export async function POST(req: NextRequest) {
  let query = "";
  try {
    const body = (await req.json()) as { query?: unknown };
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!query) return Response.json({ error: "A query is required" }, { status: 400 });
  if (query.length > 2000) return Response.json({ error: "Query is too long" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        const intent: BuyerIntent = await extractIntent(query);
        send({ type: "intent", intent });

        // The inventory is small enough to filter in SQL and hand the whole
        // surviving set to the model in one prompt. The vector columns stay in
        // the schema as the path to scale, but nothing depends on them yet.
        const [search, communities] = await Promise.all([
          retrievePropertiesWithFallback(intent, null, 6),
          retrieveCommunities(null, 3),
        ]);
        const properties = search.properties.map(withFinancials);

        send({ type: "communities", communities });
        send({ type: "properties", properties, relaxations: search.relaxations });

        const brokerRows = await prisma.broker.findMany({ where: { deletedAt: null } });
        const ranked = rankBrokers(
          brokerRows as unknown as BrokerProfile[],
          intent,
          {
            recommendedCommunitySlugs: [...new Set(properties.map((p) => p.communitySlug))],
            medianRecommendedPrice: median(properties.map((p) => p.price)),
            recommendedPropertyTypes: [...new Set(properties.map((p) => p.propertyType))],
          },
        ).slice(0, 3);
        send({ type: "brokers", brokers: ranked });

        // A narrative failure must not cost the visitor their results or us
        // the lead record, so it is contained rather than allowed to bubble.
        try {
          await streamNarrative({ query, intent, properties, communities, relaxations: search.relaxations, send });
        } catch (err) {
          console.error("Narrative generation failed:", err);
          send({ type: "narrative_unavailable" });
        }

        const enquiry = await prisma.enquiry.create({
          data: {
            rawQuery: query,
            intent: intent as unknown as object,
            propertyIds: properties.map((p) => p.id),
            communityIds: communities.map((c) => c.id),
            matchedBrokerId: ranked[0]?.broker.id ?? null,
          },
          select: { id: true },
        });
        send({ type: "done", enquiryId: enquiry.id });
      } catch (err) {
        console.error("Discovery failed:", err);
        send({ type: "error", message: "Something went wrong building your matches." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

type NarrativeArgs = {
  query: string;
  intent: BuyerIntent;
  properties: ReturnType<typeof withFinancials>[];
  communities: Awaited<ReturnType<typeof retrieveCommunities>>;
  relaxations: string[];
  send: (event: unknown) => void;
};

async function streamNarrative({ query, intent, properties, communities, relaxations, send }: NarrativeArgs) {
  if (properties.length === 0) {
    send({ type: "narrative_delta", text: "Nothing in our current inventory matches that brief. Widen the budget or the area and we will look again." });
    return;
  }

  // The facts block is deterministic and computed. The model's only job is to
  // explain it in the buyer's terms - so it cannot fabricate a yield.
  const facts = properties.map((p) => ({
    ref: p.refNo,
    title: p.title,
    community: p.communityName,
    type: p.propertyType,
    listing: p.listingType,
    priceAed: p.price,
    beds: p.beds,
    sizeSqft: p.sizeSqft,
    view: p.view,
    grossYieldPct: p.investment.grossYieldPct,
    netYieldPct: p.investment.netYieldPct,
    annualServiceChargeAed: p.investment.annualServiceCharge,
    goldenVisaEligible: p.investment.goldenVisaEligible,
    handover: p.handoverDate ? p.handoverDate.toISOString().slice(0, 10) : null,
    paymentPlan: p.paymentPlan,
  }));

  const system = [
    "You are a senior Dubai property advisor at Brick & Musk, a RERA-licensed luxury brokerage.",
    "You are given a buyer's brief and a set of matched properties with PRE-COMPUTED financials.",
    "",
    "Rules:",
    "- Never invent or recalculate a number. Use only the figures given. If a figure is null, do not mention it.",
    "- Write for the buyer, in second person. Be direct and specific, never salesy.",
    "- Reference properties by their title and community, not by ref number.",
    "- Tie every recommendation back to what the buyer actually said they wanted.",
    "- Amounts are in AED. Service charges are annual. For rentals the price IS the annual rent.",
    "- 2-3 short paragraphs, no headings, no bullet points, no markdown.",
  ].join("\n");

  const client = getBedrockClient();
  const stream = client.messages.stream({
    model: MODEL_SMART,
    max_tokens: 1400,
    output_config: { effort: "low" },
    system,
    messages: [
      {
        role: "user",
        content: [
          `Buyer's brief, verbatim: "${query}"`,
          `Structured reading of that brief: ${JSON.stringify(intent)}`,
          `Matched communities: ${JSON.stringify(communities.map((c) => ({ name: c.name, avgGrossYield: c.avgGrossYield, character: c.lifestyleTags })))}`,
          `Matched properties with computed financials: ${JSON.stringify(facts)}`,
          relaxations.length
            ? `Nothing matched the brief exactly, so we ${relaxations.join(" and ")}. Say so plainly in your first sentence.`
            : "",
          "",
          "Explain why these are the right matches for this buyer.",
        ].join("\n"),
      },
    ],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      send({ type: "narrative_delta", text: event.delta.text });
    }
  }
}
