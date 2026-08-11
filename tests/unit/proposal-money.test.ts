import { describe, expect, it } from "vitest";

import {
  formatProposalMinorUnits,
  isProposalMoneyCentDistinguishable,
  proposalDerivedMoneyToMinorUnits,
  proposalMoneyFromMinorUnits,
  proposalMoneyInputToMinorUnits,
  proposalMoneyToMinorUnits,
} from "../../src/features/proposals/proposal-money";

describe("proposal money", () => {
  it("uses one exact minor-unit conversion for preview and submitted decimal strings", () => {
    const minorUnits = proposalMoneyToMinorUnits(2.68);

    expect(minorUnits).toBe(268n);
    expect(proposalMoneyFromMinorUnits(minorUnits ?? 0n)).toBe(2.68);
    expect(formatProposalMinorUnits(minorUnits ?? 0n)).toBe("2.68");
    expect(formatProposalMinorUnits(-(minorUnits ?? 0n))).toBe("-2.68");
  });

  it("rejects over-precision instead of applying a competing rounding rule", () => {
    expect(proposalMoneyToMinorUnits(2.675)).toBeNull();
    expect(proposalMoneyToMinorUnits(1.0000000001)).toBeNull();
    expect(proposalMoneyInputToMinorUnits("1.0000")).toBeNull();
    expect(proposalMoneyInputToMinorUnits("9".repeat(1_000))).toBeNull();
  });

  it("rounds only derived indicative values at the documented minor-unit boundary", () => {
    expect(proposalDerivedMoneyToMinorUnits(19_000 / 3)).toBe(633_333n);
  });

  it("keeps the cent-resolution boundary fail closed", () => {
    expect(isProposalMoneyCentDistinguishable(7_036_874_417_766_399n)).toBe(true);
    expect(isProposalMoneyCentDistinguishable(7_036_874_417_766_400n)).toBe(false);
  });
});
