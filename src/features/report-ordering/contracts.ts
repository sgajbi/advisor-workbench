import { z } from "zod";

const availabilityStateSchema = z.enum(["ready", "partial", "unavailable"]);
const eligibilityStateSchema = z.enum([
  "ready",
  "partial",
  "unavailable",
  "permission_blocked",
  "unsupported",
]);

const availabilitySchema = z
  .object({
    state: availabilityStateSchema,
    reasonCode: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

const eligibilitySchema = z
  .object({
    state: eligibilityStateSchema,
    reasonCode: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

const submissionCapabilitySchema = z
  .object({
    capabilityId: z.enum([
      "reporting.portfolio_review.single",
      "reporting.portfolio_review.explicit_batch",
    ]),
    method: z.literal("POST"),
    path: z.enum(["/api/v1/reports/portfolio-reviews", "/api/v1/report-batches"]),
    state: eligibilityStateSchema,
    reasonCode: z.string().min(1),
  })
  .strict();

const configurationOptionSchema = z
  .object({
    value: z.string().min(1),
    businessLabel: z.string().min(1),
  })
  .strict();

const configurationFieldSchema = z
  .object({
    fieldId: z.string().min(1),
    businessLabel: z.string().min(1),
    description: z.string().min(1),
    inputType: z.enum(["business_date", "currency", "benchmark", "multi_select"]),
    requirement: z.enum(["required", "optional"]),
    defaultingPolicy: z.string().min(1),
    valueSource: z.enum([
      "caller",
      "portfolio_context_or_caller",
      "gateway_eligible_benchmark",
      "report_catalogue",
    ]),
    options: z.array(configurationOptionSchema),
  })
  .strict();

const reportSectionSchema = z
  .object({
    sectionId: z.string().min(1),
    businessLabel: z.string().min(1),
    description: z.string().min(1),
    displayOrder: z.number().int().min(1),
    selectionPosture: z.enum(["required", "optional"]),
    defaultSelected: z.boolean(),
    dependencyFieldIds: z.array(z.string().min(1)),
  })
  .strict();

const outputFormatSchema = z
  .object({
    formatId: z.enum(["json", "pdf"]),
    businessLabel: z.string().min(1),
    usePosture: z.enum(["system_integration", "governed_document"]),
    state: availabilityStateSchema,
    reasonCode: z.string().min(1),
  })
  .strict();

const orderingModeSchema = z
  .object({
    modeId: z.enum([
      "single_portfolio",
      "explicit_portfolio_batch",
      "governed_schedule",
      "source_workflow",
    ]),
    businessLabel: z.string().min(1),
    description: z.string().min(1),
    defaultOutputFormat: z.enum(["json", "pdf"]),
    interactive: z.boolean(),
    eligibility: eligibilitySchema,
    submission: submissionCapabilitySchema.nullable().optional(),
  })
  .strict();

const reportFamilySchema = z
  .object({
    reportFamilyId: z.string().min(1),
    businessLabel: z.string().min(1),
    description: z.string().min(1),
    intendedUse: z.string().min(1),
    audienceRoles: z.array(z.string().min(1)),
    clientReleasePosture: z.enum([
      "advisor_review_required_distribution_not_supported",
      "internal_control_only",
    ]),
    orderingModes: z.array(orderingModeSchema),
    outputFormats: z.array(outputFormatSchema),
    configurationFields: z.array(configurationFieldSchema),
    sections: z.array(reportSectionSchema),
    availability: availabilitySchema,
    eligibility: eligibilitySchema,
  })
  .strict();

export const reportOrderingResponseSchema = z
  .object({
    contractVersion: z.literal("workbench-report-ordering.v1"),
    sourceAuthority: z.literal("reporting"),
    sourceContractVersion: z.literal("report-ordering-catalogue.v1"),
    scopeSelection: z
      .object({
        scopeType: z.enum(["portfolio", "client", "book"]),
        scopeId: z.string().min(1),
      })
      .strict()
      .nullable(),
    catalogueAvailability: availabilitySchema,
    scopeEligibility: eligibilitySchema,
    reportFamilies: z.array(reportFamilySchema),
  })
  .strict();

const portfolioScopeSchema = z
  .object({
    portfolio_ids: z.array(z.string().min(1)).min(1),
  })
  .passthrough();

export const reportJobHandleSchema = z
  .object({
    report_request_id: z.string().min(1),
    report_job_id: z.string().min(1),
    status: z.string().min(1),
    status_url: z.string().min(1),
    idempotency_key: z.string().min(1),
  })
  .strict();

const reportJobListItemSchema = z
  .object({
    reportJobId: z.string().min(1),
    reportRequestId: z.string().min(1),
    reportType: z.string().min(1),
    tenantId: z.string().min(1),
    region: z.string().min(1),
    portfolioScope: portfolioScopeSchema,
    asOfDate: z.string().min(1),
    status: z.string().min(1),
    failureCategory: z.string().nullable(),
    currentStep: z.string().min(1),
    retryEligible: z.boolean(),
    cancelRequested: z.boolean(),
    idempotencyKey: z.string().min(1),
    correlationId: z.string(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict();

export const reportJobListResponseSchema = z
  .object({
    count: z.number().int().min(0),
    appliedFilters: z.object({}).passthrough(),
    items: z.array(reportJobListItemSchema),
  })
  .strict();

export type ReportOrderingResponse = z.infer<typeof reportOrderingResponseSchema>;
export type ReportFamily = ReportOrderingResponse["reportFamilies"][number];
export type ReportConfigurationField = ReportFamily["configurationFields"][number];
export type ReportSection = ReportFamily["sections"][number];
export type ReportOutputFormat = ReportFamily["outputFormats"][number];
export type ReportOrderingMode = ReportFamily["orderingModes"][number];
export type ReportJobHandle = z.infer<typeof reportJobHandleSchema>;
export type ReportJobListResponse = z.infer<typeof reportJobListResponseSchema>;
export type ReportJobListItem = ReportJobListResponse["items"][number];

export function parseReportOrderingResponse(value: unknown): ReportOrderingResponse {
  return reportOrderingResponseSchema.parse(value);
}

export function parseReportJobHandle(value: unknown): ReportJobHandle {
  return reportJobHandleSchema.parse(value);
}

export function parseReportJobListResponse(value: unknown): ReportJobListResponse {
  return reportJobListResponseSchema.parse(value);
}
