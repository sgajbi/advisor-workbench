import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertExactSourceRenderProof } from "../live/validation/source-render-proof.mjs";
import { SOURCE_AUTHORITY_CONTRACTS } from "./source-authority-contracts.mjs";
import { SOURCE_AUTHORITY_RENDER_PROOF_IDS } from "./source-authority-render-proof-registry.mjs";

function defaultRepoRoot() {
  return resolve(process.cwd());
}

function isMainModule() {
  return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isText(value) {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function rejectsExactProof(screen, expectedRows, renderedRows) {
  try {
    assertExactSourceRenderProof({ screen, expectedRows, renderedRows });
    return false;
  } catch {
    return true;
  }
}

function validateSourceRows(contract, rows, errors) {
  if (!Array.isArray(rows) || rows.length === 0) {
    errors.push(`${contract.id}: source adapter returned no proof rows.`);
    return;
  }

  const identities = new Set();
  for (const [index, row] of rows.entries()) {
    if (!isText(row?.source) || !isText(row?.identity) || !isText(row?.state)) {
      errors.push(`${contract.id}: source adapter row ${index + 1} is malformed.`);
      continue;
    }
    const identity = `${row.source}\u0000${row.identity}`;
    if (identities.has(identity)) {
      errors.push(
        `${contract.id}: source adapter duplicated ${row.source} identity ${row.identity}.`,
      );
    }
    identities.add(identity);
  }
}

function validateRenderProofEnrollment(contracts, errors) {
  const proofIds = SOURCE_AUTHORITY_RENDER_PROOF_IDS;
  if (!Array.isArray(proofIds) || proofIds.length === 0) {
    errors.push("Source-authority rendered-component proof enrollment is empty.");
    return;
  }
  const uniqueProofIds = new Set(proofIds);
  if (uniqueProofIds.size !== proofIds.length) {
    errors.push("Source-authority rendered-component proof enrollment contains duplicate IDs.");
  }

  const contractIds = new Set(
    contracts.map((contract) => contract?.id).filter((id) => isText(id)),
  );
  for (const contractId of contractIds) {
    if (!uniqueProofIds.has(contractId)) {
      errors.push(`${contractId}: no executable rendered-component proof is enrolled.`);
    }
  }
  for (const proofId of uniqueProofIds) {
    if (!contractIds.has(proofId)) {
      errors.push(`${proofId}: rendered-component proof has no source-authority contract.`);
    }
  }
}

function validateImplementationEvidence(contract, repoRoot, errors) {
  if (!Array.isArray(contract.implementationEvidence) || contract.implementationEvidence.length === 0) {
    errors.push(`${contract.id}: no production implementation evidence is declared.`);
    return;
  }
  for (const evidence of contract.implementationEvidence) {
    if (!isText(evidence?.path) || !Array.isArray(evidence?.tokens) || evidence.tokens.length === 0) {
      errors.push(`${contract.id}: malformed production implementation evidence.`);
      continue;
    }
    let source;
    try {
      source = readFileSync(resolve(repoRoot, evidence.path), "utf8");
    } catch {
      errors.push(`${contract.id}: implementation file ${evidence.path} is unavailable.`);
      continue;
    }
    for (const token of evidence.tokens) {
      if (!isText(token) || !source.includes(token)) {
        errors.push(`${contract.id}: ${evidence.path} does not prove ${JSON.stringify(token)}.`);
      }
    }
  }
}

function validateExactMutationFamily(contract, expectedRows, errors) {
  const target = contract.target;
  const targetIndex = expectedRows.findIndex(
    (row) => row.source === target.source && row.identity === target.identity,
  );
  if (targetIndex < 0) {
    errors.push(`${contract.id}: the controlled target is absent from Gateway source rows.`);
    return;
  }
  if (expectedRows[targetIndex].state !== target.sourceState) {
    errors.push(
      `${contract.id}: target state ${expectedRows[targetIndex].state} does not match declared source state ${target.sourceState}.`,
    );
    return;
  }

  const exactRows = expectedRows.map((row) => ({ ...row }));
  const plausibleFallback = exactRows.map((row, index) =>
    index === targetIndex ? { ...row, state: target.reassuringRenderedState } : row,
  );
  const mutationCases = [
    ["omitted", exactRows.filter((_, index) => index !== targetIndex)],
    [
      "extra",
      [
        ...exactRows,
        { source: target.source, identity: "browser_synthesised", state: target.reassuringRenderedState },
      ],
    ],
    ["duplicate", [...exactRows, { ...exactRows[targetIndex] }]],
    [
      "substituted",
      exactRows.map((row, index) =>
        index === targetIndex ? { ...row, identity: `${row.identity}_substituted` } : row,
      ),
    ],
    ["reassuring fallback", plausibleFallback],
  ];
  for (const [name, renderedRows] of mutationCases) {
    if (!rejectsExactProof(contract.screen, expectedRows, renderedRows)) {
      errors.push(`${contract.id}: exact proof accepted ${name} browser evidence.`);
    }
  }
}

function validateSourceMutation(contract, errors) {
  const mutatedPayload = clone(contract.sampleGatewayResponse);
  contract.mutateSourceState(mutatedPayload, contract.target.mutatedSourceState);
  const mutatedRows = contract.buildExpectedRows(mutatedPayload);
  const target = mutatedRows.find(
    (row) => row.source === contract.target.source && row.identity === contract.target.identity,
  );
  if (target?.state !== contract.target.mutatedSourceState) {
    errors.push(
      `${contract.id}: source adapter did not preserve mutated Gateway state ${contract.target.mutatedSourceState}.`,
    );
  }
}

export function validateSourceAuthorityContracts(
  contracts = SOURCE_AUTHORITY_CONTRACTS,
  { repoRoot = defaultRepoRoot() } = {},
) {
  const errors = [];
  if (!Array.isArray(contracts) || contracts.length === 0) {
    return ["Source-authority enrollment is empty; the control fails closed."];
  }
  if (contracts.length < 2) {
    errors.push("Source-authority enrollment must cover at least two critical Gateway-backed surfaces.");
  }
  validateRenderProofEnrollment(contracts, errors);

  const ids = new Set();
  for (const contract of contracts) {
    if (!isText(contract?.id) || !isText(contract?.screen)) {
      errors.push("Source-authority enrollment has a malformed id or screen.");
      continue;
    }
    if (ids.has(contract.id)) {
      errors.push(`${contract.id}: duplicate source-authority enrollment.`);
      continue;
    }
    ids.add(contract.id);

    const ownership = contract.sourceOwnership;
    const evidence = contract.renderedEvidence;
    if (!isText(ownership?.identity) || !isText(ownership?.state)) {
      errors.push(`${contract.id}: source identity/state ownership is incomplete.`);
    }
    if (
      !isText(evidence?.rowSelector) ||
      !isText(evidence?.identityAttribute) ||
      !isText(evidence?.stateAttribute)
    ) {
      errors.push(`${contract.id}: rendered identity/state evidence is incomplete.`);
    }
    if (!Array.isArray(contract.presentationOnly) || contract.presentationOnly.some((field) => !isText(field))) {
      errors.push(`${contract.id}: presentation-only fields are malformed.`);
    }
    if (!Array.isArray(contract.allowedStates) || contract.allowedStates.length === 0) {
      errors.push(`${contract.id}: no Gateway-owned state vocabulary is declared.`);
    }
    if (
      typeof contract.buildExpectedRows !== "function" ||
      typeof contract.mutateSourceState !== "function" ||
      !contract.sampleGatewayResponse ||
      !contract.target
    ) {
      errors.push(`${contract.id}: executable source traceability proof is incomplete.`);
      continue;
    }

    validateImplementationEvidence(contract, repoRoot, errors);
    let expectedRows;
    try {
      expectedRows = contract.buildExpectedRows(clone(contract.sampleGatewayResponse));
    } catch (error) {
      errors.push(`${contract.id}: source adapter proof failed: ${error.message}`);
      continue;
    }
    validateSourceRows(contract, expectedRows, errors);
    const unknownState = expectedRows.find((row) => !contract.allowedStates.includes(row.state));
    if (unknownState) {
      errors.push(`${contract.id}: undeclared Gateway state ${unknownState.state}.`);
    }
    validateExactMutationFamily(contract, expectedRows, errors);
    validateSourceMutation(contract, errors);
  }
  return errors;
}

export function enforceSourceAuthorityContracts(options) {
  const errors = validateSourceAuthorityContracts(SOURCE_AUTHORITY_CONTRACTS, options);
  if (errors.length > 0) {
    throw new Error(`Source-authority fitness gate failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
  return SOURCE_AUTHORITY_CONTRACTS.length;
}

if (isMainModule()) {
  const count = enforceSourceAuthorityContracts();
  console.log(`Source-authority fitness gate passed for ${count} Gateway-backed surfaces.`);
}
