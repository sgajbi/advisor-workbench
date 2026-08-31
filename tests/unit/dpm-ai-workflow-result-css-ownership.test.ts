import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const componentPath = resolve(
  process.cwd(),
  "src/features/workbench/components/dpm-ai-workflow-result.tsx",
);
const stylesheetPath = resolve(
  process.cwd(),
  "src/features/workbench/components/dpm-ai-workflow-result.module.css",
);
const legacyStylesheetPath = resolve(
  process.cwd(),
  "src/features/workbench/manage-workspace.module.css",
);

describe("PM AI workflow result CSS ownership", () => {
  it("declares every locally referenced module class", () => {
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

    expect([...referencedClasses].sort()).toEqual(["copy", "material", "result"]);
    expect(
      [...referencedClasses].filter((className) => !declaredClasses.has(className)),
    ).toEqual([]);
  });

  it("keeps the reusable result family local and retires its global contract", () => {
    const component = readFileSync(componentPath, "utf8");
    const stylesheet = readFileSync(stylesheetPath, "utf8");
    const legacyStylesheet = readFileSync(legacyStylesheetPath, "utf8");

    expect(component).toContain('import styles from "./dpm-ai-workflow-result.module.css"');
    expect(component).not.toMatch(/className=["']dpm-ai-workflow-/);
    expect(stylesheet).not.toContain(":global(");
    expect(legacyStylesheet).not.toContain("dpm-ai-workflow-");
  });

  it("preserves a readable evidence layout at compact workstation widths", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    expect(stylesheet).toMatch(
      /\.material dl > div\s*\{[\s\S]*?grid-template-columns: minmax\(130px, 0\.32fr\) minmax\(0, 1fr\);/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 1200px\)[\s\S]*?\.material dl > div\s*\{[\s\S]*?grid-template-columns: 1fr;/,
    );
    expect(stylesheet).toMatch(/\.copy h3:focus-visible\s*\{[\s\S]*?box-shadow:/);
  });
});
