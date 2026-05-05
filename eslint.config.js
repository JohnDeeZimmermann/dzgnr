import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { importX } from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import sonarjs from "eslint-plugin-sonarjs";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
        }),
      ],
    },
  },
  {
    files: ["src/**/*.ts"],
    ignores: ["src/__tests__/**"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",

      "complexity": ["error", { max: 10 }],
      "sonarjs/cognitive-complexity": ["error", 15],

      "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
      "max-params": ["warn", { max: 4, countThis: "except-void" }],
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],

      "import-x/no-cycle": ["error", { maxDepth: 10, ignoreExternal: true }],
      "import-x/max-dependencies": ["warn", { max: 10, ignoreTypeImports: true }],
      "import-x/no-self-import": "error",

      "sonarjs/no-os-command-from-path": "off",
    },
  },
  {
    files: ["src/__tests__/**/*.ts"],
    rules: {
      "complexity": "off",
      "sonarjs/cognitive-complexity": "off",
      "max-lines-per-function": "off",
      "max-lines": "off",
      "max-params": "off",
      "import-x/max-dependencies": "off",
      "import-x/no-unresolved": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "sonarjs/no-empty-test-file": "off",
      "sonarjs/no-nested-functions": "off",
      "sonarjs/no-nested-template-literals": "off",
      "sonarjs/publicly-writable-directories": "off",
    },
  },
  {
    ignores: ["node_modules/", "bun.lock", "dist/"],
  }
);
