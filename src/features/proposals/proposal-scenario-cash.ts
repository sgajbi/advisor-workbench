import { z } from "zod";

const PLAIN_DECIMAL_PATTERN = /^(?:(\d+)(?:\.(\d*))?|\.(\d+))$/;
// Keep admitted values below 2^46 major units, where IEEE-754 spacing remains below one cent.
const MAX_CENT_DISTINGUISHABLE_MINOR_UNITS = 7_036_874_417_766_399n;

export const PROPOSAL_SCENARIO_CASH_HELP =
  "Optional draft assumption. Blank or 0 means no additional cash. Use up to 2 decimal places; source cash remains authoritative.";

export type ProposalScenarioCashAdmission =
  | {
      status: "ready";
      inputState: "empty" | "zero" | "positive";
      amount: number;
    }
  | {
      status: "invalid";
      reason: "negative" | "not_numeric" | "unsupported_precision" | "out_of_range";
      message: string;
    };

export function assessProposalScenarioCashInput(
  input: string
): ProposalScenarioCashAdmission {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    return { status: "ready", inputState: "empty", amount: 0 };
  }

  const numericCandidate = Number(normalizedInput);
  if (Number.isFinite(numericCandidate) && numericCandidate < 0) {
    return {
      status: "invalid",
      reason: "negative",
      message: "Additional cash assumption cannot be negative. Enter 0 or a positive amount.",
    };
  }

  const decimalMatch = PLAIN_DECIMAL_PATTERN.exec(normalizedInput);
  if (!decimalMatch || !Number.isFinite(numericCandidate)) {
    return {
      status: "invalid",
      reason: "not_numeric",
      message:
        "Enter additional cash as a number without currency symbols or separators, or leave it blank.",
    };
  }

  const wholeDigits = (decimalMatch[1] ?? "0").replace(/^0+(?=\d)/, "");
  const fractionalDigits = decimalMatch[2] ?? decimalMatch[3] ?? "";
  if (fractionalDigits.length > 2) {
    return {
      status: "invalid",
      reason: "unsupported_precision",
      message: "Enter additional cash using no more than 2 decimal places.",
    };
  }

  if (wholeDigits.length > 14) {
    return {
      status: "invalid",
      reason: "out_of_range",
      message: "Additional cash assumption is too large to model reliably.",
    };
  }

  const minorUnits =
    BigInt(wholeDigits) * 100n + BigInt(fractionalDigits.padEnd(2, "0") || "0");
  if (minorUnits > MAX_CENT_DISTINGUISHABLE_MINOR_UNITS) {
    return {
      status: "invalid",
      reason: "out_of_range",
      message: "Additional cash assumption is too large to model reliably.",
    };
  }

  const amount = Number(minorUnits) / 100;

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
