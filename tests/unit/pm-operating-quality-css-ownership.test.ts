import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const componentDirectory = resolve(
  process.cwd(),
  "src/features/workbench/components",
);
const componentPaths = [
  "pm-operating-quality-panel.tsx",
  "pm-operating-quality-policy-card.tsx",
  "pm-operating-quality-score-run-card.tsx",
  "pm-operating-quality-governance-card.tsx",
  "pm-operating-quality-fairness-evidence-card.tsx",
  "pm-operating-quality-review-action-control.tsx",
  "pm-operating-quality-review-actions-card.tsx",
  "pm-operating-quality-summary-invocation-control.tsx",
  "pm-operating-quality-summary-invocations-card.tsx",
].map((path) => resolve(componentDirectory, path));
const stylesheetPath = resolve(
  componentDirectory,
  "pm-operating-quality.module.css",
);
const legacyStylesheetPath = resolve(
  process.cwd(),
  "src/features/workbench/manage-workspace.module.css",
);
const canonicalWorkflowPath = resolve(
  process.cwd(),
  "scripts/live/validation/browser-workflows.mjs",
);

describe("PM Operating Quality CSS ownership", () => {
  it("declares every local module class referenced by the component family", () => {
    const components = componentPaths.map((path) => readFileSync(path, "utf8")).join("\n");
    const stylesheet = readFileSync(stylesheetPath, "utf8");
    const declaredClasses = new Set(
      [...stylesheet.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((match) => match[1]),
    );
    const referencedClasses = new Set(
      [...components.matchAll(/\bstyles\.([A-Za-z_$][\w$]*)/g)].map(
        (match) => match[1],
      ),
    );

    expect(
      [...referencedClasses].filter((className) => !declaredClasses.has(className)),
    ).toEqual([]);
  });

  it("retires global presentation selectors and keeps canonical proof semantic", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");
    const legacyStylesheet = readFileSync(legacyStylesheetPath, "utf8");
    const canonicalWorkflow = readFileSync(canonicalWorkflowPath, "utf8");

    expect(stylesheet).not.toContain(":global(");
    expect(legacyStylesheet).not.toContain("pm-quality-");
    expect(legacyStylesheet).not.toContain("pm-operating-quality-panel");
    expect(canonicalWorkflow).toContain(
      'page.locator("article#pm-operating-quality-panel")',
    );
    expect(canonicalWorkflow).toContain(
      'getByTestId("pm-operating-quality-source-evidence")',
    );
    expect(canonicalWorkflow).not.toContain('"pm-operating-quality-panel",');
    expect(canonicalWorkflow).not.toContain('locator(".pm-quality-status-strip")');
  });

  it("uses full-width evidence and a responsive governance metric strip", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    expect(stylesheet).toMatch(
      /\.panel\s*\{[\s\S]*?container-name: pm-operating-quality;[\s\S]*?container-type: inline-size;/,
    );
    expect(stylesheet).toMatch(
      /\.workspace\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/,
    );
    expect(stylesheet).toMatch(
      /\.statusStrip\s*\{[\s\S]*?repeat\(auto-fit, minmax\(min\(100%, 12rem\), 1fr\)\)/,
    );
    expect(stylesheet).toMatch(
      /\.governanceStack\s*\{[\s\S]*?grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /@container pm-operating-quality \(max-width: 75rem\)[\s\S]*?\.governanceStack\s*\{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/,
    );
    expect(stylesheet).toMatch(
      /@container pm-operating-quality \(max-width: 75rem\)[\s\S]*?\.operationEvidence,[\s\S]*?\.detailGrid,[\s\S]*?\.detailStack\s*\{[\s\S]*?repeat\(auto-fit, minmax\(min\(100%, 10rem\), 1fr\)\)/,
    );
    expect(stylesheet).toMatch(
      /@container pm-operating-quality \(max-width: 40rem\)[\s\S]*?\.governanceStack\s*\{[\s\S]*?grid-template-columns: 1fr;/,
    );
    expect(stylesheet).not.toContain("@media (max-width: 1200px)");
    expect(stylesheet).toContain("overflow-wrap: anywhere");
  });
});
