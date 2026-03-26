import { describe, expect, it } from "vitest";

import { resolveShellApp } from "@/shell/app-registry";

describe("resolveShellApp", () => {
  it("maps portfolio and intake routes into the Foundation workspace", () => {
    expect(resolveShellApp("/portfolios").id).toBe("foundation");
    expect(resolveShellApp("/pas/intake").id).toBe("foundation");
  });

  it("maps existing route families into their owning shell apps", () => {
    expect(resolveShellApp("/pa/analytics").id).toBe("performance");
    expect(resolveShellApp("/proposals/simulate").id).toBe("proposal");
    expect(resolveShellApp("/workbench/PORT001").id).toBe("manage");
    expect(resolveShellApp("/suite").id).toBe("platform");
  });

  it("falls back to Home for unknown paths", () => {
    expect(resolveShellApp("/unknown/path").id).toBe("home");
  });
});
