import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import WorkbenchIcon, {
  type WorkbenchIconName,
} from "../../src/design-system/components/workbench-icon";

describe("WorkbenchIcon", () => {
  it.each<WorkbenchIconName>([
    "archive",
    "chevron-right",
    "pending",
    "refresh",
    "success",
    "verify",
    "warning",
  ])("renders the governed %s icon as decorative inline SVG", (name) => {
    const { container } = render(<WorkbenchIcon name={name} />);
    const icon = container.querySelector("svg");

    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("focusable", "false");
    expect(icon?.childElementCount).toBeGreaterThan(0);
    expect(container).not.toHaveTextContent(name);
  });

  it("fails closed for an unsupported runtime icon value", () => {
    const { container } = render(
      <WorkbenchIcon name={"unsupported" as WorkbenchIconName} />,
    );

    expect(container.querySelector("svg")).toBeEmptyDOMElement();
    expect(container).not.toHaveTextContent("unsupported");
  });
});
