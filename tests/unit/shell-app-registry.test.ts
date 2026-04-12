import { describe, expect, it } from "vitest";

import { resolveShellApp } from "@/shell/app-registry";

describe("resolveShellApp", () => {
  it("maps portfolio and intake routes into the Portfolio workspace", () => {
    expect(resolveShellApp("/portfolio").id).toBe("portfolio");
    expect(resolveShellApp("/portfolios").id).toBe("portfolio");
    expect(resolveShellApp("/intake").id).toBe("portfolio");
  });

  it("maps structured workspace routes correctly", () => {
    expect(resolveShellApp("/performance").id).toBe("performance");
    expect(resolveShellApp("/performance", new URLSearchParams("mode=risk")).id).toBe("risk");
    expect(resolveShellApp("/workbench/PORT001").id).toBe("home");
    expect(resolveShellApp("/suite").id).toBe("home");
    expect(resolveShellApp("/recommendations").id).toBe("advisory");
    expect(resolveShellApp("/proposals/simulate").id).toBe("proposal");
  });

  it("falls back to Home for unknown paths", () => {
    expect(resolveShellApp("/unknown/path").id).toBe("home");
  });
});
