import { cx } from "../utils/cx";

import { WorkstationShell } from "./workspace-layout";

export default function MainWithSideRailLayout({
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
  return (
    <WorkstationShell
      rail={rail}
      main={main}
      side={side}
      sideDensity={sideDensity}
      className={cx("main-with-side-rail-layout", className)}
      mainClassName={mainClassName}
      railClassName={railClassName}
      sideClassName={sideClassName}
    />
  );
}
