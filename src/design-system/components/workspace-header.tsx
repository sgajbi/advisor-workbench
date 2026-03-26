import { cx } from "../utils/cx";

export default function WorkspaceHeader({
  title,
  meta,
  className,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("page-header", "page-header-compact", className)}>
      <div>
        <h1 className="page-title">{title}</h1>
      </div>
      {meta ? <div className="page-meta-strip">{meta}</div> : null}
    </section>
  );
}
