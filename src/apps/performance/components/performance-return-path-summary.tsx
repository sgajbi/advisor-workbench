import Tooltip from "@mui/material/Tooltip";

type PerformanceReturnPathSummaryItem = {
  key: string;
  label: string;
  value: string;
  definition?: string;
};

export default function PerformanceReturnPathSummary({
  items,
}: {
  items: PerformanceReturnPathSummaryItem[];
}) {
  return (
    <section
      className="performance-chart-readout-strip performance-return-path-summary"
      aria-label="Return decision readout"
    >
      {items.map((item) => {
        const card = (
          <div
            key={item.key}
            className="performance-chart-readout-primary"
            title={item.definition}
          >
            <span className="performance-chart-readout-eyebrow">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        );

        if (!item.definition) {
          return card;
        }

        return (
          <Tooltip key={item.key} title={item.definition} arrow>
            <span>{card}</span>
          </Tooltip>
        );
      })}
    </section>
  );
}
