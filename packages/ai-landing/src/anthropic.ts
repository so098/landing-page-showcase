import type { GeneratedLandingFiles } from "./types.js";

export type ClaudeConfig = {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
};

function stripFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export function parseGeneratedFiles(text: string): GeneratedLandingFiles {
  const parsed = JSON.parse(stripFence(text)) as Partial<GeneratedLandingFiles>;
  if (!parsed.html || !parsed.css) {
    throw new Error("Claude response must include html and css fields");
  }
  return {
    html: parsed.html,
    css: parsed.css,
    js: parsed.js ?? "",
    notes: parsed.notes,
  };
}

export async function callClaudeForLanding(params: {
  system: string;
  user: string;
  config: ClaudeConfig;
}): Promise<{ text: string; model: string }> {
  const apiKey = params.config.apiKey;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY or CLAUDE_API_KEY is required");

  const models = [
    params.config.model,
    "claude-sonnet-4-6",
    "claude-sonnet-4-5-20250929",
    "claude-sonnet-4-20250514",
    "claude-haiku-4-5-20251001",
  ].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

  let json: {
    model?: string;
    content?: Array<{ type: string; text?: string }>;
  } | null = null;
  let usedModel = models[0] ?? "unknown";
  let lastError = "";
  for (const model of models) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: params.config.maxTokens ?? 7000,
        temperature: 0.4,
        system: params.system,
        messages: [{ role: "user", content: params.user }],
      }),
    });

    if (res.ok) {
      json = await res.json() as {
        model?: string;
        content?: Array<{ type: string; text?: string }>;
      };
      usedModel = model;
      break;
    }

    const body = await res.text();
    lastError = `Claude API ${res.status} (${model}): ${body.slice(0, 800)}`;
    if (res.status !== 404) break;
  }

  if (!json) {
    throw new Error(lastError || "Claude API failed");
  }
  const text = json.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n") ?? "";
  if (!text.trim()) throw new Error("Claude API returned empty text");
  return { text, model: json.model ?? usedModel };
}
