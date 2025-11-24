import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dev-dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn", // Changed from error to warning
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "react-hooks/exhaustive-deps": "warn", // Changed to warning
      "no-empty": "warn",
      "no-useless-escape": "warn",
      "no-prototype-builtins": "warn",
      "no-case-declarations": "warn",
      "react-hooks/rules-of-hooks": "error", // Keep this as error
    },
  },
  // Relaxed rules for test files, utility libs, and edge functions
  {
    files: [
      "**/*.test.{ts,tsx}", 
      "**/*.spec.{ts,tsx}", 
      "**/tests/**/*.{ts,tsx}", 
      "**/test/**/*.{ts,tsx}",
      "**/src/pages/Test*.tsx",
      "**/src/pages/AuthTest.tsx",
      "**/src/pages/SupabaseTest.tsx",
      "**/src/pages/Admin.tsx",
      "**/src/lib/**/*.ts",
      "**/src/lib/**/*.tsx",
      "**/supabase/functions/**/*.ts",
      "**/scripts/**/*.ts",
      "**/tailwind.config.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react-hooks/exhaustive-deps": "off",
      "no-empty": "off",
      "prefer-const": "off",
      "no-useless-escape": "off",
    },
  },
);
