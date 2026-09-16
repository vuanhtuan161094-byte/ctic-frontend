import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

const hookRules =
  reactHooks.configs?.flat?.["recommended-latest"]?.rules ??
  reactHooks.configs?.flat?.recommended?.rules ??
  reactHooks.configs?.recommended?.rules ??
  {};

export default defineConfig([
  globalIgnores(["node_modules/**", "dist/**", "storybook-static/**", "e2e/node_modules/**", "e2e/playwright-report/**", "e2e/test-results/**"]),
  js.configs.recommended,
  {
    files: [
      "src/**/*.{ts,tsx}",
      "app/components/**/*.{ts,tsx}",
      "app/lib/**/*.ts",
      "app/types/**/*.ts",
      "vite.ctic.config.ts",
      ".storybook/**/*.{ts,tsx}",
      "stories/**/*.tsx",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      ...hookRules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["tests/**/*.mjs", "scripts/**/*.mjs", "eslint.config.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    files: ["e2e/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
  },
]);
