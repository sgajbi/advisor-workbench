import { cx } from "../utils/cx";

import { WorkstationPage } from "./workspace-layout";

export default function AppPageShell({
  children,
  className,
  pageKey,
}: {
  children: React.ReactNode;
  className?: string;
  pageKey?: string;
}) {
  return (
    <WorkstationPage
      className={cx(
        "app-page-shell",
        pageKey ? `app-page-shell-${pageKey}` : undefined,
        className
      )}
    >
      {children}
    </WorkstationPage>
  );
}
