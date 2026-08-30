import type { SourceRenderProofRow } from "./source-render-proof.mjs";

type Constraint = { key?: string; state?: string };

export function buildRiskMandateSourceRenderRows(mandateComparisons: {
  summary?: { constraints?: Constraint[] } | null;
  concentration?: { constraints?: Constraint[] } | null;
}): SourceRenderProofRow[];
