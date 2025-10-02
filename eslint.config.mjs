import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const importPlugin = await import("eslint-plugin-import");
const simpleImportSortPlugin = await import("eslint-plugin-simple-import-sort");

const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:prettier/recommended",
  ),
  {
    plugins: {
      import: importPlugin.default,
      "simple-import-sort": simpleImportSortPlugin.default,
    },
    rules: {
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "import/order": [
        "warn",
        {
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
          ],
          "newlines-between": "always",
        },
      ],
      "prettier/prettier": [
        "warn",
        {
          trailingComma: "es5",
          bracketSpacing: true,
          bracketSameLine: false,
          singleQuote: true,
          quoteProps: "as-needed",
          arrowParens: "always",
          useTabs: false,
          tabWidth: 4,
          printWidth: 100,
          semi: true,
          requirePragma: false,
          insertPragma: false,
          proseWrap: "preserve",
          endOfLine: "lf",
          jsxSingleQuote: false,
          singleAttributePerLine: false,
          htmlWhitespaceSensitivity: "css",
          embeddedLanguageFormatting: "auto",
        },
      ],
    },
  },
];

export default eslintConfig;
