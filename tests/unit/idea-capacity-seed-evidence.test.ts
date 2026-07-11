import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildIdeaCapacitySeedEvidence,
  validateAndWriteIdeaCapacitySeedEvidence,
  validateIdeaCapacitySeedManifest,
} from "../../scripts/live/validation/idea-capacity-seed-evidence.mjs";

const manifest = {
  schemaVersion: "lotus-idea.downstream-capacity-seed.v1",
  repository: "lotus-idea",
  proofScope: "synthetic_downstream_capacity_resource_seed",
  claimPosture: "seed_only_not_capacity_evidence",
  generatedAtUtc: "2026-07-11T08:00:00Z",
  commitSha: "a".repeat(40),
  branch: "main",
  runId: "canonical-front-office-2026-04-10",
  syntheticResource: true,
  conversionIntentId: "capacity-conversion-0123456789abcdef",
  downstreamSubmissionPath:
    "/api/v1/conversion-intents/capacity-conversion-0123456789abcdef/downstream-submissions",
  productionCapacityCertified: false,
  supportedFeaturePromoted: false,
};

const expected = {
  commitSha: manifest.commitSha,
  branch: manifest.branch,
  runId: manifest.runId,
};

describe("Idea capacity seed evidence", () => {
  it("retains provenance and hash without copying resource identity", () => {
    validateIdeaCapacitySeedManifest(manifest, expected);
    const evidence = buildIdeaCapacitySeedEvidence({
      manifestBytes: Buffer.from(JSON.stringify(manifest)),
      manifestFileName: "idea-capacity-seed-manifest.json",
      payload: manifest,
    });

    expect(evidence).toMatchObject({
      posture: "accepted_non_certifying",
      commitSha: manifest.commitSha,
      branch: "main",
      syntheticResource: true,
      capacityWorkloadAccepted: false,
      productionCapacityCertified: false,
      supportedFeaturePromoted: false,
      canonicalPortfolioUnaffected: true,
    });
    expect(JSON.stringify(evidence)).not.toContain("conversionIntentId");
    expect(JSON.stringify(evidence)).not.toContain("downstreamSubmissionPath");
  });

  it.each([
    ["wrong commit", { commitSha: "b".repeat(40) }],
    ["certification inflation", { productionCapacityCertified: true }],
    ["feature inflation", { supportedFeaturePromoted: true }],
    ["canonical portfolio leakage", { runId: "PB_SG_GLOBAL_BAL_001" }],
    ["unapproved path", { downstreamSubmissionPath: "/api/v1/clients/1" }],
  ])("rejects %s", (_name, mutation) => {
    expect(() =>
      validateIdeaCapacitySeedManifest({ ...manifest, ...mutation }, expected),
    ).toThrow();
  });

  it("writes deterministic source-safe evidence atomically", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "idea-capacity-seed-"));
    const manifestPath = path.join(directory, "manifest.json");
    const evidencePath = path.join(directory, "evidence.json");
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");

    await validateAndWriteIdeaCapacitySeedEvidence({
      manifestPath,
      evidencePath,
      ...expected,
    });

    const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
    expect(evidence.manifestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.manifestFileName).toBe("manifest.json");
  });
});
