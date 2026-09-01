import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const componentPath = resolve(
  process.cwd(),
  "src/features/workbench/components/manage-mandate-health.tsx",
);
const stylesheetPath = resolve(
  process.cwd(),
  "src/features/workbench/components/manage-mandate-health.module.css",
);
const legacyStylesheetPath = resolve(
  process.cwd(),
  "src/features/workbench/manage-workspace.module.css",
);

const retiredPrefixes = [
  "manage-mandate-panel",
  "mandate-attention-",
  "mandate-health-",
  "mandate-review-",
  "mandate-source-",
  "mandate-technical-",
];

describe("Mandate Health CSS ownership", () => {
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
      [...referencedClasses].filter((className) => !declaredClasses.has(className)),
    ).toEqual([]);
    expect(["danger", "success", "warn"].every((tone) => declaredClasses.has(tone))).toBe(
      true,
    );
  });

  it("keeps Mandate Health presentation local and retires its global contract", () => {
    const component = readFileSync(componentPath, "utf8");
    const stylesheet = readFileSync(stylesheetPath, "utf8");
    const legacyStylesheet = readFileSync(legacyStylesheetPath, "utf8");

    expect(component).toContain('import styles from "./manage-mandate-health.module.css"');
    expect(component).toContain('id="mandate-health-panel"');
    expect(stylesheet).not.toContain(":global(");

    for (const prefix of retiredPrefixes) {
      expect(component).not.toContain(`className="${prefix}`);
      expect(legacyStylesheet).not.toContain(prefix);
    }
  });

  it("preserves the dense review hierarchy at workstation breakpoints", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    expect(stylesheet).toMatch(
      /\.summaryGrid\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/,
    );
    expect(stylesheet).toMatch(
      /\.reviewWorkspace\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1\.4fr\) minmax\(320px, 1fr\);/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 1200px\)[\s\S]*?\.reviewWorkspace\s*\{[\s\S]*?grid-template-columns: 1fr;/,
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.summaryGrid,[\s\S]*?grid-template-columns: 1fr;/,
    );
    expect(stylesheet).toMatch(/\.observationButton:focus-visible\s*\{[\s\S]*?box-shadow:/);
    expect(stylesheet).toMatch(/\.tableScroll:focus-visible\s*\{[\s\S]*?box-shadow:/);
  });
});
