import StatusChip from "./status-chip";

export type WorkbenchStatusRowItem = {
  value: string;
  tone?: "default" | "success" | "warn" | "danger";
};

export default function WorkbenchStatusRow({
  items,
  label,
  className,
}: {
  items: WorkbenchStatusRowItem[];
  label: string;
  className?: string;
}) {
  return (
    <div className={className} role="group" aria-label={label}>
      {items.map((item) => (
        <StatusChip key={`${item.value}-${item.tone ?? "default"}`} tone={item.tone ?? "default"}>
          {item.value}
        </StatusChip>
      ))}
    </div>
  );
}
