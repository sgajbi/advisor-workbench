import { WorkbenchSegmentedControl, type WorkbenchSegmentedControlOption } from "@/design-system";

export default function LotusModeTabs<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<WorkbenchSegmentedControlOption<T>>;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <WorkbenchSegmentedControl
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
      className={[
        "lotus-mode-tabs",
        value === ("advisor" as T) ? "lotus-mode-tabs-advisor-active" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      buttonClassName="lotus-mode-tabs-button"
    />
  );
}
