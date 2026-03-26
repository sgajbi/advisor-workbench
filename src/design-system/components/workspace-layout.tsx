import { cx } from "../utils/cx";

export function WorkspaceLayout({
  children,
  compact = false,
  className,
}: {
  children: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <section className={cx("workspace-layout", compact && "workspace-layout-compact", className)}>
      {children}
    </section>
  );
}

export function WorkspaceRail({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <aside className={cx("workspace-rail", className)}>{children}</aside>;
}

export function WorkspaceMain({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx("workspace-main", className)}>{children}</div>;
}

export function WorkspaceSide({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <aside className={cx("workspace-side", className)}>{children}</aside>;
}

export function WorkspaceGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={cx("workspace-grid", className)}>{children}</section>;
}
