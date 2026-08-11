export function parseUpstreamAttemptChain(value) {
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(",")
    .map((attempt) => attempt.trim())
    .filter(Boolean);
}

export function resolveSuccessfulTerminalUpstream(value, responseOk) {
  if (!responseOk) {
    return "unknown";
  }
  return parseUpstreamAttemptChain(value).at(-1) ?? "unknown";
}
