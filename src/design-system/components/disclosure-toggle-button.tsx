import { cx } from "../utils/cx";

type DisclosureToggleButtonProps = {
  expanded: boolean;
  onToggle?: () => void;
  expandedLabel?: string;
  collapsedLabel?: string;
  expandedToggleLabel?: string;
  collapsedToggleLabel?: string;
  className?: string;
  decorative?: boolean;
};

export default function DisclosureToggleButton({
  expanded,
  onToggle,
  expandedLabel = "Collapse",
  collapsedLabel = "Expand",
  expandedToggleLabel,
  collapsedToggleLabel,
  className,
  decorative = false,
}: DisclosureToggleButtonProps) {
  const label = expanded ? expandedLabel : collapsedLabel;
  const toggleLabel = expanded
    ? expandedToggleLabel ?? label
    : collapsedToggleLabel ?? label;

  const content = (
    <>
      {toggleLabel ? <span className="disclosure-toggle-button-label">{toggleLabel}</span> : null}
      <span className="disclosure-toggle-button-chevron" aria-hidden="true">
        ▾
      </span>
    </>
  );

  if (decorative) {
    return (
      <span
        className={cx("disclosure-toggle-button", "disclosure-toggle-button-decorative", className)}
        aria-hidden="true"
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={cx("disclosure-toggle-button", className)}
      aria-expanded={expanded}
      aria-label={toggleLabel || label}
      onClick={onToggle}
    >
      {content}
    </button>
  );
}
