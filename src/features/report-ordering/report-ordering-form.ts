import { z } from "zod";

import type { ReportFamily } from "./contracts";
import {
  reportOrderingFieldErrors,
  type ReportOrderingConfiguration,
  type ReportOrderingSourceContext,
} from "./view-model";

export type ReportOrderingFormValues = Pick<
  ReportOrderingConfiguration,
  "asOfDate" | "reportingCurrency" | "configurationValues"
>;

export const REPORT_DATE_FORM_ERROR =
  "Choose a report date within the available portfolio history.";
export const REPORT_CURRENCY_FORM_ERROR =
  "Choose a reporting currency available for this portfolio.";
export const REPORT_REQUIRED_EVIDENCE_FORM_ERROR =
  "Complete this required report evidence before review.";

const reportOrderingFormValuesSchema = z.object({
  asOfDate: z.string(),
  reportingCurrency: z.string(),
  configurationValues: z.record(z.string(), z.string()),
});

export function buildReportOrderingFormSchema({
  family,
  selectedSections,
  sourceContext,
}: {
  family: ReportFamily | null;
  selectedSections: string[];
  sourceContext: ReportOrderingSourceContext;
}) {
  return reportOrderingFormValuesSchema.superRefine((values, context) => {
    const errors = reportOrderingFieldErrors(
      family,
      { ...values, selectedSections },
      sourceContext,
    );
    if (errors.asOfDate) {
      context.addIssue({
        code: "custom",
        path: ["asOfDate"],
        message: REPORT_DATE_FORM_ERROR,
      });
    }
    if (errors.reportingCurrency) {
      context.addIssue({
        code: "custom",
        path: ["reportingCurrency"],
        message: REPORT_CURRENCY_FORM_ERROR,
      });
    }
    Object.keys(errors.configurationValues).forEach((fieldId) => {
      context.addIssue({
        code: "custom",
        path: ["configurationValues", fieldId],
        message: REPORT_REQUIRED_EVIDENCE_FORM_ERROR,
      });
    });
  });
}
