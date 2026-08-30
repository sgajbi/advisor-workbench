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
        message: errors.asOfDate,
      });
    }
    if (errors.reportingCurrency) {
      context.addIssue({
        code: "custom",
        path: ["reportingCurrency"],
        message: errors.reportingCurrency,
      });
    }
    Object.entries(errors.configurationValues).forEach(([fieldId, message]) => {
      context.addIssue({
        code: "custom",
        path: ["configurationValues", fieldId],
        message,
      });
    });
  });
}
