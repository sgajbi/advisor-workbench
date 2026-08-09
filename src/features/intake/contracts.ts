import { z } from "zod";

export const IntakePublishedCountsSchema = z.record(
  z.string().min(1),
  z.number().int().nonnegative(),
);

export const IntakeEnvelopeResponseSchema = z.object({
  correlation_id: z.string().trim().min(1),
  contract_version: z.string().trim().min(1),
  data: z
    .object({
      message: z.string().optional(),
      published_counts: IntakePublishedCountsSchema,
    })
    .passthrough(),
});

export type IntakeEnvelopeResponse = z.infer<typeof IntakeEnvelopeResponseSchema>;
