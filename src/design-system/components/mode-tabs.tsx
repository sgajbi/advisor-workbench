import { cx } from "../utils/cx";

import WorkbenchSegmentedControl, {
  type WorkbenchSegmentedControlOption,
} from "./workbench-segmented-control";

export default function ModeTabs<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  accentModeKey,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<WorkbenchSegmentedControlOption<T>>;
  ariaLabel: string;
  className?: string;
  accentModeKey?: T;
}) {
  return (
    <WorkbenchSegmentedControl
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
      className={cx(
        "mode-tabs",
        "lotus-mode-tabs",
        accentModeKey && value === accentModeKey && "mode-tabs-accent-active lotus-mode-tabs-advisor-active",
        className
      )}
      buttonClassName="mode-tabs-button lotus-mode-tabs-button"
    />
  );
}
