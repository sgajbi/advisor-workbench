export function formatProposalEvidenceHash(
  value: string | null | undefined,
): string {
  const normalized = value?.trim();
  if (!normalized) {
    return "Not available";
  }
  if (normalized.length <= 24) {
    return normalized;
  }
  return `${normalized.slice(0, 16)}...${normalized.slice(-8)}`;
}
