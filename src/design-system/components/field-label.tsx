import { cx } from "../utils/cx";

export default function FieldLabel({
  children,
  className,
  htmlFor,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label
      className={cx("ui-text", "ui-text-label", "workbench-field-label", className)}
      {...(htmlFor ? { htmlFor } : {})}
    >
      {children}
    </label>
  );
}
