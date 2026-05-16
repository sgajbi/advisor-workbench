import { SemanticBadge } from "@/design-system";

import { formatCurrency, formatDate, formatPct, formatStatus } from "../formatters";
import type {
  PortfolioActivitySummaryView,
  PortfolioIncomePeriodSummary,
  PortfolioIncomeSummaryView,
  PortfolioWorkspace,
} from "../types";
import PortfolioModuleState from "./portfolio-module-state";

type PortfolioIncomeActivityWorkspaceProps = {
  workspace: PortfolioWorkspace;
};

type ActivityRow = {
  bucket: string;
  amount: number;
  count: number;
  pct: number;
};

export default function PortfolioIncomeActivityWorkspace({
  workspace,
}: PortfolioIncomeActivityWorkspaceProps) {
  const income = workspace.income_summary;
  const activity = workspace.activity_summary;
  const incomeCurrency = income?.reporting_currency ?? workspace.portfolio.base_currency;
  const activityCurrency = activity?.reporting_currency ?? workspace.portfolio.base_currency;
  const incomeWindowLabel = income
    ? `${formatDate(income.window_start_date)} - ${formatDate(income.window_end_date)}`
    : "Current source window";
  const activityRows = buildActivityRows(activity);

  return (
    <div className="portfolio-income-activity-workspace">
      <section className="portfolio-income-activity-section" aria-labelledby="income-summary-heading">
        <div className="portfolio-income-activity-section-title">
          <h2 id="income-summary-heading">Income Summary</h2>
          <span>{incomeWindowLabel}</span>
        </div>
        {income ? (
          <div className="portfolio-income-activity-grid portfolio-income-grid">
            <IncomeSummaryCard income={income} currency={incomeCurrency} />
            <IncomeTypeTable income={income} currency={incomeCurrency} />
          </div>
        ) : (
          <PortfolioModuleState
            variant="status"
            state="empty"
            title="Income is not classified yet"
            body="The gateway-backed portfolio workspace did not return an income summary for the selected reporting window."
            hint="Publish classified income events upstream to populate the dedicated Income and Activity screen."
          />
        )}
      </section>

      <section className="portfolio-income-activity-section" aria-labelledby="activity-summary-heading">
        <div className="portfolio-income-activity-section-title">
          <h2 id="activity-summary-heading">Activity &amp; Cash Movements</h2>
          <span>{activity ? `${formatDate(activity.window_start_date)} - ${formatDate(activity.window_end_date)}` : "Current source window"}</span>
        </div>
        {activity ? (
          <div className="portfolio-income-activity-grid portfolio-activity-grid">
            <ActivityMovementTable rows={activityRows} currency={activityCurrency} />
            <div className="portfolio-activity-side-stack">
              <ActivityBucketCard rows={activityRows} />
              <div className="portfolio-activity-reserve">
                <div>
                  <span>Cash Weight</span>
                  <strong>{formatPct(workspace.summary.cash_weight_pct)}</strong>
                </div>
                <span className="portfolio-activity-reserve-mark" aria-hidden="true" />
              </div>
            </div>
          </div>
        ) : (
          <PortfolioModuleState
            variant="status"
            state="empty"
            title="Activity totals are incomplete"
            body="The gateway-backed portfolio workspace did not return activity buckets for the selected reporting window."
            hint="Publish source-defined activity buckets upstream to populate cash movement totals."
          />
        )}
      </section>
    </div>
  );
}

function IncomeSummaryCard({
  income,
  currency,
}: {
  income: PortfolioIncomeSummaryView;
  currency: string;
}) {
  const requestedNet = income.totals_requested_window.net.reporting_currency_amount;
  const ytdNet = income.totals_year_to_date.net.reporting_currency_amount;
  const requestedPct = ytdNet > 0 ? Math.min(Math.max((requestedNet / ytdNet) * 100, 0), 100) : 0;

  return (
    <div className="portfolio-income-card portfolio-income-card-visual">
      <MetricBar
        label="Totals Requested Window"
        value={formatCurrency(requestedNet, currency)}
        pct={requestedPct}
      />
      <MetricBar
        label="Year-to-Date (YTD)"
        value={formatCurrency(ytdNet, currency)}
        pct={100}
        muted
      />
      <div className="portfolio-income-source-note">
        Source-backed income only. Forward income forecast is not part of the current portfolio workspace contract.
      </div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  pct,
  muted = false,
}: {
  label: string;
  value: string;
  pct: number;
  muted?: boolean;
}) {
  return (
    <div className="portfolio-income-metric-bar">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="portfolio-income-bar" aria-hidden="true">
        <div
          className={muted ? "portfolio-income-bar-fill portfolio-income-bar-fill-muted" : "portfolio-income-bar-fill"}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function IncomeTypeTable({
  income,
  currency,
}: {
  income: PortfolioIncomeSummaryView;
  currency: string;
}) {
  return (
    <div className="portfolio-income-card portfolio-income-table-card">
      <table className="portfolio-income-table" aria-label="Income summary">
        <thead>
          <tr>
            <th>Category</th>
            <th>Current Period</th>
            <th>YTD Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {income.income_types.map((item) => (
            <tr key={item.income_type}>
              <td>{formatStatus(item.income_type)}</td>
              <td>{formatCurrency(item.requested_window.net.reporting_currency_amount, currency)}</td>
              <td>{formatCurrency(item.year_to_date.net.reporting_currency_amount, currency)}</td>
              <td>
                <ReadinessBadge period={item.requested_window} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="portfolio-income-table-footer">
        Last updated from gateway workspace source for {formatDate(income.window_end_date)}
      </div>
    </div>
  );
}

function ReadinessBadge({ period }: { period: PortfolioIncomePeriodSummary }) {
  const label = period.net.transaction_count > 0 ? "Ready" : "Partial";
  return <SemanticBadge tone={label === "Ready" ? "success" : "warn"}>{label}</SemanticBadge>;
}

function ActivityMovementTable({ rows, currency }: { rows: ActivityRow[]; currency: string }) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="portfolio-income-card portfolio-activity-table-card">
      <table className="portfolio-activity-table" aria-label="Activity and cash movements">
        <thead>
          <tr>
            <th>Activity Type</th>
            <th>Inflow</th>
            <th>Outflow</th>
            <th>Net Movement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.bucket}>
              <td>
                <span>{formatStatus(row.bucket)}</span>
                <small>{row.count} events</small>
              </td>
              <td className={row.amount > 0 ? "positive" : undefined}>
                {row.amount > 0 ? formatCurrency(row.amount, currency) : formatCurrency(0, currency)}
              </td>
              <td className={row.amount < 0 ? "negative" : undefined}>
                {row.amount < 0 ? formatCurrency(Math.abs(row.amount), currency) : formatCurrency(0, currency)}
              </td>
              <td className={row.amount < 0 ? "negative" : "positive"}>
                {formatCurrency(row.amount, currency)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total Net Cashflow</td>
            <td colSpan={3}>{formatCurrency(total, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ActivityBucketCard({ rows }: { rows: ActivityRow[] }) {
  return (
    <div className="portfolio-income-card portfolio-activity-buckets">
      <h3>Activity Buckets</h3>
      <div className="portfolio-activity-bucket-list">
        {rows.map((row) => (
          <div key={row.bucket} className="portfolio-activity-bucket-row">
            <div>
              <span>{formatStatus(row.bucket)}</span>
              <strong>{row.pct.toFixed(0)}%</strong>
            </div>
            <div className="portfolio-activity-bucket-bar" aria-hidden="true">
              <div style={{ width: `${row.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildActivityRows(activity: PortfolioActivitySummaryView | null | undefined): ActivityRow[] {
  if (!activity) {
    return [];
  }

  const grossMovement = activity.buckets.reduce(
    (sum, bucket) => sum + Math.abs(bucket.requested_window.reporting_currency_amount),
    0
  );

  return activity.buckets.map((bucket) => {
    const amount = bucket.requested_window.reporting_currency_amount;
    return {
      bucket: bucket.bucket,
      amount,
      count: bucket.requested_window.transaction_count,
      pct: grossMovement > 0 ? (Math.abs(amount) / grossMovement) * 100 : 0,
    };
  });
}
