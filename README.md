# Majlis

AI-guided property discovery for the Dubai market.

Describe what you are looking for in plain English and Majlis returns the areas, the homes
and the broker that actually fit, with the investment maths computed rather than guessed.

> A *majlis* is the reception room where people gather to talk and decide. The mark is its
> doorway.

## What it does

Type something like *"AED 3M, a 2-bed I can rent out, family-friendly, near a good school"*
and the app streams back three linked result sets:

- **Areas** that suit the stated goals, with price per sqft and average gross yield
- **Homes** ranked against the brief, each with real figures: gross and net yield, annual
  service charge, DLD transfer fee, Golden Visa eligibility, and off-plan payment schedules
- **Brokers** matched on genuine specialisation - the communities they actually deal in,
  property types, languages and track record - with the reasons shown

A written briefing streams underneath, explaining the numbers in the buyer's own terms.

## How the search works

Two readers parse every brief, and the deterministic one wins on anything that must be exact.

A rule-based parser handles budget, bedrooms and buy-versus-rent. A language model handles
the soft signals it is genuinely better at: lifestyle, phrasing and the summary. This split
is deliberate, and each half of it came from a real failure:

- Most models read *"a 2-bed I can rent **out**"* as a tenancy. It is plainly a purchase, and
  getting it wrong puts annual rents next to sale prices in the same list.
- *"strictly under AED 4M"* must never return AED 4.2M, so a ceiling marked strict is never
  stretched.
- *"rental under 5k"* means 5,000 a month. Read as an annual figure it matches nothing in
  Dubai, because nothing in Dubai is that cheap.
- Models routinely echo one stated figure into both bounds, turning *"under 5k"* into an
  exact-price filter. Nobody shopping for a home means "exactly", so an equal pair is read
  as a ceiling.

Hard constraints bind in SQL, so a result can never violate something the buyer stated. When
too little matches, the search widens in a fixed order and says what it widened. Property
type and bedroom count are fair to relax. Turning a purchase into a tenancy is not, and the
budget is never dropped.

**Every figure shown is computed, never generated.** The model is handed the numbers as facts
and only explains them.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Prisma 7, PostgreSQL, and an
OpenAI-compatible model endpoint.

## Running it

Requires Docker and Node 22.

```bash
docker run -d --name ai-broker-db \
  -e POSTGRES_USER=broker -e POSTGRES_PASSWORD=broker -e POSTGRES_DB=ai_broker \
  -p 5433:5432 pgvector/pgvector:pg17

cp .env.example .env      # then fill in DATABASE_URL and the model credentials
npm install
npx prisma migrate deploy
npm run db:seed           # 8 communities, 16 properties, 5 brokers
npm run dev
```

| Command | Does |
|---|---|
| `npm run dev` | Development server on :3000 |
| `npm run db:seed` | Reseed the curated dataset |
| `npm run db:studio` | Browse the database |
| `npm run doctor` | Report which models the current credential can reach |

## Tests

Plain scripts, no framework:

```bash
npx tsx src/lib/__tests__/investment.test.ts     # yields, DLD fee, payment plans
npx tsx src/lib/__tests__/brokers.test.ts        # specialisation scoring
npx tsx src/lib/__tests__/intent-rules.test.ts   # brief parsing
npx tsx src/lib/__tests__/retrieval.test.ts      # needs the database running
```

`scripts/` holds headless-Chrome checks that measure layout, follow every rendered link, and
sample the loading UI mid-stream.

## Contributing

After cloning, wire up the commit hook (local git config does not survive a clone):

```bash
git config core.hooksPath .githooks
```

It strips co-author and tool-attribution trailers so every commit carries a single author.

## Notes

The dataset is fictional and built for demonstration. Prices, service charges and yields are
modelled on the real market; the listings and brokers are not real.

Documentation for contributors, including the rules that must not be broken, is in
`CLAUDE.md`.
