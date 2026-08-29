export type SourceRenderProofRow = {
  source: string;
  identity: string;
  state: string;
};

export function assertExactSourceRenderProof(proof: {
  screen: string;
  expectedRows: SourceRenderProofRow[];
  renderedRows: SourceRenderProofRow[];
}): SourceRenderProofRow[];
