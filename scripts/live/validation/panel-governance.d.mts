import type {
  ValidationPanelState,
  ValidationSummary,
} from "./shared-types";

export function createPanelGovernance(
  summary: ValidationSummary,
  panelRegistry: {
    panels: Array<{
      panelId: string;
      owningService: string;
      gatewayEndpoint: string | null;
      requiredSupportState: ValidationPanelState;
      allowedStates: ValidationPanelState[];
      knownLimitations: string[];
      ownerFollowUpRfc: string | null;
    }>;
  }
): {
  panelRegistryById: Map<string, Record<string, unknown>>;
  recordPanelClassification(
    panel: string,
    state: ValidationPanelState,
    owner: string,
    evidence: Record<string, unknown>
  ): void;
  assertNoUnsupportedBlankPanels(): void;
  assertPanelSupportabilityAlignment(): void;
};
