import { describe, expect, it } from "vitest";

import { createLotusMuiTheme } from "@/design-system/theme/mui-theme";
import { lotusThemeTokens } from "@/design-system/theme/tokens";

describe("Lotus MUI theme", () => {
  it("aligns palette and typography with Lotus design tokens", () => {
    const theme = createLotusMuiTheme();

    expect(theme.palette.primary.main).toBe(lotusThemeTokens.color.brand);
    expect(theme.palette.primary.dark).toBe(lotusThemeTokens.color.brandStrong);
    expect(theme.palette.background.default).toBe(lotusThemeTokens.color.bg);
    expect(theme.palette.text.primary).toBe(lotusThemeTokens.color.text);
    expect(theme.typography.fontFamily).toBe(lotusThemeTokens.font.ui);
    expect(theme.typography.h1.fontFamily).toBe(lotusThemeTokens.font.display);
  });

  it("applies shared component posture for paper and buttons", () => {
    const theme = createLotusMuiTheme();
    const paper = theme.components?.MuiPaper?.styleOverrides?.root;
    const button = theme.components?.MuiButton?.styleOverrides?.root;

    expect(paper).toMatchObject({
      borderRadius: lotusThemeTokens.radius.panel,
    });
    expect(button).toMatchObject({
      borderRadius: lotusThemeTokens.radius.control,
    });
  });
});
