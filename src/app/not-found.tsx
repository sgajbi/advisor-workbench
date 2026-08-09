import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-container">
      <section className="section-card panel-shell panel-shell-surface-primary panel-shell-density-default">
        <div className="section-header">
          <div className="section-header-copy">
            <h1 className="ui-text ui-text-page-title">Workbench page not found</h1>
            <p className="ui-text ui-text-body">
              The requested Workbench page is not available. No portfolio, client, advisor, entitlement, or source
              system state has been inferred from this route.
            </p>
          </div>
        </div>
        <div className="section-block-body">
          <Link href="/" className="action-button lotus-primary-action action-button-primary lotus-primary-action-primary">
            Return to Workbench home
          </Link>
        </div>
      </section>
    </main>
  );
}
