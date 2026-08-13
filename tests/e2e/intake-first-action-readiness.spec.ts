import { expect, test } from "@playwright/test";

import { observeBrowserRuntimeFailures } from "./browser-runtime-reliability";
import { buildPlatformCapabilitiesFixture } from "./platform-capabilities-fixture";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "narrow", width: 390, height: 844 },
] as const;

const tasks = [
  { name: "Create portfolio record", field: "New portfolio code" },
  { name: "Import an intake file", field: "Supported CSV intake file" },
] as const;

for (const viewport of viewports) {
  for (const task of tasks) {
    test(`${task.name} accepts the first ready action at ${viewport.name} width`, async ({ page }) => {
      const browserRuntime = observeBrowserRuntimeFailures(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.route("**/api/bff/api/v1/platform/capabilities?**", async (route) => {
        await route.fulfill({ json: buildPlatformCapabilitiesFixture() });
      });

      const serverResponse = await page.request.get("/intake");
      expect(serverResponse.ok()).toBeTruthy();
      const serverHtml = await serverResponse.text();
      expect(serverHtml).toContain('aria-busy="true"');
      expect(serverHtml).toContain('data-ready="false"');
      expect(serverHtml.match(/<button[^>]*disabled=""[^>]*>/g)?.length).toBeGreaterThanOrEqual(6);

      await page.goto("/intake", { waitUntil: "domcontentloaded" });
      const chooser = page.getByRole("region", { name: "Choose an intake request" });
      await expect(chooser).toHaveAttribute("data-ready", "true");

      const action = chooser.getByRole("button", { name: new RegExp(task.name, "i") });
      await expect(action).toBeEnabled();
      await action.click();

      const editor = page.getByRole("region", { name: "Intake request editor" });
      await expect(editor).toBeVisible();
      await expect(editor.getByLabel(task.field)).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ),
        `${task.name} editor must not overflow at ${viewport.width}px`,
      ).toBeFalsy();
      browserRuntime.assertClean();
    });
  }
}
