import { cx } from "../utils/cx";

export type ActionButtonPriority = "primary" | "secondary" | "quiet";

export default function ActionButton({
  children,
  priority = "secondary",
  onClick,
  className,
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  priority?: ActionButtonPriority;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        "action-button",
        "lotus-primary-action",
        priority === "primary" && "action-button-primary lotus-primary-action-primary",
        priority === "quiet" && "action-button-quiet",
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
