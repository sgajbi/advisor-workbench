import { describe, expect, it } from "vitest";

import { resolveShellApp } from "@/shell/app-registry";

describe("resolveShellApp", () => {
  it("maps portfolio and intake routes into the Portfolio workspace", () => {
    expect(resolveShellApp("/portfolio").id).toBe("portfolio");
    expect(resolveShellApp("/portfolios").id).toBe("portfolio");
    expect(resolveShellApp("/intake").id).toBe("portfolio");
  });

  it("maps structured advisor routes correctly", () => {
    expect(resolveShellApp("/performance").id).toBe("performance");
    expect(resolveShellApp("/recommendations").id).toBe("recommendations");
    expect(resolveShellApp("/proposals/simulate").id).toBe("recommendations");
    expect(resolveShellApp("/workbench/PORT001").id).toBe("operations");
    expect(resolveShellApp("/suite").id).toBe("operations");
  });

  it("falls back to Home for unknown paths", () => {
    expect(resolveShellApp("/unknown/path").id).toBe("home");
  });
});
