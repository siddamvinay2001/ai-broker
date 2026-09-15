/**
 * Bedrock client plumbing shared by the rest of the app: a lazily-built
 * Anthropic-on-Bedrock client for text generation, and a Titan embeddings
 * helper for pgvector search. Nothing here talks to AWS at import time -
 * every client is constructed on first use so importing this module never
 * throws in environments without AWS credentials configured yet (e.g. at
 * Next.js build time).
 */
import { AnthropicBedrockMantle } from "@anthropic-ai/bedrock-sdk";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ThrottlingException,
} from "@aws-sdk/client-bedrock-runtime";

/** Bedrock model IDs take an `anthropic.` prefix and no date suffix. */
export const MODEL_SMART = "anthropic.claude-opus-5";
export const MODEL_FAST = "anthropic.claude-haiku-4-5";

const TITAN_EMBED_MODEL_ID = "amazon.titan-embed-text-v2:0";
/** Must match the Postgres `vector(1024)` column width - never change this
 * without a matching column migration. */
const EMBED_DIMENSIONS = 1024;
/** Titan has no batch endpoint; this caps how many in-flight requests
 * embedMany fires at once so we don't hammer the account's TPS quota. */
const EMBED_CONCURRENCY = 5;

const MAX_THROTTLE_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 4000;

let bedrockClient: AnthropicBedrockMantle | undefined;
let runtimeClient: BedrockRuntimeClient | undefined;

/** Module-level singleton for the Messages-API (Claude text generation)
 * client. Constructed on first call, not at import time. */
export function getBedrockClient(): AnthropicBedrockMantle {
  if (!bedrockClient) {
    bedrockClient = new AnthropicBedrockMantle({
      awsRegion: process.env.AWS_REGION,
    });
  }
  return bedrockClient;
}

/** Module-level singleton for the raw bedrock-runtime client, used only for
 * Titan embeddings (the Anthropic SDK does not do embeddings). */
function getRuntimeClient(): BedrockRuntimeClient {
  if (!runtimeClient) {
    runtimeClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
  }
  return runtimeClient;
}

/** Matches both the typed SDK exception and a bare 429 surfaced through the
 * generic HTTP metadata, since not every throttling response is guaranteed
 * to deserialize into the typed class. */
function isThrottlingError(err: unknown): boolean {
  if (err instanceof ThrottlingException) return true;
  if (err && typeof err === "object" && "$metadata" in err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
    return status === 429;
  }
  return false;
}

/** Full-jitter exponential backoff: random delay in [0, base * 2^attempt],
 * capped so a run of retries can't stall for too long. */
function throttleBackoffMs(attempt: number): number {
  const capped = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  return Math.random() * capped;
}

/** Retries only on throttling; every other error (validation, auth, model
 * errors) fails fast since retrying those just wastes the retry budget. */
async function withThrottleRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isThrottlingError(err) || attempt >= MAX_THROTTLE_RETRIES) throw err;
      await new Promise((resolve) => setTimeout(resolve, throttleBackoffMs(attempt)));
    }
  }
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((n) => typeof n === "number");
}

/** Single text to a 1024-dim Titan embedding. */
export async function embed(text: string): Promise<number[]> {
  const client = getRuntimeClient();
  const body = JSON.stringify({
    inputText: text,
    dimensions: EMBED_DIMENSIONS,
    normalize: true,
  });

  const response = await withThrottleRetry(() =>
    client.send(
      new InvokeModelCommand({
        modelId: TITAN_EMBED_MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body,
      }),
    ),
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(response.body));
  } catch {
    throw new Error(
      `Titan embedding response for model ${TITAN_EMBED_MODEL_ID} was not valid JSON`,
    );
  }

  const embedding =
    parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).embedding : undefined;

  if (!isNumberArray(embedding)) {
    throw new Error(
      `Titan embedding response had no numeric \`embedding\` array - got: ${JSON.stringify(parsed)}`,
    );
  }
  if (embedding.length !== EMBED_DIMENSIONS) {
    throw new Error(
      `Titan returned a ${embedding.length}-dim vector, expected ${EMBED_DIMENSIONS}. ` +
        "Check the `dimensions` request param matches the pgvector column width.",
    );
  }

  return embedding;
}

/** Maps texts to embeddings with bounded concurrency, preserving input
 * order regardless of which worker finishes first. */
export async function embedMany(texts: string[]): Promise<number[][]> {
  const results = new Array<number[]>(texts.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < texts.length) {
      const i = nextIndex++;
      results[i] = await embed(texts[i]);
    }
  }

  const workerCount = Math.min(EMBED_CONCURRENCY, texts.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}

/** pgvector literal form for interpolation into raw SQL, e.g. `[0.1,0.2]`. */
export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
