import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      all: true,
      include: [
        "src/app/top-nav.tsx",
        "src/app/portfolios/page.tsx",
        "src/apps/home/page.tsx",
        "src/apps/portfolio/page.tsx",
        "src/apps/performance/page.tsx",
        "src/apps/recommendations/page.tsx",
        "src/apps/portfolio/modules/portfolio-health/portfolio-health-strip.tsx",
        "src/design-system/index.ts",
        "src/design-system/theme/mui-theme.ts",
        "src/design-system/theme/tokens.ts",
        "src/design-system/utils/ag-grid-modules.ts",
        "src/design-system/utils/cx.ts",
        "src/design-system/components/context-card.tsx",
        "src/design-system/components/data-grid-card.tsx",
        "src/design-system/components/insight-callout.tsx",
        "src/design-system/components/metric-row.tsx",
        "src/design-system/components/module-skeleton.tsx",
        "src/design-system/components/page-toolbar.tsx",
        "src/design-system/components/panel.tsx",
        "src/design-system/components/readiness-indicator.tsx",
        "src/design-system/components/section-label.tsx",
        "src/design-system/components/state-info-hint.tsx",
        "src/design-system/components/status-chip.tsx",
        "src/design-system/components/workspace-layout.tsx",
      ],
      exclude: [
        "tests/**",
        "**/*.d.ts",
        "**/*.config.*",
        ".next/**",
        "coverage/**",
        "node_modules/**",
      ],
      thresholds: {
        lines: 99,
        statements: 99,
        functions: 99,
        branches: 95,
      },
    },
  },
});
