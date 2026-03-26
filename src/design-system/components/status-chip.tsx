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
  return (
    <span className={cx("status-chip", tone !== "default" && tone, className)}>{children}</span>
  );
}
