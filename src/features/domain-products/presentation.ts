import type {
  DomainProductTrustCertification,
  DomainProductTrustCertificationData,
} from "./api";

export type TrustTone = "success" | "warn" | "danger" | "default";
export type SourceAvailability = "checking" | "ready" | "retained" | "unavailable";

export function getTrustAvailability({
  data,
  loading,
  hasError,
}: {
  data: DomainProductTrustCertificationData | undefined;
  loading: boolean;
  hasError: boolean;
}): SourceAvailability {
  if (loading && !data) return "checking";
  if (hasError && data?.trustAvailable) return "retained";
  if (hasError || !data?.trustAvailable) return "unavailable";
  return "ready";
}

export function getProductTrustLabel(
  trust: DomainProductTrustCertification | undefined,
  availability: SourceAvailability
): string {
  if (availability === "checking") return "Checking";
  if (availability === "unavailable" || !trust) return "Not available";
  const trustLabel = formatStateLabel(trust.certificationState);
  return availability === "retained" ? `${trustLabel} · earlier evidence` : trustLabel;
}

export function getEvidenceValue(
  value: string | null | undefined,
  availability: SourceAvailability
) {
  if (availability === "checking") return "Checking";
  if (availability === "unavailable" || !value) return "Not available";
  return formatStateLabel(value);
}

export function getLineageValue(
  value: boolean | null | undefined,
  availability: SourceAvailability
) {
  if (availability === "checking") return "Checking";
  if (availability === "unavailable" || value == null) return "Not available";
  return value ? "Available" : "Not materialised";
}

export function getTrustTone(state: string): TrustTone {
  if (state === "certified") return "success";
  if (state === "attention_required" || state === "unavailable") return "warn";
  if (state === "blocked") return "danger";
  return "default";
}

export function formatIdentifier(value: string): string {
  return value
    .replaceAll(":", " · ")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .replace(/\blotus\b/g, "Lotus")
    .trim();
}

export function formatStateLabel(state: string): string {
  const label = formatIdentifier(state);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(parsed);
}
