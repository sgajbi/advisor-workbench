import SemanticBadge from "./semantic-badge";

export type WorkbenchStatusStripItem = {
  label: string;
  value: string;
  support?: string;
  tone?: "default" | "success" | "warn" | "danger";
};

export default function WorkbenchStatusStrip({
  items,
  label,
  className,
  gridClassName,
  itemClassName,
  itemLabelClassName,
  itemBodyClassName,
  itemChipClassName,
  itemSupportClassName,
}: {
  items: WorkbenchStatusStripItem[];
  label: string;
  className?: string;
  gridClassName?: string;
  itemClassName?: string;
  itemLabelClassName?: string;
  itemBodyClassName?: string;
  itemChipClassName?: string;
  itemSupportClassName?: string;
}) {
  return (
    <section aria-label={label} className={className}>
      <div className={gridClassName}>
        {items.map((item) => (
          <div key={item.label} className={itemClassName}>
            <span className={itemLabelClassName}>{item.label}</span>
            <div className={itemBodyClassName}>
              <SemanticBadge tone={item.tone ?? "default"} className={itemChipClassName}>
                {item.value}
              </SemanticBadge>
              {item.support ? <span className={itemSupportClassName}>{item.support}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
