# Brick & Musk - AI Property Discovery

A POC built for an AI Engineer interview with [Brick & Musk](https://www.brickandmusk.com),
a RERA-licensed Dubai luxury/investment brokerage (RERA 48328, License 1458200).

A buyer describes what they want in plain English; the app returns matched **areas**,
**properties** (with real computed investment figures) and **brokers** (matched on genuine
specialization), with a streamed explanation tying it all back to their brief.

## Why this exists

Their live site has a demonstrably broken search: `/listing?q=Business+Bay` and
`/listing?class=villas&type=buy` return **byte-identical 28,451-byte responses**, and the
listing grid never renders past `"Initializing..."`. Our `/listings` page is the direct
rebuttal - its filters are verified against ground truth on ten combinations.

## Stack

Next.js 16 (App Router) - React 19 - TypeScript - Tailwind v4 (`@theme inline`, no config
file) - `motion` - Prisma 7 - Postgres 17 + pgvector - OpenAI SDK against Bedrock Mantle.

## Running it

```bash
docker start ai-broker-db     # Postgres 17 + pgvector on port 5433
npm run dev                   # http://localhost:3000
npm run db:seed               # reseed 8 communities, 16 properties, 5 brokers
npm run doctor                # report which LLM models this credential can reach
```

Copy `.env.example` to `.env` and fill it in. Never commit `.env`. `testmoed.js` is
gitignored because it holds a plaintext key.

## LLM access - read this before debugging a 403

Bedrock Mantle exposes **two routes**, and they behave differently:

| Route | Models | Status on this account |
|---|---|---|
| `/anthropic` (native Messages API) | Claude family | **403 - not entitled.** Claude is unavailable. |
| `/v1` (OpenAI-compatible) | 55 open-weight models | **Works.** This is what we use. |

Claude models are *listed* by `/v1/models` but reject `/v1/chat/completions` with
"does not support this route" - they need the native route, which 403s. So Claude is
genuinely unreachable here, and `src/lib/llm.ts` uses the OpenAI SDK.

There are **no embedding models on either route**. That is why there is no vector search.

Models are env-driven (`LLM_MODEL_SMART`, `LLM_MODEL_FAST`) so swapping is config, not code.
Known-working: `deepseek.v3.2`, `zai.glm-5`, `openai.gpt-oss-120b`, `openai.gpt-oss-20b`,
`qwen.qwen3-235b-a22b-2507`, `mistral.mistral-large-3-675b-instruct`, `moonshotai.kimi-k2.5`,
`minimax.minimax-m2.5`. Run `npm run doctor` to re-check.

## Architecture

```
POST /api/discover  ->  streams NDJSON, one JSON object per line
  1. extractIntent   rules + model, merged (see below)
  2. hard filters    SQL, with ordered relaxation
  3. financials      computed deterministically, never by the model
  4. broker ranking  weighted specialization scoring
  5. narrative       streamed from the model over the computed facts
```

Event order: `intent` -> `communities` -> `properties` -> `brokers` -> many
`narrative_delta` -> `done`. Also possible: `narrative_unavailable`, `error`.

### The two-reader intent design

`src/lib/intent.ts` runs **both** a deterministic parser (`intent-rules.ts`) and the model,
then merges. **The rules win on hard constraints.** This is not belt-and-braces, it is load
bearing - these bugs were all observed in testing:

- Most models read *"a 2-bed I can rent **out**"* as `RENT`. It is plainly a purchase
  (`BUY`). A wrong `listingType` silently returns annual rents beside sale prices.
- Models set `budgetMin` equal to `budgetMax` for "AED 3M", turning a ceiling into an
  exact-price filter that matched nothing. **Budget is therefore merged as a pair**, never
  field by field.
- A model tagged `GOLDEN_VISA` unprompted, and the AED 2M legal floor then imposed a
  minimum price nobody asked for. The floor now applies **only when the rules** detect the
  visitor actually raised it.

The model owns the soft signals it is better at: lifestyle, phrasing, and the summary.

### Rules that must not be broken

- **Money is AED.** For a `RENT` listing, `price` is the **annual** rent - not monthly, not
  a sale price. Never mix rent and sale figures in one range or one result list.
- **The model never computes a number.** `src/lib/investment.ts` computes yields, service
  charge, DLD fee (4% + AED 580), Golden Visa eligibility (>= AED 2,000,000) and payment
  schedules. The model is handed those as facts and only explains them.
- **Null means unknown, and must not render.** Every financial field is `number | null`;
  for a RENT listing the yields, DLD fee and acquisition cost are all null. Filter the row
  out - never print "null" or "NaN".
- **Relaxation never changes category.** Widening property type or bedrooms is a real
  substitution. Turning `BUY` into `RENT` is a category error. Budget is relaxed last and
  effectively never; exact matches always lead and relaxed results only append behind them.
- **Dates are calendar days.** `handoverDate` is stored midnight UTC and rendered in
  `Asia/Dubai` (UTC+4), never viewer-local. Timezone drift was the single largest defect
  category in the sibling `novinic` project.
- **Every number shown is computed.** No hardcoded dashboard stats.

## Layout

```
prisma/schema.prisma        models; vector columns are unused, kept as the scale path
prisma/seed-data.json       curated dataset, 38 verified image URLs
prisma/seed.ts              reseeds from that file
src/lib/llm.ts              OpenAI client, streamText, completeJson, fence-tolerant parse
src/lib/intent.ts           model extraction + merge with rules
src/lib/intent-rules.ts     deterministic parser (13 tests)
src/lib/retrieval.ts        hard SQL filters + ordered relaxation
src/lib/investment.ts       all money maths (pure)
src/lib/brokers.ts          specialization scoring (pure)
src/app/api/discover/       the streaming pipeline
src/lib/__tests__/          plain tsx scripts, no test framework
```

## Testing

No test framework. Tests are standalone scripts:

```bash
npx tsx src/lib/__tests__/investment.test.ts
npx tsx src/lib/__tests__/brokers.test.ts
npx tsx src/lib/__tests__/retrieval.test.ts    # needs the DB running
npx tsx src/lib/__tests__/intent-rules.test.ts
```

`npx tsc --noEmit` and `npx next build` must both pass before calling work done.

## Conventions

- Server Actions under `src/lib/server/` return the shared `ActionResult<T>` from
  `src/lib/types/action-result.ts`. Import it; never redeclare it.
- Comment *why*, not *what*. Small functions, early returns.
- No `any`, no `@ts-ignore`.
- Compose UI from the existing tokens in `globals.css`. Dark-first, Fraunces display over
  Inter body, one champagne accent. No component library.
- Responsive down to 390px, no horizontal scroll.

## State and next steps

Working: landing, `/discover` (streamed), `/property/[id]`, `/listings` (filters verified),
`/brokers`, `/broker/[slug]`, the full LLM pipeline.

Not done yet:
- **Deploy.** Still on local Docker Postgres. Needs Neon + Vercel, and `DATABASE_URL`
  repointed.
- **Lead capture.** `Enquiry` rows are written on every search but there is no contact form.
- **Step 2** (agent workspace: assignment, `DealStage` pipeline, reminders, client portal)
  and **Step 3** (admin console). Schema stubs exist: `User`, `Role`, `Enquiry.agentId`,
  `Enquiry.stage`, `DealStage`.
- **No auth.** Deliberate for the demo. `better-auth` slots in at Step 2; the sibling
  project `/Users/vinaysiddam/Documents/Developer/novinic` has the pattern to copy.
- Visual design has never been checked in a real browser - verified by build and markup only.
