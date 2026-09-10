import type { ForgeAvailability } from "./contracts";

export function parseForgeConfig(env: Record<string, string | undefined>) {
  const number = (key: string, fallback: number, min: number, max: number) => {
    const n = Number(env[key] ?? fallback);
    return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
  };
  // Same precedence as LearnIt. No model is silently selected.
  const apiKey = (env.OPENAI_API_KEY ?? env.AI_API_KEY)?.trim();
  const model = (env.OPENAI_MODEL ?? env.AI_MODEL)?.trim();
  const provider = env.AI_PROVIDER?.trim() || "openai-compatible";
  const baseURL = env.AI_BASE_URL?.trim() || "https://api.openai.com/v1";
  let validURL = false;
  try { const url = new URL(baseURL); validURL = ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash; } catch {}
  const availability: ForgeAvailability = apiKey && model && validURL && ["openai", "openai-compatible", "ai-sdk"].includes(provider) ? "configured" : "not_configured";
  return { apiKey, model, baseURL, availability,
    timeoutMs: number("AI_TIMEOUT_MS", 60000, 1000, 120000),
    maxInputChars: number("FORGE_AI_MAX_INPUT_CHARS", 30000, 8000, 60000),
    maxOutputTokens: number("FORGE_AI_MAX_OUTPUT_TOKENS", 4000, 256, 8000),
    rateLimitPerHour: number("FORGE_AI_RATE_LIMIT_PER_HOUR", 20, 1, 100),
  };
}
