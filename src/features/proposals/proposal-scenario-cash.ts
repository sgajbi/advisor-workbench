import { z } from "zod";

const PLAIN_DECIMAL_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

export const PROPOSAL_SCENARIO_CASH_HELP =
  "Optional draft assumption. Blank or 0 means no additional cash; source cash remains authoritative.";

export type ProposalScenarioCashAdmission =
  | {
      status: "ready";
      inputState: "empty" | "zero" | "positive";
      amount: number;
    }
  | {
      status: "invalid";
      reason: "negative" | "not_numeric" | "out_of_range";
      message: string;
    };

export function assessProposalScenarioCashInput(
  input: string
): ProposalScenarioCashAdmission {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    return { status: "ready", inputState: "empty", amount: 0 };
  }

  const amount = Number(normalizedInput);
  if (Number.isFinite(amount) && amount < 0) {
    return {
      status: "invalid",
      reason: "negative",
      message: "Additional cash assumption cannot be negative. Enter 0 or a positive amount.",
    };
  }

  if (!PLAIN_DECIMAL_PATTERN.test(normalizedInput) || !Number.isFinite(amount)) {
    return {
      status: "invalid",
      reason: "not_numeric",
      message:
        "Enter additional cash as a number without currency symbols or separators, or leave it blank.",
    };
  }

  if (amount > Number.MAX_SAFE_INTEGER) {
    return {
      status: "invalid",
      reason: "out_of_range",
      message: "Additional cash assumption is too large to model reliably.",
    };
  }

  return {
    status: "ready",
    inputState: amount === 0 ? "zero" : "positive",
    amount,
  };
}

export const proposalScenarioCashInputSchema = z.string().superRefine((input, context) => {
  const admission = assessProposalScenarioCashInput(input);
  if (admission.status === "invalid") {
    context.addIssue({
      code: "custom",
      message: admission.message,
    });
  }
});
