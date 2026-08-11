const PROPOSAL_MINOR_UNIT_SCALE = 100;
const PROPOSAL_DECIMAL_INPUT_PATTERN = /^([+-]?)(?:(\d+)(?:\.(\d{0,2}))?|\.(\d{1,2}))$/;

export const PROPOSAL_CENT_DISTINGUISHABLE_MINOR_LIMIT = 7_036_874_417_766_400n;

export function proposalMoneyInputToMinorUnits(value: string): bigint | null {
  const match = PROPOSAL_DECIMAL_INPUT_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const wholeInput = (match[2] ?? "0").replace(/^0+(?=\d)/, "");
  if (wholeInput.length > 14) {
    return null;
  }
  const wholeUnits = BigInt(wholeInput);
  const fractionalUnits = BigInt((match[3] ?? match[4] ?? "").padEnd(2, "0") || "0");
  const magnitude = wholeUnits * BigInt(PROPOSAL_MINOR_UNIT_SCALE) + fractionalUnits;
  if (!isProposalMoneyCentDistinguishable(magnitude)) {
    return null;
  }

  return match[1] === "-" ? -magnitude : magnitude;
}

export function proposalMoneyToMinorUnits(value: number): bigint | null {
  return Number.isFinite(value) ? proposalMoneyInputToMinorUnits(String(value)) : null;
}

export function proposalDerivedMoneyToMinorUnits(value: number): bigint | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const roundedMinorUnits = Math.round(value * PROPOSAL_MINOR_UNIT_SCALE);
  return Number.isSafeInteger(roundedMinorUnits) &&
    isProposalMoneyCentDistinguishable(BigInt(roundedMinorUnits))
    ? BigInt(roundedMinorUnits)
    : null;
}

export function proposalMoneyFromMinorUnits(value: bigint): number {
  return Number(value) / PROPOSAL_MINOR_UNIT_SCALE;
}

export function formatProposalMinorUnits(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const magnitude = value < 0n ? -value : value;
  const majorUnits = magnitude / BigInt(PROPOSAL_MINOR_UNIT_SCALE);
  const minorUnits = String(magnitude % BigInt(PROPOSAL_MINOR_UNIT_SCALE)).padStart(2, "0");
  return `${sign}${majorUnits}.${minorUnits}`;
}

export function isProposalMoneyCentDistinguishable(value: bigint): boolean {
  const magnitude = value < 0n ? -value : value;
  return magnitude < PROPOSAL_CENT_DISTINGUISHABLE_MINOR_LIMIT;
}
