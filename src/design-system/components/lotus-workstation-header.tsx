import LotusMark from "@/shell/lotus-mark";

import { cx } from "../utils/cx";

export default function LotusWorkstationHeader({
  product,
  title,
  context,
  actions,
  className,
}: {
  product: React.ReactNode;
  title: React.ReactNode;
  context: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("lotus-workstation-header", className)}>
      <div className="lotus-workstation-header-brand">
        <span className="lotus-workstation-header-mark" aria-hidden="true">
          <LotusMark />
        </span>
        <div className="lotus-workstation-header-copy">
          <span className="lotus-workstation-header-product">{product}</span>
          <h1 className="lotus-workstation-header-title">{title}</h1>
          <p className="lotus-workstation-header-context">{context}</p>
        </div>
      </div>
      {actions ? <div className="lotus-workstation-header-actions">{actions}</div> : null}
    </section>
  );
}
