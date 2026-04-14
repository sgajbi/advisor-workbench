import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { lotusThemeTokens } from "@/design-system/theme/tokens";

function readRootCssVariables(): Record<string, string> {
  const globalsPath = path.resolve(__dirname, "../../src/app/globals.css");
  const css = fs.readFileSync(globalsPath, "utf8");
  const rootBlockMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!rootBlockMatch) {
    throw new Error("Could not find :root CSS token block in globals.css");
  }

  const variables: Record<string, string> = {};
  const variablePattern = /--([a-z0-9-]+):\s*([^;]+);/gi;

  for (const match of rootBlockMatch[1].matchAll(variablePattern)) {
    variables[`--${match[1]}`] = match[2].trim();
  }

  return variables;
}

describe("design-system token contract", () => {
  it("exposes the required grouped token domains for RFC-0021 slice 1", () => {
    expect(lotusThemeTokens).toMatchObject({
      color: expect.any(Object),
      typography: expect.any(Object),
      spacing: expect.any(Object),
      radius: expect.any(Object),
      elevation: expect.any(Object),
      focus: expect.any(Object),
      layout: expect.any(Object),
      control: expect.any(Object),
      table: expect.any(Object),
      zIndex: expect.any(Object),
    });
    expect(lotusThemeTokens.typography.variant).toMatchObject({
      workspaceTitle: expect.any(Object),
      pageTitle: expect.any(Object),
      sectionTitle: expect.any(Object),
      panelTitle: expect.any(Object),
      bodySmall: expect.any(Object),
      dataLabel: expect.any(Object),
      tableHeader: expect.any(Object),
      metricValueL: expect.any(Object),
      badgeLabel: expect.any(Object),
    });
    expect(lotusThemeTokens.color.surface).toMatchObject({
      primary: expect.any(String),
      secondary: expect.any(String),
      tertiary: expect.any(String),
    });
    expect(lotusThemeTokens.layout).toMatchObject({
      panelPaddingDefault: expect.any(String),
      panelPaddingCompact: expect.any(String),
      panelPaddingDense: expect.any(String),
      workbenchPanelGap: expect.any(String),
      workbenchPanelGapMajor: expect.any(String),
    });
    expect(lotusThemeTokens.metricTile.height).toMatchObject({
      default: expect.any(String),
      compact: expect.any(String),
    });
  });

  it("keeps representative CSS root variables aligned with the shared TypeScript token baseline", () => {
    const cssVariables = readRootCssVariables();

    expect(cssVariables["--bg"]).toBe(lotusThemeTokens.color.surface.canvas);
    expect(cssVariables["--bg-alt"]).toBe(lotusThemeTokens.color.surface.canvasAlt);
    expect(cssVariables["--bg-page"]).toBe(lotusThemeTokens.color.surface.page);
    expect(cssVariables["--bg-foundation"]).toBe(lotusThemeTokens.color.surface.foundation);
    expect(cssVariables["--panel"]).toBe(lotusThemeTokens.color.surface.panel);
    expect(cssVariables["--panel-alt"]).toBe(lotusThemeTokens.color.surface.panelAlt);
    expect(cssVariables["--surface-primary"]).toBe(lotusThemeTokens.color.surface.primary);
    expect(cssVariables["--surface-secondary"]).toBe(lotusThemeTokens.color.surface.secondary);
    expect(cssVariables["--surface-tertiary"]).toBe(lotusThemeTokens.color.surface.tertiary);
    expect(cssVariables["--text"]).toBe(lotusThemeTokens.color.text.primary);
    expect(cssVariables["--text-muted"]).toBe(lotusThemeTokens.color.text.muted);
    expect(cssVariables["--border"]).toBe(lotusThemeTokens.color.border.default);
    expect(cssVariables["--border-strong"]).toBe(lotusThemeTokens.color.border.strong);
    expect(cssVariables["--brand"]).toBe(lotusThemeTokens.color.brand.base);
    expect(cssVariables["--brand-strong"]).toBe(lotusThemeTokens.color.brand.strong);
    expect(cssVariables["--brand-accent"]).toBe(lotusThemeTokens.color.brand.accent);
    expect(cssVariables["--brand-highlight"]).toBe(lotusThemeTokens.color.brand.highlight);
    expect(cssVariables["--success"]).toBe(lotusThemeTokens.color.semantic.success);
    expect(cssVariables["--warn-text"]).toBe(lotusThemeTokens.color.semantic.warning);
    expect(cssVariables["--danger"]).toBe(lotusThemeTokens.color.semantic.danger);
    expect(cssVariables["--space-4"]).toBe(lotusThemeTokens.spacing.step4);
    expect(cssVariables["--space-6"]).toBe(lotusThemeTokens.spacing.step6);
    expect(cssVariables["--space-7"]).toBe(lotusThemeTokens.spacing.step7);
    expect(cssVariables["--space-9"]).toBe(lotusThemeTokens.spacing.step9);
    expect(cssVariables["--radius-control"]).toBe(`${lotusThemeTokens.radius.control}px`);
    expect(cssVariables["--radius-tile"]).toBe(`${lotusThemeTokens.radius.tile}px`);
    expect(cssVariables["--radius-panel"]).toBe(`${lotusThemeTokens.radius.panel}px`);
    expect(cssVariables["--elevation-none"]).toBe(lotusThemeTokens.elevation.none);
    expect(cssVariables["--font-ui"]).toBe(lotusThemeTokens.typography.fontFamily.ui);
    expect(cssVariables["--text-sm"]).toBe(lotusThemeTokens.typography.size.textSm);
    expect(cssVariables["--text-3xl"]).toBe(lotusThemeTokens.typography.size.text3xl);
    expect(cssVariables["--tracking-label"]).toBe(lotusThemeTokens.typography.tracking.label);
    expect(cssVariables["--workbench-rail-width"]).toBe(lotusThemeTokens.layout.workbenchRailWidth);
    expect(cssVariables["--workbench-card-padding"]).toBe(
      lotusThemeTokens.layout.workbenchCardPadding
    );
    expect(cssVariables["--panel-padding-default"]).toBe(lotusThemeTokens.layout.panelPaddingDefault);
    expect(cssVariables["--panel-padding-compact"]).toBe(lotusThemeTokens.layout.panelPaddingCompact);
    expect(cssVariables["--panel-padding-dense"]).toBe(lotusThemeTokens.layout.panelPaddingDense);
    expect(cssVariables["--panel-gap-default"]).toBe(lotusThemeTokens.layout.workbenchPanelGap);
    expect(cssVariables["--panel-gap-major"]).toBe(lotusThemeTokens.layout.workbenchPanelGapMajor);
    expect(cssVariables["--metric-tile-height-default"]).toBe(lotusThemeTokens.metricTile.height.default);
    expect(cssVariables["--metric-tile-height-compact"]).toBe(lotusThemeTokens.metricTile.height.compact);
    expect(cssVariables["--focus-ring"]).toBe(lotusThemeTokens.focus.ring);
  });
});
