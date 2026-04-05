import SemanticBadge from "./semantic-badge";

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
        <SemanticBadge key={`${item.value}-${item.tone ?? "default"}`} tone={item.tone ?? "default"}>
          {item.value}
        </SemanticBadge>
      ))}
    </div>
  );
}
