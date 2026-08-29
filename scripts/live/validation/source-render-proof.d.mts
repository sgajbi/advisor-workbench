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

export function assertSourceBusinessLabelProof(proof: {
  screen: string;
  fact: string;
  sourceValue: string;
  renderedValue: string;
}): string;
