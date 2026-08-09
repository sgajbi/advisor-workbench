import {
  ModeTabs,
  modePanelId,
  modeTabId,
  type WorkbenchChoiceGroupOption,
} from "@/design-system";
import { cx } from "@/design-system/utils/cx";

export default function PerformanceAnalysisDetailPane<T extends string>({
  title,
  subtitle,
  summary,
  actions,
  value,
  onChange,
  options,
  panels,
  idBase,
  className,
}: {
  title?: string;
  subtitle?: string;
  summary?: React.ReactNode;
  actions?: React.ReactNode;
  value: T;
  onChange: (value: T) => void;
  options: Array<WorkbenchChoiceGroupOption<T>>;
  panels: Record<T, React.ReactNode>;
  idBase: string;
  className?: string;
}) {
  const showTabs = options.length > 1;

  return (
    <div className={cx("performance-analysis-detail-pane", className)}>
      <div
        className={cx(
          "performance-analysis-detail-pane-header",
          !(title || subtitle) && "performance-analysis-detail-pane-header-tabs-only"
        )}
      >
        {title || subtitle ? (
          <div className="performance-analysis-detail-pane-copy">
            {title ? <strong>{title}</strong> : null}
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
        ) : null}
        <div className="performance-analysis-detail-pane-controls">
          {actions ? <div className="performance-analysis-detail-pane-actions">{actions}</div> : null}
          {showTabs ? (
            <ModeTabs
              value={value}
              onChange={onChange}
              options={options}
              ariaLabel={title ? `${title} view` : "Detail view"}
              idBase={idBase}
              variant="contained"
            />
          ) : null}
        </div>
      </div>
      {summary ? <div className="performance-analysis-detail-pane-summary">{summary}</div> : null}
      <div
        id={modePanelId(idBase, value)}
        role="tabpanel"
        aria-labelledby={modeTabId(idBase, value)}
        className="performance-analysis-detail-pane-body"
        tabIndex={0}
      >
        {panels[value]}
      </div>
    </div>
  );
}
