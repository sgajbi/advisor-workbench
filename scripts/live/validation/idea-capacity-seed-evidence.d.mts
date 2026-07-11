export interface IdeaCapacitySeedManifest {
  schemaVersion: string;
  repository: string;
  proofScope: string;
  claimPosture: string;
  generatedAtUtc: string;
  commitSha: string;
  branch: string;
  runId: string;
  syntheticResource: boolean;
  conversionIntentId: string;
  downstreamSubmissionPath: string;
  productionCapacityCertified: boolean;
  supportedFeaturePromoted: boolean;
}

export interface IdeaCapacitySeedExpectedProvenance {
  commitSha: string;
  branch: string;
  runId: string;
}

export interface IdeaCapacitySeedEvidence {
  schemaVersion: "lotus-workbench.idea-capacity-seed-evidence.v1";
  posture: "accepted_non_certifying";
  manifestFileName: string;
  manifestSha256: string;
  repository: "lotus-idea";
  commitSha: string;
  branch: string;
  runId: string;
  proofScope: "synthetic_downstream_capacity_resource_seed";
  claimPosture: "seed_only_not_capacity_evidence";
  syntheticResource: true;
  capacityWorkloadAccepted: false;
  productionCapacityCertified: false;
  supportedFeaturePromoted: false;
  canonicalPortfolioUnaffected: true;
}

export function validateIdeaCapacitySeedManifest(
  payload: unknown,
  expected: IdeaCapacitySeedExpectedProvenance,
): asserts payload is IdeaCapacitySeedManifest;

export function buildIdeaCapacitySeedEvidence(input: {
  manifestBytes: Uint8Array;
  manifestFileName: string;
  payload: IdeaCapacitySeedManifest;
}): IdeaCapacitySeedEvidence;

export function validateAndWriteIdeaCapacitySeedEvidence(
  input: {
    manifestPath: string;
    evidencePath: string;
  } & IdeaCapacitySeedExpectedProvenance,
): Promise<IdeaCapacitySeedEvidence>;
