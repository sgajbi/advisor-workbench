import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const componentPath = resolve(
  process.cwd(),
  "src/features/workbench/components/dpm-copilot-workspace.tsx",
);
const stylesheetPath = resolve(
  process.cwd(),
  "src/features/workbench/components/dpm-copilot-workspace.module.css",
);
const legacyStylesheetPath = resolve(
  process.cwd(),
  "src/features/workbench/manage-workspace.module.css",
);
const governanceBaselinePath = resolve(
  process.cwd(),
  "scripts/quality/css-global-governance-baseline.json",
);

describe("PM Copilot CSS ownership", () => {
  it("declares every statically referenced local module class", () => {
    const component = readFileSync(componentPath, "utf8");
    const stylesheet = readFileSync(stylesheetPath, "utf8");
    const declaredClasses = new Set(
      [...stylesheet.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((match) => match[1]),
    );
    const referencedClasses = new Set(
      [...component.matchAll(/\bstyles\.([A-Za-z_$][\w$]*)/g)].map(
        (match) => match[1],
      ),
    );

    expect(
      [...referencedClasses].filter(
        (className) => !declaredClasses.has(className),
      ),
    ).toEqual([]);
  });

  it("keeps presentation beside PM Copilot and retires its global contract", () => {
    const component = readFileSync(componentPath, "utf8");
    const stylesheet = readFileSync(stylesheetPath, "utf8");
    const legacyStylesheet = readFileSync(legacyStylesheetPath, "utf8");
    const baseline = readFileSync(governanceBaselinePath, "utf8");

    expect(component).toContain(
      'import styles from "./dpm-copilot-workspace.module.css"',
    );
    expect(component).toContain('id="pm-copilot-workspace"');
    expect(stylesheet).not.toContain(":global(");
    expect(component).not.toContain('className="dpm-copilot-');
    expect(legacyStylesheet).not.toContain("dpm-copilot-");
    expect(baseline).toContain('"dpm-copilot-"');
  });

  it("preserves the dense desktop decision hierarchy and responsive stack", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    expect(stylesheet).toMatch(
      /\.decisionFacts\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 519px\)[\s\S]*?\.decisionFacts\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 519px\)[\s\S]*?\.decisionAction,[\s\S]*?flex-direction: column;/,
    );
  });
});
