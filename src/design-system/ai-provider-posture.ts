export type AiProviderPosture = "deterministic" | "live" | "untrusted";

const DETERMINISTIC_PROVIDER_MODES = new Set(["disabled", "stub"]);
const LIVE_PROVIDER_MODES = new Set([
  "openai",
  "local_openai_compatible",
]);

/**
 * Classifies source-published provider provenance through the closed Lotus text-provider
 * vocabulary. Missing, unknown, or contradictory values remain untrusted so presentation
 * adapters cannot upgrade technical completion into live AI-assisted output.
 */
export function classifyAiProviderPosture(
  providerMode: unknown,
  stubbed: unknown,
): AiProviderPosture {
  if (typeof providerMode !== "string" || typeof stubbed !== "boolean") {
    return "untrusted";
  }

  const normalizedProviderMode = providerMode.trim();
  if (stubbed && DETERMINISTIC_PROVIDER_MODES.has(normalizedProviderMode)) {
    return "deterministic";
  }
  if (!stubbed && LIVE_PROVIDER_MODES.has(normalizedProviderMode)) {
    return "live";
  }
  return "untrusted";
}
