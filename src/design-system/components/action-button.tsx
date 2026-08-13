import { forwardRef } from "react";

import { cx } from "../utils/cx";
import styles from "./action-button.module.css";

export type ActionButtonPriority = "primary" | "secondary" | "quiet";

type ActionButtonProps = {
  children: React.ReactNode;
  priority?: ActionButtonPriority;
  className?: string;
  type?: "button" | "submit";
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "type">;

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  {
    children,
    priority = "secondary",
    className,
    type = "button",
    ...buttonProps
  },
  ref,
) {
  return (
    <button
      ref={ref}
      {...buttonProps}
      type={type}
      className={cx(
        "action-button",
        "lotus-primary-action",
        styles.base,
        priority === "primary" && styles.primary,
        priority === "quiet" && styles.quiet,
        priority === "primary" && "action-button-primary lotus-primary-action-primary",
        priority === "quiet" && "action-button-quiet",
        className
      )}
    >
      {children}
    </button>
  );
});

export default ActionButton;
