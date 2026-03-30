import { cx } from "../utils/cx";

export type WorkbenchSegmentedControlOption<T extends string> = {
  key: T;
  label: string;
  disabled?: boolean;
  title?: string;
};

export default function WorkbenchSegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  buttonClassName,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<WorkbenchSegmentedControlOption<T>>;
  ariaLabel: string;
  className?: string;
  buttonClassName?: string;
}) {
  return (
    <div
      className={cx("workbench-segmented-control", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={option.disabled}
            aria-disabled={option.disabled}
            title={option.title}
            className={cx(
              "workbench-segmented-control-button",
              isActive && "workbench-segmented-control-button-active",
              buttonClassName
            )}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
