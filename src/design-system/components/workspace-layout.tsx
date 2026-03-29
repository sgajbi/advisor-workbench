import { cx } from "../utils/cx";

export function WorkstationPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <main className={cx("workstation-page", className)}>{children}</main>;
}

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

export function WorkstationShell({
  rail,
  main,
  side,
  sideDensity = "default",
  className,
  mainClassName,
  railClassName,
  sideClassName,
}: {
  rail?: React.ReactNode;
  main: React.ReactNode;
  side?: React.ReactNode;
  sideDensity?: "default" | "comfortable";
  className?: string;
  mainClassName?: string;
  railClassName?: string;
  sideClassName?: string;
}) {
  const layoutClassName =
    rail && side
      ? "workstation-shell-both"
      : rail
        ? "workstation-shell-rail-only"
        : side
          ? "workstation-shell-side-only"
          : "workstation-shell-main-only";

  return (
    <section
      className={cx(
        "workstation-shell",
        layoutClassName,
        sideDensity === "comfortable" && "workstation-shell-side-density-comfortable",
        className
      )}
    >
      {rail ? <aside className={cx("workstation-shell-rail", railClassName)}>{rail}</aside> : null}
      <div className={cx("workstation-shell-main", mainClassName)}>{main}</div>
      {side ? (
        <aside
          className={cx(
            "workstation-shell-side",
            sideDensity === "comfortable" && "workstation-shell-side-comfortable",
            sideClassName
          )}
        >
          {side}
        </aside>
      ) : null}
    </section>
  );
}
