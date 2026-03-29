import { cx } from "../utils/cx";

type StatusTone = "default" | "success" | "warn" | "danger";

export default function StatusChip({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  const label = typeof children === "string" ? children : undefined;
  return (
    <span
      className={cx("status-chip", tone !== "default" && tone, className)}
      aria-label={label ? `Status ${label}` : undefined}
      title={label}
    >
      {children}
    </span>
  );
}
