import { cx } from "../utils/cx";

export default function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <article className={cx("section-card", className)}>{children}</article>;
}
