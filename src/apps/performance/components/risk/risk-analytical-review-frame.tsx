import type { ReactNode } from "react";

export default function RiskAnalyticalReviewFrame({
  summary,
  supplementary,
  className,
}: {
  summary?: ReactNode;
  supplementary?: ReactNode;
  className?: string;
}) {
  if (!summary && !supplementary) {
    return null;
  }

  return (
    <div
      className={[
        "performance-risk-analytical-review-frame",
        summary && supplementary ? "performance-risk-analytical-review-frame-split" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {summary ? (
        <div className="performance-risk-analytical-review-frame-main">{summary}</div>
      ) : null}
      {supplementary ? (
        <div className="performance-risk-analytical-review-frame-side">{supplementary}</div>
      ) : null}
    </div>
  );
}
