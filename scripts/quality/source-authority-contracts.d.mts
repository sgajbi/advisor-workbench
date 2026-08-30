import type { SourceRenderProofRow } from "../live/validation/source-render-proof.mjs";

export type SourceAuthorityContract = {
  readonly id: string;
  readonly screen: string;
  readonly sourceOwnership: Readonly<{ identity: string; state: string }>;
  readonly presentationOnly: readonly string[];
  readonly allowedStates: readonly string[];
  readonly renderedEvidence: Readonly<{
    rowSelector: string;
    sourceAttribute: string;
    identityAttribute: string;
    stateAttribute: string;
  }>;
  readonly implementationEvidence: readonly Readonly<{
    path: string;
    tokens: readonly string[];
  }>[];
  readonly sampleGatewayResponse: unknown;
  readonly target: Readonly<{
    source: string;
    identity: string;
    sourceState: string;
    mutatedSourceState: string;
    reassuringRenderedState: string;
  }>;
  buildExpectedRows(payload: unknown): SourceRenderProofRow[];
  mutateSourceState(payload: unknown, state: string): void;
};

export const SOURCE_AUTHORITY_CONTRACTS: readonly SourceAuthorityContract[];
