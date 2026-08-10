import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validateDependencyRiskInventory } from "../../scripts/quality/check-dependency-risk-inventory.mjs";

const root = join(__dirname, "..", "..");

function readJson(path: string) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function loadEvidence() {
  return {
    packageJson: readJson("package.json"),
    packageLock: readJson("package-lock.json"),
    inventory: readJson(
      "docs/architecture/workbench-dependency-risk-inventory.v1.json"
    ),
    schema: readJson(
      "docs/architecture/workbench-dependency-risk-inventory.v1.schema.json"
    ),
    today: "2026-08-10",
  };
}

function dependency(evidence: ReturnType<typeof loadEvidence>, name: string) {
  const match = evidence.inventory.dependencies.find(
    (candidate: { name?: string }) => candidate.name === name
  );
  if (!match) throw new Error(`Missing fixture dependency ${name}`);
  return match;
}

describe("direct production dependency risk inventory", () => {
  it("reconciles every manifest and lock dependency to current risk evidence", () => {
    expect(validateDependencyRiskInventory(loadEvidence())).toEqual([]);
  });

  it("rejects an unregistered direct production dependency", () => {
    const evidence = loadEvidence();
    evidence.packageJson.dependencies["fashionable-runtime"] = "1.0.0";
    evidence.packageLock.packages[""].dependencies["fashionable-runtime"] = "1.0.0";
    evidence.packageLock.packages["node_modules/fashionable-runtime"] = {
      version: "1.0.0",
    };

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "Direct production dependency fashionable-runtime is missing from the risk inventory"
        ),
      ])
    );
  });

  it("rejects an inventory dependency removed from the manifest", () => {
    const evidence = loadEvidence();
    delete evidence.packageJson.dependencies.zod;
    delete evidence.packageLock.packages[""].dependencies.zod;

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Risk inventory contains non-manifest dependency zod"),
      ])
    );
  });

  it("rejects manifest, lock-root, resolved-lock, and inventory version drift", () => {
    const evidence = loadEvidence();
    evidence.packageJson.dependencies.zod = "4.2.0";
    evidence.packageLock.packages[""].dependencies.zod = "4.1.13";
    evidence.packageLock.packages["node_modules/zod"].version = "4.1.14";

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Lockfile root version for zod"),
        expect.stringContaining("Resolved lockfile version for zod"),
        expect.stringContaining("Risk inventory version for zod"),
      ])
    );
  });

  it("rejects mutable or prerelease manifest and inventory versions", () => {
    const evidence = loadEvidence();
    evidence.packageJson.dependencies.zod = "^4.1.12";
    dependency(evidence, "zod").version = "4.2.0-rc.1";

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("dependencies[13].version must be an exact stable semantic version"),
        expect.stringContaining("zod must use an exact stable manifest version"),
      ])
    );
  });

  it("rejects an ambiguous or unapproved license", () => {
    const evidence = loadEvidence();
    evidence.inventory.allowedLicenses.push("UNKNOWN");
    dependency(evidence, "echarts").license.spdx = "UNKNOWN";
    dependency(evidence, "echarts").license.evidenceUrl = "registry metadata";

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("allowedLicenses must be exactly Apache-2.0, MIT"),
        expect.stringContaining('license.spdx "UNKNOWN" is not allowed'),
        expect.stringContaining("license.evidenceUrl must be an HTTPS evidence URL"),
      ])
    );
  });

  it("rejects lockfile license drift and non-versioned package evidence", () => {
    const evidence = loadEvidence();
    evidence.packageLock.packages["node_modules/zod"].license = "Apache-2.0";
    dependency(evidence, "zod").license.evidenceUrl =
      "https://www.npmjs.com/package/zod";

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Resolved lockfile license for zod must match"),
        expect.stringContaining(
          "License evidence for zod must identify the exact package and version"
        ),
      ])
    );
  });

  it("rejects unsupported lifecycle and expired reviews", () => {
    const evidence = loadEvidence();
    const zod = dependency(evidence, "zod");
    zod.lifecycle.releaseChannel = "preview";
    zod.lifecycle.maintenanceStatus = "end_of_life";
    zod.review.nextReviewBy = "2026-08-09";

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("lifecycle.releaseChannel must be stable"),
        expect.stringContaining("lifecycle.maintenanceStatus must be active"),
        expect.stringContaining("review expired on 2026-08-09"),
      ])
    );
  });

  it("rejects missing owner, rationale, containment, and replacement posture", () => {
    const evidence = loadEvidence();
    const zod = dependency(evidence, "zod");
    zod.review.owner = "";
    zod.maturity.rationale = "popular";
    zod.containmentBoundary = "";
    delete zod.replacementPosture.exitPath;

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("review.owner must match the inventory reviewOwner"),
        expect.stringContaining("maturity.rationale must contain at least 40"),
        expect.stringContaining("containmentBoundary must contain at least 12"),
        expect.stringContaining("replacementPosture is missing required fields: exitPath"),
      ])
    );
  });

  it("rejects a restricted entry without issue-backed owned approval and expiry", () => {
    const evidence = loadEvidence();
    const zod = dependency(evidence, "zod");
    zod.technologyState = "restricted_exception";
    zod.exception = {
      issue: "https://example.com/ticket/1",
      owner: "",
      approvalEvidence: "not-a-url",
      rollbackPath: "none",
      expiryDate: "2026-08-09",
      exitCriterion: "none",
    };

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("exception.issue must be a canonical Workbench GitHub issue URL"),
        expect.stringContaining("exception.owner must match the inventory reviewOwner"),
        expect.stringContaining("exception.approvalEvidence must be an HTTPS evidence URL"),
        expect.stringContaining("exception expired on 2026-08-09"),
      ])
    );
  });

  it("rejects prohibited dependencies even when other evidence is complete", () => {
    const evidence = loadEvidence();
    dependency(evidence, "zod").technologyState = "prohibited";

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("is prohibited and cannot be admitted"),
      ])
    );
  });

  it("rejects duplicate entries and unsupported fields", () => {
    const evidence = loadEvidence();
    evidence.inventory.dependencies.push(
      structuredClone(dependency(evidence, "zod"))
    );
    dependency(evidence, "react").marketingClaim = "best in class";

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Inventory contains duplicate dependency zod"),
        expect.stringContaining("has unsupported fields: marketingClaim"),
      ])
    );
  });

  it("rejects schema drift and mutable platform-policy provenance", () => {
    const evidence = loadEvidence();
    evidence.schema.properties.schemaVersion.const = "lotus-workbench.other.v1";
    evidence.inventory.platformPolicy.sourceRevision =
      "0000000000000000000000000000000000000000";
    evidence.inventory.platformPolicy.lifecycleStatus = "blocking";

    expect(validateDependencyRiskInventory(evidence)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("schemaVersion must match the executable JSON Schema"),
        expect.stringContaining(
          'sourceRevision must be "2868348d289fc685ecf5a218b6c73256ac3a7742"'
        ),
        expect.stringContaining('lifecycleStatus must be "report_only"'),
      ])
    );
  });
});
