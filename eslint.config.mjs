import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const stableReactHooksRules = {
  "react-hooks/rules-of-hooks":
    reactHooks.configs.recommended.rules["react-hooks/rules-of-hooks"],
  "react-hooks/exhaustive-deps":
    reactHooks.configs.recommended.rules["react-hooks/exhaustive-deps"],
};

export default [
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "node_modules/**",
      "output/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...stableReactHooksRules,
    },
    settings: {
      next: {
        rootDir: ".",
      },
    },
  },
];
