import OpenAI from "openai";

/// Bedrock Mantle exposes two routes. The native `/anthropic` route carries the
/// Claude models but is not entitled on this account, so we use the
/// OpenAI-compatible `/v1` route and the open-weight models available there.
/// Model ids are env-driven so swapping one is a config change, not a deploy.

export const MODEL_SMART = process.env.LLM_MODEL_SMART ?? "deepseek.v3.2";
export const MODEL_FAST = process.env.LLM_MODEL_FAST ?? "zai.glm-5";

let client: OpenAI | null = null;

/// Constructed on first use so importing this module never throws in an
/// environment that has no credentials (builds, tests, CI).
export function getLlm(): OpenAI {
  if (client) return client;
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) throw new Error("LLM_API_KEY is not set");
  client = new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL ?? "https://bedrock-mantle.us-east-1.api.aws/v1",
  });
  return client;
}

/// Several models on this route wrap JSON in markdown fences even when asked
/// for a schema, so unwrap before parsing rather than failing the request.
export function parseJsonLoose(raw: string): unknown {
  let text = raw.trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) text = fenced[1].trim();
  else text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  try {
    return JSON.parse(text);
  } catch {
    // Last resort: take the outermost brace-balanced object in the response.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object found in model output");
    return JSON.parse(text.slice(start, end + 1));
  }
}

export type JsonRequest = {
  model?: string;
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
};

/// A single structured-output call. Returns parsed JSON, or throws - callers
/// decide how to degrade.
export async function completeJson({
  model = MODEL_FAST,
  system,
  user,
  schemaName,
  schema,
  maxTokens = 3000,
}: JsonRequest): Promise<unknown> {
  const res = await getLlm().chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: schemaName, strict: true, schema },
    },
    max_completion_tokens: maxTokens,
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("Model returned no content");
  return parseJsonLoose(content);
}

export type StreamRequest = {
  model?: string;
  system: string;
  user: string;
  maxTokens?: number;
};

/// Yields text fragments as they arrive, so the UI can render progressively.
export async function* streamText({
  model = MODEL_SMART,
  system,
  user,
  maxTokens = 1400,
}: StreamRequest): AsyncGenerator<string> {
  const stream = await getLlm().chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_completion_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
