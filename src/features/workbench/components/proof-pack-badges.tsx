"use client";

import { businessStateLabel, formatBusinessReason } from "@/copy/business-state-copy";
import { SemanticBadge } from "@/design-system";

import {
  proofPackAvailabilityLabel,
  proofPackAvailabilityTone,
  proofPackBadgeTone,
} from "@/features/workbench/proof-pack-panel-helpers";

type ProofPackStateBadgeProps = {
  state: string;
  reason?: boolean;
};

type ProofPackAvailabilityBadgeProps = {
  label: string;
  available?: boolean;
  statusLabel?: string;
};

export function ProofPackStateBadge({ state, reason = false }: ProofPackStateBadgeProps) {
  return (
    <SemanticBadge tone={proofPackBadgeTone(state)}>
      {reason ? formatBusinessReason(state) : businessStateLabel(state)}
    </SemanticBadge>
  );
}

export function ProofPackAvailabilityBadge({
  label,
  available,
  statusLabel,
}: ProofPackAvailabilityBadgeProps) {
  const displayStatus = statusLabel ?? proofPackAvailabilityLabel(Boolean(available));
  const toneSource = statusLabel ?? displayStatus;

  return (
    <SemanticBadge
      tone={statusLabel ? proofPackAvailabilityTone(toneSource) : available ? "success" : "default"}
    >
      {label} {displayStatus}
    </SemanticBadge>
  );
}
