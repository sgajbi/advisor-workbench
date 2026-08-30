/**
 * Preserves the exact constraint identity and state published by the two Gateway Risk reads.
 * The browser may format these values for presentation, but it must not calculate or substitute
 * mandate posture.
 *
 * @param {object} mandateComparisons
 * @returns {Array<{source: string, identity: string, state: string}>}
 */
export function buildRiskMandateSourceRenderRows(mandateComparisons) {
  const sources = [
    ["summary", mandateComparisons?.summary],
    ["concentration", mandateComparisons?.concentration],
  ];
  const rows = [];
  const sourceByConstraint = new Map();

  for (const [source, comparison] of sources) {
    if (!comparison || !Array.isArray(comparison.constraints)) {
      throw new Error(`Risk ${source} returned no mandate constraint evidence.`);
    }
    for (const constraint of comparison.constraints) {
      const identity =
        typeof constraint?.key === "string" ? constraint.key.trim() : "";
      const state =
        typeof constraint?.state === "string" ? constraint.state.trim() : "";
      if (!identity || !state) {
        throw new Error(`Risk ${source} returned malformed mandate constraint evidence.`);
      }
      const previousSource = sourceByConstraint.get(identity);
      if (previousSource) {
        throw new Error(
          `Risk mandate constraint ${identity} is published by both ${previousSource} and ${source}.`,
        );
      }
      sourceByConstraint.set(identity, source);
      rows.push({ source, identity, state });
    }
  }

  if (rows.length === 0) {
    throw new Error("Risk sources returned no mandate constraint rows.");
  }
  return rows;
}
