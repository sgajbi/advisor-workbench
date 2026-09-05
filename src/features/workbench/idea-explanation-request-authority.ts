const ADVISOR_RATIONALE_DRAFT_PURPOSE = "advisor_rationale_draft";
const REQUEST_FIELDS = "purpose|requestId|requestedAtUtc";
const SECURE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMEZONE_AWARE_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

type PreparedIdeaExplanationBody =
  | { status: "ready"; bodyText: string }
  | { status: "rejected"; reason: "invalid_idea_request" };

export function prepareIdeaExplanationBody(
  bodyText: string | undefined,
  encodedCandidateId: string,
  idempotencyKey: string | null,
): PreparedIdeaExplanationBody {
  if (!bodyText || !idempotencyKey) {
    return invalidRequest();
  }
  try {
    const body = JSON.parse(bodyText) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return invalidRequest();
    }
    const request = body as Record<string, unknown>;
    if (
      Object.keys(request).sort().join("|") !== REQUEST_FIELDS ||
      typeof request.requestId !== "string" ||
      request.requestId !== request.requestId.trim() ||
      request.requestId !== idempotencyKey ||
      request.purpose !== ADVISOR_RATIONALE_DRAFT_PURPOSE ||
      typeof request.requestedAtUtc !== "string" ||
      !isTimezoneAwareTimestamp(request.requestedAtUtc)
    ) {
      return invalidRequest();
    }
    const candidateId = decodeURIComponent(encodedCandidateId);
    if (!isSecureRequestId(request.requestId, candidateId)) {
      return invalidRequest();
    }
    return { status: "ready", bodyText: JSON.stringify(request) };
  } catch {
    return invalidRequest();
  }
}

function isSecureRequestId(requestId: string, candidateId: string): boolean {
  const prefix = `idea-explanation-${candidateId}-`;
  return (
    requestId.startsWith(prefix) &&
    SECURE_UUID_PATTERN.test(requestId.slice(prefix.length))
  );
}

function isTimezoneAwareTimestamp(value: string): boolean {
  return (
    TIMEZONE_AWARE_TIMESTAMP_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function invalidRequest(): PreparedIdeaExplanationBody {
  return { status: "rejected", reason: "invalid_idea_request" };
}
