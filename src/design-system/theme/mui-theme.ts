import { createTheme } from "@mui/material";

import { lotusThemeTokens } from "./tokens";

export function createLotusMuiTheme() {
  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: lotusThemeTokens.color.brand,
        dark: lotusThemeTokens.color.brandStrong,
        light: lotusThemeTokens.color.brandAccent,
      },
      secondary: {
        main: lotusThemeTokens.color.brandHighlight,
      },
      background: {
        default: lotusThemeTokens.color.bg,
        paper: lotusThemeTokens.color.panel,
      },
      text: {
        primary: lotusThemeTokens.color.text,
        secondary: lotusThemeTokens.color.textMuted,
      },
      success: {
        main: lotusThemeTokens.color.success,
      },
      warning: {
        main: lotusThemeTokens.color.warning,
      },
      error: {
        main: lotusThemeTokens.color.danger,
      },
      divider: lotusThemeTokens.color.border,
    },
    shape: {
      borderRadius: lotusThemeTokens.radius.control,
    },
    typography: {
      fontFamily: lotusThemeTokens.font.ui,
      h1: {
        fontFamily: lotusThemeTokens.font.display,
        fontWeight: 600,
        letterSpacing: "-0.03em",
      },
      h2: {
        fontFamily: lotusThemeTokens.font.display,
        fontWeight: 600,
        letterSpacing: "-0.02em",
      },
      h3: {
        fontFamily: lotusThemeTokens.font.display,
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
            color: lotusThemeTokens.color.text,
            backgroundColor: lotusThemeTokens.color.bg,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderRadius: lotusThemeTokens.radius.panel,
            border: `1px solid ${lotusThemeTokens.color.border}`,
            boxShadow: "0 16px 32px rgba(16, 40, 51, 0.06)",
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
