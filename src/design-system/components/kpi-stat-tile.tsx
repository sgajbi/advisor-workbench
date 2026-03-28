import AnalyticsStat from "./analytics-stat";

export default function KpiStatTile({
  label,
  value,
  support,
  definition,
  valueTone,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  support?: React.ReactNode;
  definition?: string;
  valueTone?: "neutral" | "success" | "warn" | "danger";
  onClick?: () => void;
}) {
  return (
    <AnalyticsStat
      label={label}
      value={value}
      support={support}
      definition={definition}
      valueTone={valueTone}
      onClick={onClick}
    />
  );
}
