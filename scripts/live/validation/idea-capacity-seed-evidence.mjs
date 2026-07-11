import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const EXPECTED = Object.freeze({
  schemaVersion: "lotus-idea.downstream-capacity-seed.v1",
  repository: "lotus-idea",
  proofScope: "synthetic_downstream_capacity_resource_seed",
  claimPosture: "seed_only_not_capacity_evidence",
  syntheticResource: true,
  productionCapacityCertified: false,
  supportedFeaturePromoted: false,
});

const DOWNSTREAM_PATH = /^\/api\/v1\/conversion-intents\/capacity-conversion-[a-f0-9]{16}\/downstream-submissions$/;

export function validateIdeaCapacitySeedManifest(
  payload,
  { commitSha, branch, runId },
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Idea capacity seed manifest must be a JSON object");
  }
  for (const [field, expected] of Object.entries(EXPECTED)) {
    if (payload[field] !== expected) {
      throw new Error(`Idea capacity seed manifest has invalid ${field}`);
    }
  }
  for (const [field, expected] of Object.entries({ commitSha, branch, runId })) {
    if (typeof expected !== "string" || expected.length === 0 || payload[field] !== expected) {
      throw new Error(`Idea capacity seed manifest does not match expected ${field}`);
    }
  }
  if (!DOWNSTREAM_PATH.test(payload.downstreamSubmissionPath)) {
    throw new Error("Idea capacity seed manifest has an invalid downstream path");
  }
  if (
    typeof payload.conversionIntentId !== "string" ||
    !payload.downstreamSubmissionPath.includes(`/${payload.conversionIntentId}/`)
  ) {
    throw new Error("Idea capacity seed manifest resource identity is inconsistent");
  }
  const serialized = JSON.stringify(payload);
  for (const forbidden of [
    "PB_SG_GLOBAL_BAL_001",
    "client-001",
    "tenant-private-bank-sg",
    "book-advisor-001",
  ]) {
    if (serialized.includes(forbidden)) {
      throw new Error("Idea capacity seed manifest contains canonical or client-scoped identity");
    }
  }
}

export function buildIdeaCapacitySeedEvidence({
  manifestBytes,
  manifestFileName,
  payload,
}) {
  return {
    schemaVersion: "lotus-workbench.idea-capacity-seed-evidence.v1",
    posture: "accepted_non_certifying",
    manifestFileName,
    manifestSha256: crypto.createHash("sha256").update(manifestBytes).digest("hex"),
    repository: payload.repository,
    commitSha: payload.commitSha,
    branch: payload.branch,
    runId: payload.runId,
    proofScope: payload.proofScope,
    claimPosture: payload.claimPosture,
    syntheticResource: true,
    capacityWorkloadAccepted: false,
    productionCapacityCertified: false,
    supportedFeaturePromoted: false,
    canonicalPortfolioUnaffected: true,
  };
}

export async function validateAndWriteIdeaCapacitySeedEvidence({
  manifestPath,
  evidencePath,
  commitSha,
  branch,
  runId,
}) {
  const manifestBytes = await fs.readFile(manifestPath);
  const payload = JSON.parse(manifestBytes.toString("utf8"));
  validateIdeaCapacitySeedManifest(payload, { commitSha, branch, runId });
  const evidence = buildIdeaCapacitySeedEvidence({
    manifestBytes,
    manifestFileName: path.basename(manifestPath),
    payload,
  });
  await fs.mkdir(path.dirname(evidencePath), { recursive: true });
  const temporaryPath = `${evidencePath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await fs.rename(temporaryPath, evidencePath);
  return evidence;
}
