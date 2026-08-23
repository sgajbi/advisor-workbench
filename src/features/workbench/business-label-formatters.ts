export function preserveBusinessAcronyms(value: string): string {
  return value.replace(/\b(Pm|Hr|Oms|Dpm|Ai|Usd|Id)\b/g, (match) => match.toUpperCase());
}

export function formatBusinessBookingCenter(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  const knownBookingCenters: Record<string, string> = {
    SG: "Singapore",
  };
  return knownBookingCenters[normalized.toUpperCase()] ?? normalized;
}
