const PROPOSAL_MINOR_UNIT_SCALE = 100;

export const PROPOSAL_CENT_DISTINGUISHABLE_MINOR_LIMIT = 7_036_874_417_766_400n;

export function proposalMoneyToMinorUnits(value: number): bigint | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const scaledMinorUnits = value * PROPOSAL_MINOR_UNIT_SCALE;
  const roundedMinorUnits = Math.round(scaledMinorUnits);
  if (Math.abs(scaledMinorUnits - roundedMinorUnits) > 1e-7) {
    return null;
  }
  return Number.isSafeInteger(roundedMinorUnits) ? BigInt(roundedMinorUnits) : null;
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
