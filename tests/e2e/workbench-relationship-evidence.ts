import { expect, type Page } from "@playwright/test";

export type WorkbenchRelationshipEvidence = {
  duplicateIds: string[];
  relationships: Array<{
    targetId: string;
    targetCount: number;
    controllerCount: number;
  }>;
};

export async function expectWorkbenchRelationshipIntegrity(
  page: Page,
  targetIds: readonly string[],
): Promise<WorkbenchRelationshipEvidence> {
  const evidence = await page.evaluate((expectedTargetIds) => {
    const idCounts = new Map<string, number>();
    for (const element of document.querySelectorAll<HTMLElement>("[id]")) {
      idCounts.set(element.id, (idCounts.get(element.id) ?? 0) + 1);
    }

    const controlledTargets = Array.from(
      document.querySelectorAll<HTMLElement>("[aria-controls]"),
    ).flatMap((element) =>
      (element.getAttribute("aria-controls") ?? "")
        .split(/\s+/)
        .filter(Boolean),
    );

    return {
      duplicateIds: Array.from(idCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([id]) => id)
        .sort(),
      relationships: expectedTargetIds.map((targetId) => ({
        targetId,
        targetCount: idCounts.get(targetId) ?? 0,
        controllerCount: controlledTargets.filter(
          (controlledTarget) => controlledTarget === targetId,
        ).length,
      })),
    };
  }, targetIds);

  expect(evidence.duplicateIds, "Document ids must remain unique.").toEqual([]);
  for (const relationship of evidence.relationships) {
    expect(
      relationship.targetCount,
      `${relationship.targetId} must resolve to exactly one target.`,
    ).toBe(1);
    expect(
      relationship.controllerCount,
      `${relationship.targetId} must be referenced by at least one control.`,
    ).toBeGreaterThan(0);
  }

  return evidence;
}
