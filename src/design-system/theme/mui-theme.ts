import { createTheme } from "@mui/material";

import { lotusThemeTokens } from "./tokens";

export function createLotusMuiTheme() {
  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: lotusThemeTokens.color.brand.base,
        dark: lotusThemeTokens.color.brand.strong,
        light: lotusThemeTokens.color.brand.accent,
      },
      secondary: {
        main: lotusThemeTokens.color.brand.highlight,
      },
      background: {
        default: lotusThemeTokens.color.surface.canvas,
        paper: lotusThemeTokens.color.surface.panel,
      },
      text: {
        primary: lotusThemeTokens.color.text.primary,
        secondary: lotusThemeTokens.color.text.muted,
      },
      success: {
        main: lotusThemeTokens.color.semantic.success,
      },
      warning: {
        main: lotusThemeTokens.color.semantic.warning,
      },
      error: {
        main: lotusThemeTokens.color.semantic.danger,
      },
      divider: lotusThemeTokens.color.border.default,
    },
    shape: {
      borderRadius: lotusThemeTokens.radius.control,
    },
    typography: {
      fontFamily: lotusThemeTokens.typography.fontFamily.ui,
      h1: {
        fontFamily: lotusThemeTokens.typography.fontFamily.display,
        fontWeight: 600,
        letterSpacing: "-0.03em",
      },
      h2: {
        fontFamily: lotusThemeTokens.typography.fontFamily.display,
        fontWeight: 600,
        letterSpacing: "-0.02em",
      },
      h3: {
        fontFamily: lotusThemeTokens.typography.fontFamily.display,
        fontWeight: 600,
        letterSpacing: "-0.02em",
      },
      button: {
        fontWeight: 700,
        textTransform: "none",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            color: lotusThemeTokens.color.text.primary,
            backgroundColor: lotusThemeTokens.color.surface.canvas,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderRadius: lotusThemeTokens.radius.panel,
            border: lotusThemeTokens.color.border.subtle,
            boxShadow: lotusThemeTokens.elevation.subtle,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: lotusThemeTokens.radius.control,
          },
        },
      },
    },
  });
}
