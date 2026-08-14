import { render, screen, within } from "@testing-library/react";

import OperationalRecordList from "../../src/design-system/components/operational-record-list";

describe("OperationalRecordList", () => {
  it("keeps record identity, status, facts, and supporting detail in one semantic list item", () => {
    render(
      <OperationalRecordList
        ariaLabel="Recent operational records"
        items={[
          {
            key: "record-1",
            title: "Portfolio review",
            description: "Approved report creation is in progress.",
            status: <span>In progress</span>,
            facts: [
              { label: "Report date", value: "14 Aug 2026" },
              { label: "Requested", value: "14 Aug 2026, 09:30" },
            ],
            detail: (
              <details>
                <summary>Support reference</summary>
                <code>rjob_1</code>
              </details>
            ),
          },
        ]}
      />,
    );

    const list = screen.getByRole("list", { name: "Recent operational records" });
    const record = within(list).getByRole("article", { name: "Portfolio review" });
    expect(within(record).getByRole("heading", { name: "Portfolio review" })).toBeInTheDocument();
    expect(within(record).getByText("In progress")).toBeInTheDocument();
    expect(within(record).getByText("Approved report creation is in progress.")).toBeInTheDocument();
    expect(within(record).getByText("14 Aug 2026")).toBeInTheDocument();
    expect(within(record).getByText("14 Aug 2026, 09:30")).toBeInTheDocument();
    expect(within(record).getByText("rjob_1")).toBeInTheDocument();
  });
});
