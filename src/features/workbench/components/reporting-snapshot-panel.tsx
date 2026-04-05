"use client";

import { AnalyticsTable, SectionBlock } from "@/design-system";

type Props = {
  asOfDate: string;
  sourceService: string;
  rows: Array<Record<string, unknown>>;
};

function renderValue(value: unknown): string {
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "N/A";
  }
  return JSON.stringify(value);
}

export default function ReportingSnapshotPanel(props: Props) {
  return (
    <SectionBlock
      title="Reporting Snapshot"
      subtitle={`As of ${props.asOfDate}. Source: ${props.sourceService}`}
    >
      <AnalyticsTable
        ariaLabel="Reporting snapshot"
        variant="portfolio"
        density="comfortable"
        columns={[
          { key: "bucket", label: "Bucket" },
          { key: "metric", label: "Metric" },
          { key: "value", label: "Value", align: "right" },
        ]}
        rows={props.rows.map((row, index) => ({
          key: `${String(row.bucket ?? "row")}-${String(row.metric ?? index)}-${index}`,
          cells: [
            renderValue(row.bucket ?? row.dimension ?? "TOTAL"),
            renderValue(row.metric ?? row.name ?? "value"),
            renderValue(row.value),
          ],
        }))}
        emptyState={{
          title: "No report rows were returned",
          body: "The reporting service returned no observation rows for this as-of date.",
        }}
      />
    </SectionBlock>
  );
}
