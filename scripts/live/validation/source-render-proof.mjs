/**
 * @typedef {object} SourceRenderProofRow
 * @property {string} source
 * @property {string} identity
 * @property {string} state
 */

/**
 * Proves that a rendered business view preserves the exact identities and states supplied by its
 * owning Gateway contract. Screen adapters remain responsible for domain vocabulary and DOM
 * extraction; this helper owns only source-to-render conformance.
 *
 * @param {object} proof
 * @param {string} proof.screen
 * @param {SourceRenderProofRow[]} proof.expectedRows
 * @param {SourceRenderProofRow[]} proof.renderedRows
 * @returns {SourceRenderProofRow[]}
 */
export function assertExactSourceRenderProof({
  screen,
  expectedRows,
  renderedRows,
}) {
  const screenName = requireText(screen, "screen", "proof");
  const expected = normalizeRows(screenName, "source", expectedRows);
  const rendered = normalizeRows(screenName, "rendered", renderedRows);
  const renderedByIdentity = indexRows(screenName, "rendered", rendered);
  indexRows(screenName, "source", expected);

  for (const sourceRow of expected) {
    const renderedRow = renderedByIdentity.get(rowKey(sourceRow));
    if (!renderedRow) {
      throw new Error(
        `${screenName}: source ${sourceRow.source} identity ${sourceRow.identity} expected state ${sourceRow.state}, but no rendered evidence was found.`,
      );
    }
    if (renderedRow.state !== sourceRow.state) {
      throw new Error(
        `${screenName}: source ${sourceRow.source} identity ${sourceRow.identity} expected state ${sourceRow.state}, but rendered state ${renderedRow.state}.`,
      );
    }
  }

  const expectedKeys = new Set(expected.map(rowKey));
  const unexpected = rendered.find((row) => !expectedKeys.has(rowKey(row)));
  if (unexpected) {
    throw new Error(
      `${screenName}: rendered source ${unexpected.source} identity ${unexpected.identity} with state ${unexpected.state}, but Gateway supplied no matching row.`,
    );
  }

  return expected;
}

function normalizeRows(screen, side, rows) {
  if (!Array.isArray(rows)) {
    throw new Error(`${screen}: ${side} proof rows were not an array.`);
  }
  return rows.map((row, index) => ({
    source: requireText(
      row?.source,
      "source",
      `${side} row ${index + 1}`,
      screen,
    ),
    identity: requireText(
      row?.identity,
      "identity",
      `${side} row ${index + 1}`,
      screen,
    ),
    state: requireText(row?.state, "state", `${side} row ${index + 1}`, screen),
  }));
}

function indexRows(screen, side, rows) {
  const indexed = new Map();
  for (const row of rows) {
    const key = rowKey(row);
    if (indexed.has(key)) {
      throw new Error(
        `${screen}: ${side} proof duplicated source ${row.source} identity ${row.identity} in state ${row.state}.`,
      );
    }
    indexed.set(key, row);
  }
  return indexed;
}

function rowKey(row) {
  return `${row.source}\u0000${row.identity}`;
}

function requireText(value, field, location, screen = "Source render proof") {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${screen}: ${location} returned no ${field}.`);
  }
  return normalized;
}
