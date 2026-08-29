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

/**
 * Proves that a business label is a presentation of one source-owned text value. The comparison
 * permits only case and word-separator presentation differences; it does not infer aliases or
 * substitute missing values.
 *
 * @param {object} proof
 * @param {string} proof.screen
 * @param {string} proof.fact
 * @param {string} proof.sourceValue
 * @param {string} proof.renderedValue
 * @returns {string}
 */
export function assertSourceBusinessLabelProof({
  screen,
  fact,
  sourceValue,
  renderedValue,
}) {
  const screenName = requireText(screen, "screen", "proof");
  const factName = requireText(fact, "fact", "proof", screenName);
  const source = requireText(sourceValue, "source value", factName, screenName);
  const rendered = requireText(
    renderedValue,
    "rendered value",
    factName,
    screenName,
  );
  if (normalizeBusinessLabel(rendered) !== normalizeBusinessLabel(source)) {
    throw new Error(
      `${screenName}: ${factName} rendered ${rendered}, but Gateway supplied ${source}.`,
    );
  }
  return source;
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

function normalizeBusinessLabel(value) {
  return value.replaceAll("_", " ").replace(/\s+/gu, " ").toLocaleLowerCase("en");
}

function requireText(value, field, location, screen = "Source render proof") {
  if (typeof value !== "string" || !value) {
    throw new Error(`${screen}: ${location} returned no ${field}.`);
  }
  if (value !== value.trim()) {
    throw new Error(
      `${screen}: ${location} returned ${field} with surrounding whitespace.`,
    );
  }
  return value;
}
