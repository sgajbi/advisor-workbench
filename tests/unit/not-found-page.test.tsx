import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "@/app/not-found";

describe("NotFound", () => {
  it("uses the governed page and recovery pattern without fabricated source context", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "Page not available" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Workbench page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to Workbench home" })).toHaveAttribute("href", "/");
    expect(document.body).toHaveTextContent("No portfolio, client, advisor, entitlement, or source-system state");
    expect(document.body).not.toHaveTextContent(/PORT_|CIF_|advisor_1|pipeline live/i);
  });
});
