import {
  enforceSourceAuthorityContracts,
  validateSourceAuthorityContracts,
} from "../../scripts/quality/check-source-authority-contracts.mjs";
import { SOURCE_AUTHORITY_CONTRACTS } from "../../scripts/quality/source-authority-contracts.mjs";

type SourceAuthorityContract = (typeof SOURCE_AUTHORITY_CONTRACTS)[number];

function replaceContract(
  id: string,
  update: (contract: SourceAuthorityContract) => SourceAuthorityContract,
) {
  return SOURCE_AUTHORITY_CONTRACTS.map((contract) =>
    contract.id === id ? update(contract) : contract,
  );
}

describe("source-authority CI fitness function", () => {
  it("enrolls Risk and Advisor Book through executable source-to-render contracts", () => {
    expect(validateSourceAuthorityContracts()).toEqual([]);
    expect(enforceSourceAuthorityContracts()).toBe(2);
  });

  it("fails closed for empty or single-surface enrollment", () => {
    expect(validateSourceAuthorityContracts([])).toEqual([
      "Source-authority enrollment is empty; the control fails closed.",
    ]);
    expect(validateSourceAuthorityContracts([SOURCE_AUTHORITY_CONTRACTS[0]])).toContain(
      "Source-authority enrollment must cover at least two critical Gateway-backed surfaces.",
    );
  });

  it("rejects a plausible reassuring browser fallback", () => {
    const contracts = replaceContract("risk-mandate-comparison", (contract) => ({
      ...contract,
      target: {
        ...contract.target,
        reassuringRenderedState: contract.target.sourceState,
      },
    }));

    expect(validateSourceAuthorityContracts(contracts)).toContain(
      "risk-mandate-comparison: exact proof accepted reassuring fallback browser evidence.",
    );
  });

  it("rejects a source adapter that synthesises state instead of preserving Gateway truth", () => {
    const contracts = replaceContract("advisor-book-portfolios", (contract) => ({
      ...contract,
      buildExpectedRows(payload: unknown) {
        return contract.buildExpectedRows(payload).map((row) => ({ ...row, state: "ACTIVE" }));
      },
    }));

    expect(validateSourceAuthorityContracts(contracts)).toContain(
      "advisor-book-portfolios: target state ACTIVE does not match declared source state CLOSED.",
    );
  });

  it("rejects stale production wiring evidence with an actionable path", () => {
    const contracts = replaceContract("advisor-book-portfolios", (contract) => ({
      ...contract,
      implementationEvidence: [
        {
          path: "src/features/advisor-book/components/advisor-book-workspace.tsx",
          tokens: ["data-browser-invented-state"],
        },
      ],
    }));

    expect(validateSourceAuthorityContracts(contracts)).toContain(
      'advisor-book-portfolios: src/features/advisor-book/components/advisor-book-workspace.tsx does not prove "data-browser-invented-state".',
    );
  });

  it("rejects duplicate and malformed ownership declarations", () => {
    const duplicate = [...SOURCE_AUTHORITY_CONTRACTS, SOURCE_AUTHORITY_CONTRACTS[0]];
    const malformed = replaceContract("risk-mandate-comparison", (contract) => ({
      ...contract,
      sourceOwnership: { ...contract.sourceOwnership, state: "" },
    }));

    expect(validateSourceAuthorityContracts(duplicate)).toContain(
      "advisor-book-portfolios: duplicate source-authority enrollment.",
    );
    expect(validateSourceAuthorityContracts(malformed)).toContain(
      "risk-mandate-comparison: source identity/state ownership is incomplete.",
    );
  });

  it("remains reachable from every blocking static-analysis lane", () => {
    const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    const makefile = readFileSync(resolve("Makefile"), "utf8");
    const workflows = [
      ".github/workflows/feature-lane.yml",
      ".github/workflows/pr-merge-gate.yml",
      ".github/workflows/main-releasability.yml",
    ].map((path) => readFileSync(resolve(path), "utf8"));

    expect(packageJson.scripts["quality:source-authority"]).toBe(
      "node scripts/quality/check-source-authority-contracts.mjs",
    );
    expect(packageJson.scripts.lint).toContain("npm run quality:source-authority");
    expect(makefile).toMatch(/^lint:\r?\n\tnpm run lint$/mu);
    for (const workflow of workflows) {
      expect(workflow).toContain("run: make lint");
    }
  });
});
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
