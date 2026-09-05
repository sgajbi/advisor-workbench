export function buildIdeaExplanationSourceRenderRows(payload) {
  const response = payload?.data ?? payload;
  const candidateId = response?.explanation?.candidateId;
  const evidence = response?.explanation?.redactedEvidence;
  const status = response?.status;
  if (
    typeof candidateId !== "string" ||
    candidateId.length === 0 ||
    typeof evidence?.evidencePacketId !== "string" ||
    evidence.evidencePacketId.length === 0 ||
    typeof evidence?.evidenceContentHash !== "string" ||
    evidence.evidenceContentHash.length === 0 ||
    typeof evidence?.sourceRevisionVectorDigest !== "string" ||
    evidence.sourceRevisionVectorDigest.length === 0 ||
    typeof status !== "string" ||
    status.length === 0
  ) {
    throw new Error(
      "Idea explanation source proof requires candidate identity and explanation status.",
    );
  }
  return [
    {
      source: "lotus-idea",
      identity: JSON.stringify([
        candidateId,
        evidence.evidencePacketId,
        evidence.evidenceContentHash,
        evidence.sourceRevisionVectorDigest,
      ]),
      state: status,
    },
  ];
}
