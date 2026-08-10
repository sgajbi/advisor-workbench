import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const INVENTORY_PATH =
  "docs/architecture/workbench-dependency-risk-inventory.v1.json";
const SCHEMA_PATH =
  "docs/architecture/workbench-dependency-risk-inventory.v1.schema.json";

const TOP_LEVEL_KEYS = [
  "$schema",
  "admissionMode",
  "allowedLicenses",
  "dependencies",
  "governedByIssue",
  "inventoryId",
  "inventoryVersion",
  "nextReviewBy",
  "platformPolicy",
  "reviewedOn",
  "reviewOwner",
  "schemaVersion",
];
const PLATFORM_POLICY_KEYS = [
  "contractId",
  "contractVersion",
  "lifecycleStatus",
  "localAdoptionDecision",
  "sourcePath",
  "sourceRepository",
  "sourceRevision",
];
const DEPENDENCY_KEYS = [
  "architecturalRole",
  "containmentBoundary",
  "criticality",
  "exception",
  "license",
  "lifecycle",
  "maturity",
  "name",
  "ownershipBoundary",
  "purpose",
  "replacementPosture",
  "review",
  "stewardship",
  "technologyState",
  "version",
];
const REPLACEMENT_KEYS = ["exitPath", "strategy", "switchingCost"];
const LICENSE_KEYS = ["evidenceUrl", "spdx"];
const STEWARDSHIP_KEYS = ["repositoryUrl", "securityChannelUrl", "steward"];
const LIFECYCLE_KEYS = ["maintenanceStatus", "releaseChannel", "releaseEvidenceUrl"];
const MATURITY_KEYS = ["adoptionEvidenceUrls", "rationale"];
const REVIEW_KEYS = ["nextReviewBy", "owner", "reviewedOn"];
const EXCEPTION_KEYS = [
  "approvalEvidence",
  "exitCriterion",
  "expiryDate",
  "issue",
  "owner",
  "rollbackPath",
];

const TECHNOLOGY_STATES = new Set([
  "approved_default",
  "restricted_exception",
  "prohibited",
]);
const ARCHITECTURAL_ROLES = new Set([
  "framework_core",
  "design_system",
  "server_state",
  "data_grid_adapter",
  "chart_adapter",
  "form_adapter",
  "contract_validation",
]);
const CRITICALITIES = new Set(["critical", "high", "moderate"]);
const REPLACEMENT_STRATEGIES = new Set([
  "retain_and_review",
  "adapter_contained",
  "framework_migration",
]);
const SWITCHING_COSTS = new Set(["high", "moderate", "low"]);
const APPROVED_LICENSES = new Set(["Apache-2.0", "MIT"]);
const EXACT_STABLE_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const INVENTORY_VERSION = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const GITHUB_ISSUE = /^https:\/\/github\.com\/sgajbi\/lotus-workbench\/issues\/[0-9]+$/;
const HTTPS_URL = /^https:\/\//;
const ISO_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function pushExactKeyFailures(failures, value, expectedKeys, path) {
  if (!isRecord(value)) {
    failures.push(`${path} must be an object.`);
    return false;
  }
  const actual = sorted(Object.keys(value));
  const expected = sorted(expectedKeys);
  const missing = expected.filter((key) => !actual.includes(key));
  const extra = actual.filter((key) => !expected.includes(key));
  if (missing.length > 0) {
    failures.push(`${path} is missing required fields: ${missing.join(", ")}.`);
  }
  if (extra.length > 0) {
    failures.push(`${path} has unsupported fields: ${extra.join(", ")}.`);
  }
  return missing.length === 0;
}

function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function requireText(failures, value, path, minimumLength = 12) {
  if (typeof value !== "string" || value.trim().length < minimumLength) {
    failures.push(`${path} must contain at least ${minimumLength} meaningful characters.`);
  }
}

function requireHttps(failures, value, path) {
  if (typeof value !== "string" || !HTTPS_URL.test(value)) {
    failures.push(`${path} must be an HTTPS evidence URL.`);
  }
}

function requireReviewDates(failures, review, path, today) {
  if (!isIsoDate(review.reviewedOn)) {
    failures.push(`${path}.reviewedOn must be a real ISO YYYY-MM-DD date.`);
  } else if (review.reviewedOn > today) {
    failures.push(`${path}.reviewedOn cannot be in the future (${review.reviewedOn}).`);
  }
  if (!isIsoDate(review.nextReviewBy)) {
    failures.push(`${path}.nextReviewBy must be a real ISO YYYY-MM-DD date.`);
  } else if (review.nextReviewBy < today) {
    failures.push(`${path} review expired on ${review.nextReviewBy}.`);
  }
  if (
    isIsoDate(review.reviewedOn) &&
    isIsoDate(review.nextReviewBy) &&
    review.reviewedOn > review.nextReviewBy
  ) {
    failures.push(`${path}.reviewedOn must not be later than nextReviewBy.`);
  }
}

function validatePlatformPolicy(failures, policy) {
  if (!pushExactKeyFailures(failures, policy, PLATFORM_POLICY_KEYS, "platformPolicy")) return;
  const expected = {
    contractId: "lotus-platform-technology-governance-policy",
    contractVersion: "1.0.0",
    lifecycleStatus: "report_only",
    localAdoptionDecision: "blocking_direct_production_dependency_admission",
    sourcePath:
      "platform-contracts/technology-governance/lotus-technology-governance-policy.v1.json",
    sourceRepository: "https://github.com/sgajbi/lotus-platform",
    sourceRevision: "2868348d289fc685ecf5a218b6c73256ac3a7742",
  };
  for (const [field, value] of Object.entries(expected)) {
    if (policy[field] !== value) {
      failures.push(`platformPolicy.${field} must be ${JSON.stringify(value)}.`);
    }
  }
}

function validateException(failures, dependency, path, reviewOwner, today) {
  if (dependency.technologyState === "approved_default") {
    if (dependency.exception !== null) {
      failures.push(`${path}.exception must be null for approved_default technology.`);
    }
    return;
  }
  if (dependency.technologyState === "prohibited") {
    failures.push(`${path} is prohibited and cannot be admitted as a production dependency.`);
    return;
  }
  if (!pushExactKeyFailures(failures, dependency.exception, EXCEPTION_KEYS, `${path}.exception`)) {
    return;
  }
  if (!GITHUB_ISSUE.test(dependency.exception.issue ?? "")) {
    failures.push(`${path}.exception.issue must be a canonical Workbench GitHub issue URL.`);
  }
  if (dependency.exception.owner !== reviewOwner) {
    failures.push(`${path}.exception.owner must match the inventory reviewOwner.`);
  }
  requireHttps(
    failures,
    dependency.exception.approvalEvidence,
    `${path}.exception.approvalEvidence`
  );
  requireText(failures, dependency.exception.rollbackPath, `${path}.exception.rollbackPath`);
  requireText(failures, dependency.exception.exitCriterion, `${path}.exception.exitCriterion`);
  if (!isIsoDate(dependency.exception.expiryDate)) {
    failures.push(`${path}.exception.expiryDate must be a real ISO YYYY-MM-DD date.`);
  } else if (dependency.exception.expiryDate < today) {
    failures.push(`${path}.exception expired on ${dependency.exception.expiryDate}.`);
  }
}

function validateDependency(failures, dependency, index, reviewOwner, today) {
  const path = `dependencies[${index}]`;
  if (!pushExactKeyFailures(failures, dependency, DEPENDENCY_KEYS, path)) return;
  requireText(failures, dependency.name, `${path}.name`, 1);
  if (!EXACT_STABLE_VERSION.test(dependency.version ?? "")) {
    failures.push(`${path}.version must be an exact stable semantic version.`);
  }
  if (!TECHNOLOGY_STATES.has(dependency.technologyState)) {
    failures.push(`${path}.technologyState is not governed.`);
  }
  requireText(failures, dependency.purpose, `${path}.purpose`);
  requireText(failures, dependency.ownershipBoundary, `${path}.ownershipBoundary`);
  requireText(failures, dependency.containmentBoundary, `${path}.containmentBoundary`);
  if (!ARCHITECTURAL_ROLES.has(dependency.architecturalRole)) {
    failures.push(`${path}.architecturalRole is not governed.`);
  }
  if (!CRITICALITIES.has(dependency.criticality)) {
    failures.push(`${path}.criticality is not governed.`);
  }

  if (pushExactKeyFailures(failures, dependency.replacementPosture, REPLACEMENT_KEYS, `${path}.replacementPosture`)) {
    if (!REPLACEMENT_STRATEGIES.has(dependency.replacementPosture.strategy)) {
      failures.push(`${path}.replacementPosture.strategy is not governed.`);
    }
    requireText(failures, dependency.replacementPosture.exitPath, `${path}.replacementPosture.exitPath`);
    if (!SWITCHING_COSTS.has(dependency.replacementPosture.switchingCost)) {
      failures.push(`${path}.replacementPosture.switchingCost is not governed.`);
    }
  }

  if (pushExactKeyFailures(failures, dependency.license, LICENSE_KEYS, `${path}.license`)) {
    if (!APPROVED_LICENSES.has(dependency.license.spdx)) {
      failures.push(`${path}.license.spdx ${JSON.stringify(dependency.license.spdx)} is not allowed.`);
    }
    requireHttps(failures, dependency.license.evidenceUrl, `${path}.license.evidenceUrl`);
  }

  if (pushExactKeyFailures(failures, dependency.stewardship, STEWARDSHIP_KEYS, `${path}.stewardship`)) {
    requireText(failures, dependency.stewardship.steward, `${path}.stewardship.steward`, 2);
    requireHttps(failures, dependency.stewardship.repositoryUrl, `${path}.stewardship.repositoryUrl`);
    requireHttps(
      failures,
      dependency.stewardship.securityChannelUrl,
      `${path}.stewardship.securityChannelUrl`
    );
  }

  if (pushExactKeyFailures(failures, dependency.lifecycle, LIFECYCLE_KEYS, `${path}.lifecycle`)) {
    if (dependency.lifecycle.releaseChannel !== "stable") {
      failures.push(`${path}.lifecycle.releaseChannel must be stable.`);
    }
    if (dependency.lifecycle.maintenanceStatus !== "active") {
      failures.push(`${path}.lifecycle.maintenanceStatus must be active.`);
    }
    requireHttps(failures, dependency.lifecycle.releaseEvidenceUrl, `${path}.lifecycle.releaseEvidenceUrl`);
  }

  if (pushExactKeyFailures(failures, dependency.maturity, MATURITY_KEYS, `${path}.maturity`)) {
    requireText(failures, dependency.maturity.rationale, `${path}.maturity.rationale`, 40);
    if (!Array.isArray(dependency.maturity.adoptionEvidenceUrls) || dependency.maturity.adoptionEvidenceUrls.length === 0) {
      failures.push(`${path}.maturity.adoptionEvidenceUrls must contain primary adoption evidence.`);
    } else {
      const evidenceUrls = new Set();
      dependency.maturity.adoptionEvidenceUrls.forEach((url, evidenceIndex) => {
        requireHttps(failures, url, `${path}.maturity.adoptionEvidenceUrls[${evidenceIndex}]`);
        evidenceUrls.add(url);
      });
      if (evidenceUrls.size !== dependency.maturity.adoptionEvidenceUrls.length) {
        failures.push(`${path}.maturity.adoptionEvidenceUrls must be unique.`);
      }
    }
  }

  if (pushExactKeyFailures(failures, dependency.review, REVIEW_KEYS, `${path}.review`)) {
    if (dependency.review.owner !== reviewOwner) {
      failures.push(`${path}.review.owner must match the inventory reviewOwner.`);
    }
    requireReviewDates(failures, dependency.review, `${path}.review`, today);
  }

  validateException(failures, dependency, path, reviewOwner, today);
}

export function validateDependencyRiskInventory({
  packageJson,
  packageLock,
  inventory,
  schema,
  today = new Date().toISOString().slice(0, 10),
}) {
  const failures = [];
  if (!pushExactKeyFailures(failures, inventory, TOP_LEVEL_KEYS, "inventory")) return failures;

  if (inventory.$schema !== "./workbench-dependency-risk-inventory.v1.schema.json") {
    failures.push("Inventory must reference the canonical local JSON Schema.");
  }
  if (inventory.schemaVersion !== "lotus-workbench.dependency-risk-inventory.v1") {
    failures.push("Inventory schemaVersion is not supported.");
  }
  if (inventory.inventoryId !== "lotus-workbench-direct-production-dependencies") {
    failures.push("Inventory inventoryId is not canonical.");
  }
  if (!INVENTORY_VERSION.test(inventory.inventoryVersion ?? "")) {
    failures.push("Inventory inventoryVersion must be semantic versioning.");
  }
  if (inventory.governedByIssue !== "https://github.com/sgajbi/lotus-workbench/issues/618") {
    failures.push("Inventory governedByIssue must reference Workbench issue #618.");
  }
  if (inventory.admissionMode !== "blocking") {
    failures.push("Inventory admissionMode must be blocking.");
  }
  requireText(failures, inventory.reviewOwner, "inventory.reviewOwner", 3);
  requireReviewDates(failures, inventory, "inventory", today);
  validatePlatformPolicy(failures, inventory.platformPolicy);

  if (!isRecord(schema) || schema.$id !== "https://lotus-workbench.local/docs/architecture/workbench-dependency-risk-inventory.v1.schema.json") {
    failures.push("Dependency risk inventory JSON Schema is missing or has the wrong canonical $id.");
  }
  if (schema?.properties?.schemaVersion?.const !== inventory.schemaVersion) {
    failures.push("Inventory schemaVersion must match the executable JSON Schema contract.");
  }

  const allowedLicenses = new Set();
  if (!Array.isArray(inventory.allowedLicenses) || inventory.allowedLicenses.length === 0) {
    failures.push("Inventory allowedLicenses must not be empty.");
  } else {
    for (const license of inventory.allowedLicenses) {
      if (typeof license !== "string" || license.trim() === "") {
        failures.push("Inventory allowedLicenses must contain SPDX expressions.");
      }
      allowedLicenses.add(license);
    }
    if (allowedLicenses.size !== inventory.allowedLicenses.length) {
      failures.push("Inventory allowedLicenses must be unique.");
    }
    const unsupportedLicenses = [...allowedLicenses].filter(
      (license) => !APPROVED_LICENSES.has(license)
    );
    const missingLicenses = [...APPROVED_LICENSES].filter(
      (license) => !allowedLicenses.has(license)
    );
    if (unsupportedLicenses.length > 0 || missingLicenses.length > 0) {
      failures.push(
        `Inventory allowedLicenses must be exactly ${sorted(APPROVED_LICENSES).join(", ")}.`
      );
    }
  }

  if (!isRecord(packageJson.dependencies)) {
    failures.push("package.json dependencies must be an object.");
    return failures;
  }
  const lockRoot = packageLock?.packages?.[""];
  if (!isRecord(lockRoot?.dependencies)) {
    failures.push("package-lock.json root dependencies must be an object.");
    return failures;
  }
  if (!Array.isArray(inventory.dependencies)) {
    failures.push("Inventory dependencies must be an array.");
    return failures;
  }

  const inventoryByName = new Map();
  inventory.dependencies.forEach((dependency, index) => {
    validateDependency(failures, dependency, index, inventory.reviewOwner, today);
    if (isRecord(dependency) && typeof dependency.name === "string") {
      if (inventoryByName.has(dependency.name)) {
        failures.push(`Inventory contains duplicate dependency ${dependency.name}.`);
      }
      inventoryByName.set(dependency.name, dependency);
    }
  });

  const manifestNames = sorted(Object.keys(packageJson.dependencies));
  const lockNames = sorted(Object.keys(lockRoot.dependencies));
  const inventoryNames = sorted(inventoryByName.keys());
  for (const name of manifestNames.filter((dependencyName) => !inventoryByName.has(dependencyName))) {
    failures.push(`Direct production dependency ${name} is missing from the risk inventory.`);
  }
  for (const name of inventoryNames.filter((dependencyName) => !manifestNames.includes(dependencyName))) {
    failures.push(`Risk inventory contains non-manifest dependency ${name}.`);
  }
  for (const name of manifestNames.filter((dependencyName) => !lockNames.includes(dependencyName))) {
    failures.push(`Direct production dependency ${name} is missing from the lockfile root.`);
  }
  for (const name of lockNames.filter((dependencyName) => !manifestNames.includes(dependencyName))) {
    failures.push(`Lockfile root contains non-manifest production dependency ${name}.`);
  }

  for (const name of manifestNames) {
    const manifestVersion = packageJson.dependencies[name];
    const lockVersion = lockRoot.dependencies[name];
    const resolvedPackage = packageLock?.packages?.[`node_modules/${name}`];
    const resolvedVersion = resolvedPackage?.version;
    const inventoryEntry = inventoryByName.get(name);
    const inventoryVersion = inventoryEntry?.version;
    if (!EXACT_STABLE_VERSION.test(manifestVersion ?? "")) {
      failures.push(`Direct production dependency ${name} must use an exact stable manifest version.`);
    }
    if (lockVersion !== manifestVersion) {
      failures.push(`Lockfile root version for ${name} must match package.json (${manifestVersion}).`);
    }
    if (resolvedVersion !== manifestVersion) {
      failures.push(`Resolved lockfile version for ${name} must match package.json (${manifestVersion}).`);
    }
    if (inventoryVersion !== manifestVersion) {
      failures.push(`Risk inventory version for ${name} must match package.json (${manifestVersion}).`);
    }
    if (resolvedPackage?.license !== inventoryEntry?.license?.spdx) {
      failures.push(
        `Resolved lockfile license for ${name} must match the risk inventory (${inventoryEntry?.license?.spdx ?? "missing"}).`
      );
    }
    const expectedLicenseEvidenceUrl = `https://www.npmjs.com/package/${name}/v/${manifestVersion}`;
    if (inventoryEntry?.license?.evidenceUrl !== expectedLicenseEvidenceUrl) {
      failures.push(
        `License evidence for ${name} must identify the exact package and version (${expectedLicenseEvidenceUrl}).`
      );
    }
  }

  return failures;
}

function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

export function collectDependencyRiskInventoryFailures(root = process.cwd()) {
  return validateDependencyRiskInventory({
    packageJson: readJson(root, "package.json"),
    packageLock: readJson(root, "package-lock.json"),
    inventory: readJson(root, INVENTORY_PATH),
    schema: readJson(root, SCHEMA_PATH),
  });
}

function main() {
  const failures = collectDependencyRiskInventoryFailures();
  if (failures.length > 0) {
    console.error("Dependency risk inventory validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log("Dependency risk inventory validation passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
