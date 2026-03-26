import { cx } from "../utils/cx";

export default function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cx("pill", className)}>{children}</p>;
}
