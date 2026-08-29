import type { SemanticBadgeTone } from "@/design-system";

export type AdvisorCockpitReadinessKind =
  | "overall"
  | "integration"
  | "workstation"
  | "data"
  | "client_publication";

export type AdvisorCockpitReadinessState =
  | "available"
  | "blocked"
  | "not_reported";

export type AdvisorCockpitReadinessPresentation = {
  state: AdvisorCockpitReadinessState;
  label: string;
  detail: string;
  tone: SemanticBadgeTone;
  rawValue: string | null;
};

export type AdvisorCockpitOperatingBoundaryPresentation = {
  label: string;
  detail: string;
  rawValue: string;
  isRecognized: boolean;
};

const READINESS_PRESENTATIONS: Record<
  string,
  Omit<AdvisorCockpitReadinessPresentation, "rawValue">
> = {
  "overall:ADVISE_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED": {
    state: "available",
    label: "Available",
    detail: "Advisor Cockpit evidence is available for internal preparation.",
    tone: "success",
  },
  "integration:SUPPORTED_BY_LOTUS_GATEWAY_RFC0026": {
    state: "available",
    label: "Available",
    detail: "Required advisory information is available through the governed access path.",
    tone: "success",
  },
  "workstation:CANONICAL_WORKBENCH_PROOF_PASSED_RFC0026": {
    state: "available",
    label: "Available",
    detail: "The advisor workspace passed its current source checks.",
    tone: "success",
  },
  "data:ACTIVE_ADVISOR_COCKPIT_PRODUCTS_RFC0026": {
    state: "available",
    label: "Available",
    detail: "Required preparation data is published for internal advisor use.",
    tone: "success",
  },
  "client_publication:BLOCKED": {
    state: "blocked",
    label: "Blocked",
    detail: "Client-ready publication remains blocked by the source workflow.",
    tone: "danger",
  },
};

const OPERATING_BOUNDARY_PRESENTATIONS: Record<
  string,
  Omit<AdvisorCockpitOperatingBoundaryPresentation, "rawValue">
> = {
  CLIENT_READY_PUBLICATION: {
    label: "Client publication unavailable",
    detail: "This workspace does not release material for client use.",
  },
  EXTERNAL_CLIENT_COMMUNICATION: {
    label: "Client communication unavailable",
    detail: "Client outreach remains outside this workspace.",
  },
  OMS_ORDER_LIFECYCLE: {
    label: "Order workflow unavailable",
    detail: "Order routing and lifecycle actions remain outside this workspace.",
  },
};

export function presentAdvisorCockpitReadiness(
  kind: AdvisorCockpitReadinessKind,
  value: unknown,
): AdvisorCockpitReadinessPresentation {
  const rawValue = stringValue(value);
  const presentation = rawValue
    ? READINESS_PRESENTATIONS[`${kind}:${rawValue}`]
    : undefined;

  if (presentation) {
    return { ...presentation, rawValue };
  }

  return {
    state: "not_reported",
    label: "Not reported",
    detail: "A recognized business readiness status is not available from the current source.",
    tone: "default",
    rawValue,
  };
}

export function presentAdvisorCockpitOperatingBoundary(
  value: string,
): AdvisorCockpitOperatingBoundaryPresentation {
  const rawValue = value.trim();
  const presentation = OPERATING_BOUNDARY_PRESENTATIONS[rawValue];

  return {
    ...(presentation ?? {
      label: "Additional workflow capability unavailable",
      detail: "The source reports another unsupported capability; see Support details.",
    }),
    rawValue,
    isRecognized: presentation !== undefined,
  };
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
