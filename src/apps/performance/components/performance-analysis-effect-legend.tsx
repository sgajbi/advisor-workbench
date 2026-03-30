const DEFAULT_ITEMS = [
  {
    key: "allocation",
    label: "Allocation",
    swatchClassName: "performance-effect-bar-allocation",
  },
  {
    key: "selection",
    label: "Selection",
    swatchClassName: "performance-effect-bar-selection",
  },
  {
    key: "interaction",
    label: "Interaction",
    swatchClassName: "performance-effect-bar-interaction",
  },
];

export default function PerformanceAnalysisEffectLegend({
  label = "Attribution effect legend",
  items = DEFAULT_ITEMS,
}: {
  label?: string;
  items?: {
    key: string;
    label: string;
    swatchClassName: string;
  }[];
}) {
  return (
    <div className="performance-effect-legend" aria-label={label}>
      {items.map((item) => (
        <span key={item.key} className="performance-effect-legend-item">
          <i
            className={`performance-effect-legend-swatch ${item.swatchClassName}`}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
