const MISSING_ACTOR_VALUES = new Set(["", "n/a", "not assigned"]);

export function formatBusinessOwner(owner: string | null | undefined): string {
  const sourceOwner = owner?.trim() ?? "";
  if (MISSING_ACTOR_VALUES.has(sourceOwner.toLowerCase())) {
    return "Not assigned";
  }

  const normalized = sourceOwner.toLowerCase();
  if (normalized.includes("pricing") || normalized.includes("data")) {
    return "Data Operations";
  }
  if (normalized.includes("advisor")) {
    return "Advisor";
  }
  if (normalized.includes("portfolio") || normalized.includes("pm")) {
    return "Portfolio Manager";
  }
  if (
    normalized.includes("system") ||
    normalized.includes("lotus") ||
    normalized.includes("core")
  ) {
    return "Operations";
  }
  return sourceOwner;
}

/**
 * Presents immutable Manage actor evidence without trading audit identity for a
 * friendlier role label. Unknown actors remain exact rather than being guessed.
 */
export function formatBusinessActorEvidence(
  actor: string | null | undefined,
): string {
  const sourceActor = actor?.trim() ?? "";
  const businessRole = formatBusinessOwner(sourceActor);

  if (businessRole === "Not assigned" || businessRole === sourceActor) {
    return businessRole;
  }

  return `${businessRole} · ${sourceActor}`;
}
