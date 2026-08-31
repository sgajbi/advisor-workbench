import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const componentRoot = resolve(
  process.cwd(),
  "src/apps/performance/components/advisor-brief"
);
const stylesheetPath = resolve(
  componentRoot,
  "performance-advisor-brief.module.css"
);

describe("Performance Adviser Brief CSS ownership", () => {
  it("declares every statically referenced local module class", () => {
    const stylesheet = readFileSync(stylesheetPath, "utf8");
    const declaredClasses = new Set(
      [...stylesheet.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((match) => match[1])
    );
    const missingReferences: string[] = [];

    for (const componentName of readdirSync(componentRoot).filter((name) => name.endsWith(".tsx"))) {
      const component = readFileSync(resolve(componentRoot, componentName), "utf8");
      const referencedClasses = new Set(
        [...component.matchAll(/\bstyles\.([A-Za-z_$][\w$]*)/g)].map((match) => match[1])
      );

      for (const className of referencedClasses) {
        if (!declaredClasses.has(className)) {
          missingReferences.push(`${componentName}: styles.${className}`);
        }
      }
    }

    expect(missingReferences).toEqual([]);
  });
});
