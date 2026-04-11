import type { ValidationPanelState, ValidationSummary } from "./shared-types";

export function assertPerformanceCalculationSanity(input: {
  summary: ValidationSummary;
  performanceSummary: Record<string, unknown>;
  performanceDetails: Record<string, unknown>;
  recordPanelClassification(
    panel: string,
    state: ValidationPanelState,
    owner: string,
    evidence: Record<string, unknown>
  ): void;
}): void;

export function assertRiskCalculationSanity(input: {
  summary: ValidationSummary;
  riskSummary: Record<string, unknown>;
  concentration: Record<string, unknown>;
  drawdown: Record<string, unknown>;
  rolling: Record<string, unknown>;
  attribution: Record<string, unknown>;
  recordPanelClassification(
    panel: string,
    state: ValidationPanelState,
    owner: string,
    evidence: Record<string, unknown>
  ): void;
}): void;
