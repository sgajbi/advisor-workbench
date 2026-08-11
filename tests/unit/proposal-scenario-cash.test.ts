import { describe, expect, it } from "vitest";

import {
  assessProposalScenarioCashInput,
  proposalScenarioCashInputSchema,
} from "../../src/features/proposals/proposal-scenario-cash";

describe("proposal scenario cash admission", () => {
  it.each(["", "   "])("treats an empty %j input as no additional cash", (input) => {
    expect(assessProposalScenarioCashInput(input)).toEqual({
      status: "ready",
      inputState: "empty",
      amount: 0,
    });
    expect(proposalScenarioCashInputSchema.safeParse(input).success).toBe(true);
  });

  it.each(["0", "0.00", ".0"])("admits %s as an explicit zero assumption", (input) => {
    expect(assessProposalScenarioCashInput(input)).toEqual({
      status: "ready",
      inputState: "zero",
      amount: 0,
    });
  });

  it.each([
    ["10000", 10000],
    ["1250.75", 1250.75],
    [".5", 0.5],
    ["00012.30", 12.3],
  ])("admits the positive decimal %s", (input, amount) => {
    expect(assessProposalScenarioCashInput(input)).toEqual({
      status: "ready",
      inputState: "positive",
      amount,
    });
  });

  it("rejects a negative assumption with a corrective business message", () => {
    const admission = assessProposalScenarioCashInput("-1.25");

    expect(admission).toEqual({
      status: "invalid",
      reason: "negative",
      message: "Additional cash assumption cannot be negative. Enter 0 or a positive amount.",
    });
    expect(proposalScenarioCashInputSchema.safeParse("-1.25").error?.issues[0]?.message).toBe(
      admission.status === "invalid" ? admission.message : ""
    );
  });

  it.each(["USD 1000", "1,000", "1e3", "Infinity", "12..5"])(
    "rejects the ambiguous monetary input %s without coercing it to zero",
    (input) => {
      const admission = assessProposalScenarioCashInput(input);

      expect(admission).toMatchObject({
        status: "invalid",
        reason: "not_numeric",
      });
      expect(proposalScenarioCashInputSchema.safeParse(input).success).toBe(false);
    }
  );

  it.each(["0.001", "1250.755"])(
    "rejects unsupported monetary precision in %s before numeric conversion",
    (input) => {
      expect(assessProposalScenarioCashInput(input)).toEqual({
        status: "invalid",
        reason: "unsupported_precision",
        message: "Enter additional cash using no more than 2 decimal places.",
      });
    }
  );

  it.each(["70368744177664", "90071992547409.91", "99999999999999.99"])(
    "rejects %s when cent identity would not remain reliable after conversion",
    (input) => {
      expect(assessProposalScenarioCashInput(input)).toEqual({
        status: "invalid",
        reason: "out_of_range",
        message: "Additional cash assumption is too large to model reliably.",
      });
    }
  );

  it("keeps adjacent cents distinct at the admitted upper boundary", () => {
    const penultimateCent = assessProposalScenarioCashInput("70368744177663.98");
    const finalCent = assessProposalScenarioCashInput("70368744177663.99");

    expect(penultimateCent).toEqual({
      status: "ready",
      inputState: "positive",
      amount: 70368744177663.98,
    });
    expect(finalCent).toEqual({
      status: "ready",
      inputState: "positive",
      amount: 70368744177663.99,
    });
    expect(penultimateCent.status === "ready" ? penultimateCent.amount : null).not.toBe(
      finalCent.status === "ready" ? finalCent.amount : null
    );
  });
});
