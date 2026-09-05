export function buildIdeaExplanationSourceRenderRows(payload) {
  const response = payload?.data ?? payload;
  const candidateId = response?.explanation?.candidateId;
  const status = response?.status;
  if (
    typeof candidateId !== "string" ||
    candidateId.length === 0 ||
    typeof status !== "string" ||
    status.length === 0
  ) {
    throw new Error(
      "Idea explanation source proof requires candidate identity and explanation status.",
    );
  }
  return [{ source: "lotus-idea", identity: candidateId, state: status }];
}
