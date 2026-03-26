import { cx } from "../utils/cx";

export default function Panel({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <article id={id} className={cx("section-card", className)}>
      {children}
    </article>
  );
}
