import WorkbenchRankedBarList from "./workbench-ranked-bar-list";

type AnalyticsRankedRow = {
  key: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value: React.ReactNode;
  magnitudePct: number;
  tone: "positive" | "negative";
};

export default function AnalyticsRankedList({
  title,
  label,
  rows,
  scale,
  emptyMessage = "No ranked items are available for this analytical slice.",
}: {
  title: string;
  label: string;
  rows: AnalyticsRankedRow[];
  scale: number;
  emptyMessage?: string;
}) {
  return (
    <WorkbenchRankedBarList
      title={title}
      label={label}
      rows={rows}
      scale={scale}
      emptyMessage={emptyMessage}
    />
  );
}
