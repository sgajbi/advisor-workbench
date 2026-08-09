import {
  AppPageShell,
  DegradedStatePanel,
  WorkbenchPageContainer,
  WorkbenchPageFrame,
} from "@/design-system";

export default function NotFound() {
  return (
    <AppPageShell pageKey="not-found">
      <WorkbenchPageContainer>
        <WorkbenchPageFrame
          title="Page not available"
          subtitle="Return to a supported Workbench task without inferring business or source state."
        >
          <DegradedStatePanel
            label="Navigation"
            title="Workbench page not found"
            status="Unavailable"
            actions={[{ href: "/", label: "Return to Workbench home" }]}
          >
            The requested page is not available. No portfolio, client, advisor, entitlement, or
            source-system state has been inferred from this route.
          </DegradedStatePanel>
        </WorkbenchPageFrame>
      </WorkbenchPageContainer>
    </AppPageShell>
  );
}
