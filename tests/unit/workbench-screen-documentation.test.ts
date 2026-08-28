import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// @ts-expect-error The documentation gate is a Node .mjs script without a TypeScript declaration.
import * as screenDocumentationModule from "../../scripts/quality/check-workbench-screen-documentation.mjs";

const {
  hasExactMarkdownHeading,
  isNextPageEntrypoint,
  validateModeAuthority,
  validateScreenDocumentation,
} = screenDocumentationModule;

const rootDirectory = process.cwd();
const registryPath = path.join(
  rootDirectory,
  "docs/documentation/workbench-screen-registry.v1.json",
);

function loadRegistry() {
  return JSON.parse(fs.readFileSync(registryPath, "utf8"));
}

function validate(registryData: ReturnType<typeof loadRegistry>) {
  return validateScreenDocumentation({ rootDirectory, registryData });
}

describe("Workbench screen documentation governance", () => {
  it("recognizes only complete Markdown heading lines outside code fences", () => {
    expect(
      hasExactMarkdownHeading("## Current Scope\n", "## Current Scope"),
    ).toBe(true);
    expect(
      hasExactMarkdownHeading("See ## Current Scope.\n", "## Current Scope"),
    ).toBe(false);
    expect(
      hasExactMarkdownHeading(
        "## Current Scope And Limits\n",
        "## Current Scope",
      ),
    ).toBe(false);
    expect(
      hasExactMarkdownHeading("    ## Current Scope\n", "## Current Scope"),
    ).toBe(false);
    expect(
      hasExactMarkdownHeading(
        "```md\n## Current Scope\n```\n",
        "## Current Scope",
      ),
    ).toBe(false);
    expect(
      hasExactMarkdownHeading(
        "````md\n```\n## Current Scope\n````\n",
        "## Current Scope",
      ),
    ).toBe(false);
    expect(
      hasExactMarkdownHeading(
        "~~~md\n~~~js\n## Current Scope\n~~~\n",
        "## Current Scope",
      ),
    ).toBe(false);
    expect(
      hasExactMarkdownHeading(
        "~~~md\nexample\n~~~   \n## Current Scope\n",
        "## Current Scope",
      ),
    ).toBe(true);
  });

  it("discovers every default Next.js page extension", () => {
    expect(
      ["page.tsx", "page.ts", "page.jsx", "page.js"].every((filename) =>
        isNextPageEntrypoint(filename),
      ),
    ).toBe(true);
    expect(isNextPageEntrypoint("layout.tsx")).toBe(false);
  });

  it("covers every route and records the governed guide backlog", () => {
    const result = validate(loadRegistry());

    expect(result.errors).toEqual([]);
    expect(result.summary).toEqual({
      routeEntrypoints: 21,
      activeSurfaces: 36,
      aliases: 2,
      mappedGuides: 36,
      coverageExceptions: 0,
      unmappedGuides: 0,
    });
  });

  it("keeps decision-worklist evidence references on committed paths", () => {
    const evidenceReferences = [
      {
        guide: "Advisory-Overview-Screen-Guide.md",
        directory:
          "docs/evidence/issue-811-decision-worklists/advisory-overview",
      },
      {
        guide: "Advisor-Book-Workflow.md",
        directory: "docs/evidence/issue-811-decision-worklists/advisor-book",
      },
    ];

    for (const reference of evidenceReferences) {
      const guide = fs
        .readFileSync(path.join(rootDirectory, "wiki", reference.guide), "utf8")
        .replaceAll("\\", "/");

      expect(guide).toContain(`\`${reference.directory}/\``);
      expect(fs.existsSync(path.join(rootDirectory, reference.directory))).toBe(
        true,
      );
    }
  });

  it("maps Proposal Builder to its ordered source-confirmed workflow guide", () => {
    const registry = loadRegistry();
    const proposalBuilder = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "proposal-builder",
    );

    expect(proposalBuilder).toMatchObject({
      routePattern: "/proposals/simulate",
      navigationPosture: "capability-disabled",
      wikiSlug: "Proposal-Builder-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-advise", "lotus-core"],
      runtimeEvidence: expect.arrayContaining([
        "tests/e2e/proposal-workflow-context.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs.readFileSync(
      path.join(rootDirectory, "wiki", "Proposal-Builder-Screen-Guide.md"),
      "utf8",
    );
    expect(guide).toContain("persistent **Review and retain** rail");
    expect(guide).toContain(
      "evaluation without a proposal identity is not described as retained",
    );
    expect(guide.replaceAll("\r\n", "\n")).toContain(
      "not a claim of bank approval or competitor\nsuperiority",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Approval Queue to its exception-led selected-record guide", () => {
    const registry = loadRegistry();
    const approvalQueue = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "approval-queue",
    );

    expect(approvalQueue).toMatchObject({
      routePattern: "/proposals",
      mode: "approval-queue",
      navigationPosture: "capability-disabled",
      wikiSlug: "Approval-Queue-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-advise"],
      implementationEvidence: expect.arrayContaining([
        "src/features/proposals/components/proposal-lifecycle-decision-workspace.tsx",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "tests/e2e/proposal-workflow-context.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs.readFileSync(
      path.join(rootDirectory, "wiki", "Approval-Queue-Screen-Guide.md"),
      "utf8",
    );
    expect(guide).toContain("one selected proposal");
    expect(guide).toContain("number shown is **in this view**");
    expect(guide).toContain(
      "Derives maker-checker posture from the complete selected evidence set",
    );
    expect(guide).toContain(
      "empty approval register as unconfirmed requirements",
    );
    expect(guide).toContain(
      "route context does not replace source proposal identity",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Suitability review to one policy-authoritative decision-desk guide", () => {
    const registry = loadRegistry();
    const suitabilityReview = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "suitability-review",
    );

    expect(suitabilityReview).toMatchObject({
      routePattern: "/proposals",
      mode: "suitability",
      navigationPosture: "capability-disabled",
      wikiSlug: "Suitability-Review-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-advise"],
      implementationEvidence: expect.arrayContaining([
        "src/features/proposals/components/policy-review-workspace.tsx",
        "src/features/proposals/proposal-policy-review-view-model.ts",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "tests/e2e/proposal-workflow-context.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Suitability-Review-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain(
      "generic proposal-list request is not made in this mode",
    );
    expect(guide).toContain(
      "Success is\n  announced only after every source returns",
    );
    expect(guide).toContain(
      "does not calculate whether a recommendation\nis suitable",
    );
    expect(guide).toContain("not a claim of competitor superiority");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Proposal Detail to its decision, evidence, action, and return-context guide", () => {
    const registry = loadRegistry();
    const proposalDetail = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "proposal-detail",
    );

    expect(proposalDetail).toMatchObject({
      routePattern: "/proposals/{proposalId}",
      navigationPosture: "capability-disabled",
      wikiSlug: "Proposal-Detail-Screen-Guide",
      sourceOwners: [
        "lotus-gateway",
        "lotus-advise",
        "lotus-report",
        "lotus-ai",
      ],
      implementationEvidence: expect.arrayContaining([
        "src/features/proposals/components/proposal-detail-view.tsx",
        "src/features/proposals/proposal-action-evidence.ts",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "tests/e2e/proposal-workflow-context.spec.ts",
        "tests/e2e/proposal-memo-posture.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Proposal-Detail-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain(
      "Gateway persistence and the owning source reads reconcile",
    );
    expect(guide).toContain(
      "routine/restricted/unavailable/not-found return context",
    );
    expect(guide).toContain("does not:\n\n- calculate suitability");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Risk and Impact to selected source-owned decision evidence", () => {
    const registry = loadRegistry();
    const riskAndImpact = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "risk-and-impact",
    );

    expect(riskAndImpact).toMatchObject({
      businessName: "Risk and Impact",
      routePattern: "/proposals",
      mode: "risk-impact",
      navigationPosture: "capability-disabled",
      wikiSlug: "Risk-And-Impact-Screen-Guide",
      sourceOwners: [
        "lotus-gateway",
        "lotus-advise",
        "lotus-core",
        "lotus-risk",
      ],
      implementationEvidence: expect.arrayContaining([
        "src/features/proposals/proposal-risk-impact-contract.ts",
        "src/features/proposals/components/proposal-risk-impact-workspace.tsx",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "tests/e2e/proposal-workflow-context.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Risk-And-Impact-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain(
      "never fans out risk-impact reads across the whole worklist",
    );
    expect(guide).toContain("selected proposal\n  version");
    expect(guide).toContain("empty array as zero blockers");
    expect(guide).toContain("correlation ID");
    expect(guide).toContain("allocation delta, mandate compliance");
    expect(guide).toContain(
      "Container-aware reflow responds to the actual centre workspace",
    );
    expect(guide).toContain(
      "not a claim of bank\napproval or competitor superiority",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Implementation Status to selected handoff evidence and explicit execution boundaries", () => {
    const registry = loadRegistry();
    const implementationStatus = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "implementation-status",
    );

    expect(implementationStatus).toMatchObject({
      businessName: "Implementation Status",
      routePattern: "/proposals",
      mode: "implementation",
      navigationPosture: "capability-disabled",
      wikiSlug: "Implementation-Status-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-advise"],
      implementationEvidence: expect.arrayContaining([
        "src/features/proposals/proposal-implementation-status-contract.ts",
        "src/features/proposals/proposal-implementation-status-view-model.ts",
        "src/features/proposals/components/proposal-implementation-status-workspace.tsx",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "tests/e2e/proposal-workflow-context.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(
          rootDirectory,
          "wiki",
          "Implementation-Status-Screen-Guide.md",
        ),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("one selected proposal");
    expect(guide).toContain("never fans out across the worklist");
    expect(guide).toContain(
      "`order_fill_settlement_detail` is explicitly `not_supported`",
    );
    expect(guide).toContain("does not prove fill completeness, settlement");
    expect(guide).toContain(
      "not a claim of bank approval or competitor\nsuperiority",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Discussion pack review to independent meeting and release controls", () => {
    const registry = loadRegistry();
    const discussionPack = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "discussion-pack-review",
    );

    expect(discussionPack).toMatchObject({
      businessName: "Discussion pack review",
      routePattern: "/proposals",
      mode: "discussion-pack",
      navigationPosture: "capability-disabled",
      wikiSlug: "Discussion-Pack-Review-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-advise", "lotus-report"],
      implementationEvidence: expect.arrayContaining([
        "src/copy/proposal-discussion-pack-copy.ts",
        "src/features/proposals/proposal-discussion-pack-contract.ts",
        "src/features/proposals/components/proposal-discussion-pack-workspace.tsx",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "tests/e2e/proposal-workflow-context.spec.ts",
        "docs/evidence/issue-798-product-copy/discussion-pack-review/README.md",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(
          rootDirectory,
          "wiki",
          "Discussion-Pack-Review-Screen-Guide.md",
        ),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("five independent controls");
    expect(guide).toContain(
      "never fans out discussion-pack reads across the\nworklist",
    );
    expect(guide).toContain("AI-assisted draft");
    expect(guide).toContain("Client meeting preparation");
    expect(guide).toContain("Client-discussion checklist");
    expect(guide).toContain("Current version available");
    expect(guide).toContain(
      "There is no publish, release, deliver, contact-client",
    );
    expect(guide).toContain(
      "not a claim of bank\napproval or competitor superiority",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Data Product Catalogue to independent source and recovery evidence", () => {
    const registry = loadRegistry();
    const dataProductCatalogue = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "data-product-discovery",
    );

    expect(dataProductCatalogue).toMatchObject({
      businessName: "Data Product Catalogue",
      routePattern: "/data-products",
      wikiSlug: "Data-Product-Catalogue-Screen-Guide",
      sourceOwners: [
        "lotus-gateway",
        "lotus-platform",
        "Lotus domain services",
      ],
      runtimeEvidence: ["tests/e2e/data-product-catalogue.spec.ts"],
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(
          rootDirectory,
          "wiki",
          "Data-Product-Catalogue-Screen-Guide.md",
        ),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("three independent Gateway reads");
    expect(guide).toContain(
      "optional-source failure never erases product identity",
    );
    expect(guide).toContain("no certified total is invented");
    expect(guide).toContain("stable keyboard focus");
    expect(guide).toContain(
      "not a claim of bank approval or competitor\nsuperiority",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Positions to one complete source-backed business guide", () => {
    const registry = loadRegistry();
    const positions = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "positions",
    );

    expect(positions).toMatchObject({
      routePattern: "/positions",
      wikiSlug: "Positions-Screen-Guide",
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Positions-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain(
      "only an explicit source `CURRENT` state is shown as **Current**",
    );
    expect(guide).toContain("an absent state becomes **Not reported**");
    expect(guide).toContain(
      "unknown non-empty states fail closed to **Review required**",
    );
    expect(guide).toContain("source-returned cash balances");
    expect(guide).toContain(
      "this guide is not a\nclaim of bank approval or competitor superiority",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Portfolio Allocation to one source-recoverable business guide", () => {
    const registry = loadRegistry();
    const allocation = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "portfolio-allocation",
    );

    expect(allocation).toMatchObject({
      routePattern: "/allocation",
      wikiSlug: "Portfolio-Allocation-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-core"],
      runtimeEvidence: ["tests/e2e/portfolio-workbench.smoke.spec.ts"],
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(
          rootDirectory,
          "wiki",
          "Portfolio-Allocation-Screen-Guide.md",
        ),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("Retains valid direct allocation");
    expect(guide).toContain("preserves\n  keyboard focus");
    expect(guide).toContain("does not:\n\n- calculate or infer target weights");
    expect(guide).toContain("not readiness certification");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Advisory Overview to one source-recoverable business guide", () => {
    const registry = loadRegistry();
    const advisoryOverview = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "advisory-overview",
    );

    expect(advisoryOverview).toMatchObject({
      routePattern: "/recommendations",
      mode: "overview",
      navigationPosture: "capability-disabled",
      wikiSlug: "Advisory-Overview-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-advise"],
      runtimeEvidence: [
        "tests/e2e/advisory-overview-worklist.spec.ts",
        "scripts/live/validation/browser-workflows.mjs",
      ],
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Advisory-Overview-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain(
      "Retains earlier proposals after a background refresh failure",
    );
    expect(guide).toContain("preserves keyboard focus");
    expect(guide).toContain(
      "the global Advisory app entry remains capability-disabled",
    );
    expect(guide).toContain(
      "not\n  production readiness, independent certification, bank approval, or competitor-superiority proof",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Advisor Cockpit to one action-specific operating guide", () => {
    const registry = loadRegistry();
    const advisorCockpit = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "advisor-cockpit",
    );

    expect(advisorCockpit).toMatchObject({
      routePattern: "/recommendations",
      mode: "cockpit",
      navigationPosture: "capability-disabled",
      wikiSlug: "Advisor-Cockpit-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-advise"],
      runtimeEvidence: [
        "tests/e2e/advisor-cockpit-business-readiness.spec.ts",
        "scripts/live/validation/browser-workflows.mjs",
      ],
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Advisor-Cockpit-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain(
      "Uses the shared decision-first worklist: compact action rows identify priority",
    );
    expect(guide).toContain(
      "proves one worklist and associated\n  selected-decision region",
    );
    expect(advisorCockpit?.implementationEvidence).toEqual(
      expect.arrayContaining([
        "src/design-system/components/workbench-worklist.tsx",
        "tests/unit/workbench-worklist.test.tsx",
      ]),
    );
    expect(guide).toContain(
      "Scopes pending, confirmed, partial, and failed acknowledgement",
    );
    expect(guide).toContain("compact inline evidence band");
    expect(guide).toContain(
      "Shows **Open proposal** only when the action carries a valid proposal identity",
    );
    expect(guide).toContain(
      "manufacture navigation for source-reference types",
    );
    expect(guide).toContain("does not:\n\n- evaluate policy");
    expect(guide).toContain("does not copy another product's layout");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Transactions to one complete applicability-aware business guide", () => {
    const registry = loadRegistry();
    const transactions = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "transactions",
    );

    expect(transactions).toMatchObject({
      routePattern: "/transactions",
      wikiSlug: "Transactions-Screen-Guide",
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Transactions-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain(
      "absent status\n  on an FX cash-settlement component is **Not reported**",
    );
    expect(guide).toContain(
      "other absent lifecycle status is\n  **Not applicable**",
    );
    expect(guide).toContain("does not:\n\n- infer settlement success");
    expect(guide).toContain(
      "raw-code blotter, card mosaic, browser-inferred success state",
    );
    expect(guide).toContain(
      "not a\nclaim of bank approval or competitor superiority",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Income And Activity to one complete booked-record business guide", () => {
    const registry = loadRegistry();
    const incomeAndActivity = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "income-and-activity",
    );

    expect(incomeAndActivity).toMatchObject({
      routePattern: "/income",
      wikiSlug: "Income-And-Activity-Screen-Guide",
      runtimeEvidence: ["tests/e2e/portfolio-workbench.smoke.spec.ts"],
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Income-And-Activity-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("unknown buckets visible as **Excluded from net**");
    expect(guide).toContain("does not:\n\n- forecast dividends");
    expect(guide).toContain(
      "not a claim of bank approval or competitor superiority",
    );
    expect(guide).toContain("complete named sequential keyboard\n  focus");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Projected cash flow to one horizon-safe business guide", () => {
    const registry = loadRegistry();
    const projectedCashMovement = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "projected-cash-movement",
    );

    expect(projectedCashMovement).toMatchObject({
      routePattern: "/cashflow",
      wikiSlug: "Projected-Cash-Movement-Screen-Guide",
      runtimeEvidence: ["tests/e2e/portfolio-workbench.smoke.spec.ts"],
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(
          rootDirectory,
          "wiki",
          "Projected-Cash-Movement-Screen-Guide.md",
        ),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("current booked cash remains a separate fact");
    expect(guide).toContain(
      "bars for dated net movement from the cumulative movement line",
    );
    expect(guide).toContain("does not:\n\n- calculate opening cash");
    expect(guide).toContain(
      "not a claim of bank approval or\ncompetitor superiority",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Portfolio Intake to one review-controlled source-backed business guide", () => {
    const registry = loadRegistry();
    const portfolioIntake = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "portfolio-intake",
    );

    expect(portfolioIntake).toMatchObject({
      routePattern: "/intake",
      wikiSlug: "Portfolio-Intake-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-core"],
      runtimeEvidence: [
        "tests/e2e/intake-first-action-readiness.spec.ts",
        "tests/e2e/intake-publication-lock.spec.ts",
        "tests/e2e/intake-record-preview.spec.ts",
      ],
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Portfolio-Intake-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain(
      "first advisor action is\naccepted without a second click",
    );
    expect(guide).toContain("six independent business tasks");
    expect(guide).toContain("same reviewed\n   intent or return to editing");
    expect(guide).toContain("does not:\n\n- activate or approve a portfolio");
    expect(guide).toContain("does not copy another\nproduct's visual identity");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Performance Summary to one source-confirmed analytical guide", () => {
    const registry = loadRegistry();
    const performanceSummary = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "performance-summary",
    );

    expect(performanceSummary).toMatchObject({
      routePattern: "/performance",
      mode: "summary",
      wikiSlug: "Performance-Summary-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-core", "lotus-performance"],
      runtimeEvidence: expect.arrayContaining([
        "tests/e2e/performance-workbench.smoke.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Performance-Summary-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("one atomic decision-context transaction");
    expect(guide).toContain("never substitutes\n  the canonical demo portfolio");
    expect(guide).toContain("browser-history `push`");
    expect(guide).toContain("synchronizes Back and Forward into the mounted client");
    expect(guide).toContain("3Y returns to YTD and forward to 3Y");
    expect(guide).toContain("failed refresh never converts prior analytics");
    expect(guide).toContain(
      "composing Core portfolio/reference/benchmark context",
    );
    expect(guide).toContain("does not:\n\n- calculate time-weighted");
    expect(guide).toContain("not a claim of competitor\nsuperiority");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Manage Overview to one exception-led source-truthful guide", () => {
    const registry = loadRegistry();
    const manageOverview = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "manage-overview",
    );

    expect(manageOverview).toMatchObject({
      routePattern: "/workbench/{portfolioId}",
      mode: "overview",
      wikiSlug: "Manage-Overview-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-core", "lotus-manage"],
      implementationEvidence: expect.arrayContaining([
        "src/features/workbench/manage-overview-model.ts",
        "src/features/workbench/components/manage-overview.tsx",
        "src/design-system/components/workbench-worklist.tsx",
        "tests/unit/workbench-worklist.test.tsx",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "tests/e2e/manage-overview-workspace.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Manage-Overview-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("operates as a work checkpoint rather than a feature catalogue");
    expect(guide).toContain(
      "governed\n  unavailable values such as `UNKNOWN` or `NOT_AVAILABLE` are **Not reported**",
    );
    expect(guide).toContain(
      "only when both carry the same source wave identity; row evidence remains authoritative",
    );
    expect(guide).toContain(
      "These entries hand off only to Mandate\n  Health or Rebalance Waves",
    );
    expect(guide).toContain(
      "other Manage work areas remain available through Manage\n  navigation and are not presented as decision-worklist records",
    );
    expect(guide).toContain("Uses the shared decision-first worklist");
    expect(guide).toContain("does not:\n\n- calculate portfolio value");
    expect(guide).toContain("not a claim of competitor superiority");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Mandate Health to one source-window-truthful exception guide", () => {
    const registry = loadRegistry();
    const mandateHealth = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "mandate-health",
    );

    expect(mandateHealth).toMatchObject({
      routePattern: "/workbench/{portfolioId}",
      mode: "mandate",
      wikiSlug: "Mandate-Health-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-core", "lotus-manage"],
      implementationEvidence: expect.arrayContaining([
        "src/features/workbench/use-manage-exception-source-window.ts",
        "src/features/workbench/components/manage-mandate-health.tsx",
        "src/design-system/hooks/use-source-window.ts",
        "tests/unit/manage-workspace-components.test.tsx",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "tests/e2e/manage-mandate-health-workspace.spec.ts",
        "scripts/live/validation/browser-workflows.mjs",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Mandate-Health-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("**shown in this view**, not as a total");
    expect(guide).toContain(
      "Rows without a\n  source-owned exception identity are rejected and reported as partial evidence",
    );
    expect(guide).toContain(
      "every returned row has a source-owned exception identity",
    );
    expect(guide).toContain("last confirmed source view during continuation loading or failure");
    expect(guide).toContain(
      "`SOURCE_READINESS` is presented as **Data availability**",
    );
    expect(guide).toContain(
      "**Review readiness**\nremains a separate health dimension",
    );
    expect(guide).not.toContain("data readiness, benchmark alignment");
    expect(guide).toContain("does not:\n\n- calculate mandate health");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Rebalance Waves to one decision-first source-context guide", () => {
    const registry = loadRegistry();
    const rebalanceWaves = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "rebalance-waves",
    );

    expect(rebalanceWaves).toMatchObject({
      routePattern: "/workbench/{portfolioId}",
      mode: "waves",
      wikiSlug: "Rebalance-Waves-Screen-Guide",
      sourceOwners: [
        "lotus-gateway",
        "lotus-core",
        "lotus-manage",
        "lotus-report",
        "lotus-ai",
      ],
      implementationEvidence: expect.arrayContaining([
        "src/features/workbench/dpm-wave-command-center-panel-helpers.ts",
        "src/features/workbench/components/dpm-wave-command-center-panel.tsx",
        "src/features/workbench/use-dpm-wave-command-center-actions.ts",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "scripts/live/validation/browser-workflows.mjs",
        "tests/e2e/manage-rebalance-workspace.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Rebalance-Waves-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("source-reported mandate type, portfolio currency, and as-of date");
    expect(guide).toContain("Evidence not opened or not requested");
    expect(guide).toContain(
      "`ATTENTION` as **Needs attention** while preserving the\n  source enum",
    );
    expect(guide).toContain(
      "submits the unchanged source enum",
    );
    expect(guide.replaceAll(/\s+/g, " ")).toContain(
      "selected rebalance decision and proposed changes in document order",
    );
    expect(guide).toContain("does not:\n\n- calculate proposed trades");
    expect(guide).toContain("not a claim of competitor superiority");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Outcome reviews to one comparison-truthful evidence guide", () => {
    const registry = loadRegistry();
    const outcomeReviews = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "outcome-reviews",
    );

    expect(outcomeReviews).toMatchObject({
      businessName: "Outcome reviews",
      routePattern: "/workbench/{portfolioId}",
      mode: "reviews",
      wikiSlug: "Outcome-Reviews-Screen-Guide",
      sourceOwners: [
        "lotus-gateway",
        "lotus-manage",
        "lotus-report",
        "lotus-ai",
      ],
      implementationEvidence: expect.arrayContaining([
        "src/features/workbench/outcome-review-view-model.ts",
        "src/features/workbench/components/outcome-review-panel.tsx",
        "src/features/workbench/use-outcome-review-handoffs.ts",
      ]),
      runtimeEvidence: [
        "tests/integration/workbench-page.test.tsx",
        "tests/e2e/manage-outcome-reviews-workspace.spec.ts",
      ],
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Outcome-Reviews-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("compare Manage-recorded expected and realised outcomes");
    expect(guide).toContain(
      "**Within expected tolerance** is a comparison outcome, not a statement",
    );
    expect(guide).toContain("presents the first source-ranked review");
    expect(guide).toContain("AI-assisted result remains internal and review-gated");
    expect(guide).toContain("docs/evidence/issue-799-product-vocabulary/outcome-reviews/");
    expect(guide).toContain("does not:\n\n- calculate expected or realised outcomes");
    expect(guide).toContain("not a claim of competitor\nsuperiority");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Performance Analysis to one evidence-cardinality-safe business guide", () => {
    const registry = loadRegistry();
    const performanceAnalysis = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "performance-analysis",
    );

    expect(performanceAnalysis).toMatchObject({
      routePattern: "/performance",
      mode: "analysis",
      wikiSlug: "Performance-Analysis-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-performance"],
      implementationEvidence: expect.arrayContaining([
        "src/apps/performance/components/performance-source-selection-controls.tsx",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "scripts/live/validation/browser-workflows.mjs",
        "tests/e2e/performance-workbench.smoke.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(
          rootDirectory,
          "wiki",
          "Performance-Analysis-Screen-Guide.md",
        ),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("one published observation");
    expect(guide).toContain(
      "does not imply that the independent history request succeeded",
    );
    expect(guide).toContain("convert a failed request into zero rows");
    expect(guide).toContain(
      "native pending disablement and post-request focus restoration",
    );
    expect(guide).toContain(
      "same reusable selection component and request-shaping path",
    );
    expect(guide).toContain("44px narrow touch targets");
    expect(guide).toContain("does not\ncopy another product's layout");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Risk Review to one source- and policy-bounded business guide", () => {
    const registry = loadRegistry();
    const riskReview = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "risk-review",
    );

    expect(riskReview).toMatchObject({
      routePattern: "/performance",
      mode: "risk",
      wikiSlug: "Risk-Review-Screen-Guide",
      sourceOwners: [
        "lotus-gateway",
        "lotus-core",
        "lotus-performance",
        "lotus-risk",
        "lotus-manage",
      ],
      implementationEvidence: expect.arrayContaining([
        "src/apps/performance/components/performance-risk-mode.tsx",
        "src/apps/performance/risk-workspace-view-model.ts",
        "src/apps/performance/risk-mandate-comparison-view-model.ts",
        "src/apps/performance/components/risk/risk-mandate-comparison.tsx",
        "tests/unit/risk-mandate-comparison.test.tsx",
        "tests/e2e/performance-workbench.smoke.spec.ts",
      ]),
      runtimeEvidence: ["scripts/live/validation/browser-workflows.mjs"],
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Risk-Review-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("Compare source measures with\napproved mandate constraints");
    expect(guide).toContain("Gateway-owned `mandate_comparison`");
    expect(guide).toContain("Workbench does not calculate a missing limit or headroom");
    expect(guide).toContain("does not:\n\n- classify risk as contained");
    expect(guide).toContain(
      "not a claim of\nbank approval or competitor superiority",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Performance Evidence to one fail-closed calculation-assurance guide", () => {
    const registry = loadRegistry();
    const performanceEvidence = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "performance-evidence",
    );

    expect(performanceEvidence).toMatchObject({
      routePattern: "/performance",
      mode: "evidence",
      wikiSlug: "Performance-Evidence-Screen-Guide",
      sourceOwners: ["lotus-gateway", "lotus-performance"],
      implementationEvidence: expect.arrayContaining([
        "src/apps/performance/evidence/performance-evidence-assurance-view-model.ts",
        "src/apps/performance/evidence/performance-evidence-assurance-workspace.tsx",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "scripts/live/validation/browser-workflows.mjs",
        "tests/e2e/performance-workbench.smoke.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(
          rootDirectory,
          "wiki",
          "Performance-Evidence-Screen-Guide.md",
        ),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("exception-first workspace");
    expect(guide).toContain("**Needs attention**");
    expect(guide).not.toContain("**Attention required**");
    expect(guide).toContain("Missing or unfamiliar states fail closed");
    expect(guide).toContain("has no screen-local retry action");
    expect(guide).toContain("does not:\n\n- calculate or recalculate");
    expect(guide).toContain("not a claim of\ncompetitor superiority");
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Performance Advisor Brief to one source-recorded internal-review guide", () => {
    const registry = loadRegistry();
    const advisorBrief = registry.surfaces.find(
      (candidate: { id: string }) =>
        candidate.id === "performance-advisor-brief",
    );

    expect(advisorBrief).toMatchObject({
      routePattern: "/performance",
      mode: "advisor",
      wikiSlug: "Performance-Advisor-Brief-Screen-Guide",
      sourceOwners: [
        "lotus-gateway",
        "lotus-core",
        "lotus-performance",
        "lotus-advise",
        "lotus-ai",
      ],
      implementationEvidence: expect.arrayContaining([
        "src/apps/performance/components/advisor-brief/advisor-brief-review-workflow.tsx",
        "src/apps/performance/use-performance-advisor-brief.ts",
      ]),
      runtimeEvidence: expect.arrayContaining([
        "scripts/live/validation/browser-workflows.mjs",
        "tests/e2e/performance-workbench.smoke.spec.ts",
      ]),
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(
          rootDirectory,
          "wiki",
          "Performance-Advisor-Brief-Screen-Guide.md",
        ),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain(
      "success appears\n  only after Gateway and Lotus AI return source-owned persistence evidence",
    );
    expect(guide).toContain("does not approve client communication");
    expect(guide).toContain("review-before-confirm");
    expect(guide).toContain("does not:\n\n- calculate return");
    expect(guide).toContain(
      "a screenshot or fixture alone is not readiness, identity, entitlement, or client-use proof",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Report centre to one complete source-backed business guide", () => {
    const registry = loadRegistry();
    const reportCentre = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "report-centre",
    );

    expect(reportCentre).toMatchObject({
      routePattern: "/reports",
      wikiSlug: "Report-Centre-Screen-Guide",
      coverageException: null,
    });
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Report-Centre-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain(
      "A portfolio bundle creates a separate report outcome for each portfolio",
    );
    expect(guide).toContain(
      "verify current membership and report eligibility again",
    );
    expect(guide).toContain(
      "does not combine clients or hide partial\ncompletion",
    );
    expect(guide).toContain("multi-portfolio canonical seed remains required");
    expect(guide).toContain(
      "it is not a claim of bank approval or competitor superiority",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("maps Portfolio Review and its compatibility paths to one complete canonical guide", () => {
    const registry = loadRegistry();
    const portfolioReview = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "portfolio-review",
    );
    const portfolioAliases = registry.routeEntrypoints.filter(
      (route: { canonicalSurfaceIds: string[] }) =>
        route.canonicalSurfaceIds.includes("portfolio-review"),
    );

    expect(portfolioReview).toMatchObject({
      routePattern: "/portfolio",
      wikiSlug: "Portfolio-Review-Screen-Guide",
      coverageException: null,
    });
    expect(
      portfolioAliases.map(
        (route: { routePattern: string }) => route.routePattern,
      ),
    ).toEqual(
      expect.arrayContaining(["/", "/portfolio", "/portfolios", "/suite"]),
    );
    const guide = fs
      .readFileSync(
        path.join(rootDirectory, "wiki", "Portfolio-Review-Screen-Guide.md"),
        "utf8",
      )
      .replaceAll("\r\n", "\n");
    expect(guide).toContain("Workbench presentation classification");
    expect(guide).toContain(
      "not source-owned readiness, approval, or suitability authority",
    );
    expect(guide).toContain("bounded Gateway `/workflow` projection");
    expect(guide).toContain(
      "it does not request the detailed `/insights` record slice",
    );
    expect(guide).toContain(
      "the screen does not fabricate a completion action",
    );
    expect(guide).toContain(
      "Workbench orders and labels the handoff but does not persist approval",
    );
    expect(guide).toContain(
      "source-owned performance warnings and partial failures",
    );
    expect(guide).toContain("supporting-request outages visible");
    expect(guide).toContain(
      "retained but unrendered payload fields do not\nbecome visible evidence",
    );
    expect(guide).toContain(
      "Manage failures carried in `partial_failures` are rendered",
    );
    expect(guide).toContain("the affected analytical scope is named");
    expect(guide).toContain(
      "Reporting `READY` and `COMPLETE` use one canonical resolved-state mapping",
    );
    expect(guide).toContain("Preparing portfolio review");
    expect(guide).toContain(
      "there is no background request loop or unimplemented page-local Retry",
    );
    expect(guide).toContain("without carrying portfolio or client identity");
    expect(guide).toContain(
      "only the Performance, Cashflow, or Reporting evidence actually present",
    );
    expect(guide).toContain(
      "not calculation lineage or supportability certification",
    );
    expect(guide).toContain(
      "Portfolio Review deliberately excludes record-oriented filters",
    );
    expect(guide).toContain(
      "a complete dated book summary replaces totals, valuation date, and position-coverage readiness together",
    );
    expect(validate(registry).errors).toEqual([]);
  });

  it("rejects a source route that disappears from the registry", () => {
    const registry = loadRegistry();
    registry.routeEntrypoints = registry.routeEntrypoints.filter(
      (route: { entrypoint: string }) =>
        route.entrypoint !== "src/app/reports/page.tsx",
    );

    expect(validate(registry).errors).toContain(
      "Unregistered route entrypoint: src/app/reports/page.tsx.",
    );
  });

  it("executes the registry schema instead of accepting unknown fields", () => {
    const registry = loadRegistry();
    registry.unexpectedField = true;

    expect(validate(registry).errors).toContain(
      "Schema $: unexpected property unexpectedField.",
    );
  });

  it("rejects route patterns that drift from their Next.js entrypoint", () => {
    const registry = loadRegistry();
    registry.routeEntrypoints.find(
      (route: { entrypoint: string }) =>
        route.entrypoint === "src/app/proposals/[proposalId]/page.tsx",
    ).routePattern = "/proposals/:proposalId";

    expect(validate(registry).errors).toContain(
      "Route src/app/proposals/[proposalId]/page.tsx must use derived pattern /proposals/{proposalId}, not /proposals/:proposalId.",
    );
  });

  it("rejects an active mode removed from its canonical route mapping", () => {
    const registry = loadRegistry();
    const route = registry.routeEntrypoints.find(
      (candidate: { routePattern: string }) =>
        candidate.routePattern === "/performance",
    );
    route.canonicalSurfaceIds = route.canonicalSurfaceIds.filter(
      (surfaceId: string) => surfaceId !== "risk-review",
    );

    expect(validate(registry).errors).toContain(
      "Active surface risk-review is not mapped by its canonical route /performance.",
    );
  });

  it("rejects catalogue source-owner drift from the canonical registry", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) =>
        candidate.id === "construction-alternatives",
    );
    surface.sourceOwners.push("lotus-risk");

    expect(validate(registry).errors).toContain(
      "Screen guide catalogue owners for construction-alternatives must be Gateway, Manage, and Risk, not Gateway and Manage.",
    );
  });

  it("rejects catalogue business-name drift from the canonical registry", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) =>
        candidate.id === "construction-alternatives",
    );
    surface.businessName = "Construction Scenario";

    expect(validate(registry).errors).toContain(
      "Screen guide catalogue name for construction-alternatives must be Construction Scenario, not Construction Alternatives.",
    );
  });

  it("rejects catalogue guide status that contradicts coverage truth", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "advisor-book",
    );
    surface.coverageException = {
      issue: 605,
      plannedSlice: "book-and-portfolio-entry-guides",
      reason:
        "The guide is intentionally marked incomplete for this regression test.",
    };

    expect(validate(registry).errors).toContain(
      "Screen guide catalogue guide status for advisor-book must be Existing guide; complete-standard alignment planned, not Guide available.",
    );
  });

  it("rejects cyclic alias ownership", () => {
    const registry = loadRegistry();
    const alias = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "client-context-alias",
    );
    alias.canonicalSurfaceId = "client-context-alias";

    expect(validate(registry).errors).toContain(
      "Alias client-context-alias must terminate at a non-alias canonical surface; cycle detected at client-context-alias.",
    );
  });

  it("rejects fragment navigation without an implementation-owned target", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "client-context-alias",
    );
    surface.fragment = "simulation";

    expect(validate(registry).errors).toContain(
      "Surface client-context-alias fragment target does not exist: #simulation.",
    );
  });

  it("rejects an active screen without a guide or governed exception", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "report-centre",
    );
    surface.wikiSlug = null;
    surface.coverageException = null;

    expect(validate(registry).errors).toContain(
      "Active surface report-centre has neither a wiki guide nor a coverage exception.",
    );
  });

  it("rejects duplicate guide ownership", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "portfolio-review",
    );
    surface.wikiSlug = "Advisor-Book-Workflow";

    expect(validate(registry).errors).toContain(
      "Duplicate active wiki slug: Advisor-Book-Workflow.",
    );
  });

  it("rejects drift from source-owned mode definitions", () => {
    const registry = loadRegistry();
    delete registry.modeAuthorities.find(
      (authority: { family: string }) => authority.family === "performance",
    ).surfaceMappings.risk;

    expect(validate(registry).errors).toContain(
      "Mode authority performance has unmapped source mode: risk.",
    );
  });

  it("keeps PM Operating Quality ownership aligned to its AI workflow evidence", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "pm-operating-quality",
    );

    expect(surface.sourceOwners).toEqual([
      "lotus-gateway",
      "lotus-manage",
      "lotus-ai",
    ]);
    expect(surface.implementationEvidence).toEqual(
      expect.arrayContaining([
        "src/features/workbench/pm-operating-quality-api.ts",
        "src/features/workbench/components/pm-operating-quality-summary-invocations-card.tsx",
      ]),
    );
  });

  it.each([
    "performance",
    "performance-aliases",
    "manage",
    "advisory-journey",
    "proposal-lifecycle",
  ])("rejects removal of the required %s mode authority", (family) => {
    const registry = loadRegistry();
    registry.modeAuthorities = registry.modeAuthorities.filter(
      (authority: { family: string }) => authority.family !== family,
    );

    expect(validate(registry).errors).toContain(
      `Required mode authority is missing: ${family}.`,
    );
  });

  it("rejects duplicate mode-authority families", () => {
    const registry = loadRegistry();
    registry.modeAuthorities.push(structuredClone(registry.modeAuthorities[0]));

    expect(validate(registry).errors).toContain(
      "Duplicate mode authority family: performance.",
    );
  });

  it("rejects unexpected mode-authority families", () => {
    const registry = loadRegistry();
    registry.modeAuthorities[0].family = "performance-copy";

    expect(validate(registry).errors).toContain(
      "Unexpected mode authority family: performance-copy.",
    );
  });

  it("rejects drift from supported mode aliases", () => {
    const registry = loadRegistry();
    delete registry.modeAuthorities.find(
      (authority: { family: string }) =>
        authority.family === "performance-aliases",
    ).surfaceMappings["advisor-brief"];

    expect(validate(registry).errors).toContain(
      "Mode authority performance-aliases has unmapped source mode: advisor-brief.",
    );
  });

  it("rejects a source alias target that differs from its canonical registry target", () => {
    const registry = loadRegistry();
    const authority = registry.modeAuthorities.find(
      (candidate: { family: string }) =>
        candidate.family === "performance-aliases",
    );
    const source = fs
      .readFileSync(path.join(rootDirectory, authority.source), "utf8")
      .replace('"advisor-brief": "advisor"', '"advisor-brief": "risk"');

    expect(
      validateModeAuthority(authority, source, registry.surfaces),
    ).toContain(
      "Mode authority performance-aliases source alias advisor-brief targets risk, but performance-advisor-brief-alias resolves to canonical mode advisor.",
    );
  });

  it("rejects evidence paths that cannot be inspected", () => {
    const registry = loadRegistry();
    const surface = registry.surfaces.find(
      (candidate: { id: string }) => candidate.id === "portfolio-review",
    );
    surface.implementationEvidence = [
      "src/features/portfolio/missing-screen.tsx",
    ];

    expect(validate(registry).errors).toContain(
      "Surface portfolio-review evidence does not exist: src/features/portfolio/missing-screen.tsx.",
    );
  });
});
