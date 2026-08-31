import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const componentRoot = resolve(
  process.cwd(),
  "src/features/workbench/components",
);
const componentNames = [
  "portfolio-memory-panel.tsx",
  "portfolio-memory-timeline-card.tsx",
  "portfolio-memory-selected-event-detail.tsx",
  "portfolio-memory-recommended-actions-rail.tsx",
] as const;
const stylesheetPath = resolve(
  componentRoot,
  "portfolio-memory-panel.module.css",
);
const manageStylesheetPath = resolve(
  process.cwd(),
  "src/features/workbench/manage-workspace.module.css",
);

describe("Portfolio Memory CSS ownership", () => {
  it("declares every local class referenced by the component family", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");
    const declaredClasses = new Set(
      [...stylesheet.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((match) => match[1]),
    );
    const missingReferences: string[] = [];

    for (const componentName of componentNames) {
      const component = readFileSync(resolve(componentRoot, componentName), "utf8");
      const referencedClasses = new Set(
        [...component.matchAll(/\bstyles\.([A-Za-z_$][\w$]*)/g)].map(
          (match) => match[1],
        ),
      );

      for (const className of referencedClasses) {
        if (!declaredClasses.has(className)) {
          missingReferences.push(`${componentName}: styles.${className}`);
        }
      }
    }

    expect(missingReferences).toEqual([]);
  });

  it("retires the raw Portfolio Memory selector contract", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");
    const manageStylesheet = readFileSync(manageStylesheetPath, "utf8");

    expect(stylesheet).not.toContain(":global(");
    expect(manageStylesheet).not.toContain("portfolio-memory-");

    for (const componentName of componentNames) {
      const component = readFileSync(resolve(componentRoot, componentName), "utf8");

      expect(component).toContain(
        'portfolio-memory-panel.module.css',
      );
      expect(component).not.toMatch(/className=["'][^"']*portfolio-memory-/);
    }
  });

  it("preserves the dense responsive decision layout", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");
    const timeline = readFileSync(
      resolve(componentRoot, "portfolio-memory-timeline-card.tsx"),
      "utf8",
    );

    expect(stylesheet).toMatch(
      /\.workspace\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(250px, 300px\);/,
    );
    expect(stylesheet).toMatch(
      /\.panel\s*\{[\s\S]*?container-name: portfolio-memory;[\s\S]*?container-type: inline-size;/,
    );
    expect(stylesheet).toMatch(
      /@container portfolio-memory \(max-width: 60rem\)[\s\S]*?\.workspace,[\s\S]*?\.detailGrid\s*\{[\s\S]*?grid-template-columns: 1fr;/,
    );
    expect(stylesheet).toMatch(
      /@container portfolio-memory \(max-width: 30rem\)[\s\S]*?\.statusStrip,[\s\S]*?\.artifactGrid\s*\{[\s\S]*?grid-template-columns: 1fr;/,
    );
    expect(stylesheet).toMatch(
      /\.snapshot\s*\{[\s\S]*?border-left: 1px solid #c6c6cd;/,
    );
    expect(timeline).toContain("tableMinWidth={770}");
  });
});
