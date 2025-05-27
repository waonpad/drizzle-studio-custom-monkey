import stylisticJs from "@stylistic/eslint-plugin";
import type { Linter } from "eslint";
import sonarjs from "eslint-plugin-sonarjs";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  // 無視するファイルを指定
  { ignores: ["dist/**"] },
  // 適用するファイルを指定
  { files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"] },
  // @ts-ignore
  tseslint.configs.base,
  {
    plugins: { sonarjs },
    rules: {
      // 即座にreturnする場合は変数に代入せずにreturnするようにする
      // https://github.com/SonarSource/eslint-plugin-sonarjs/blob/master/docs/rules/prefer-immediate-return.md
      "sonarjs/prefer-immediate-return": "error",
    } satisfies Partial<Record<`sonarjs/${keyof typeof sonarjs.rules}`, Linter.RulesRecord[string]>>,
  },
  {
    plugins: { "@stylistic/js": stylisticJs },
    rules: {
      // 空行を挟むルール
      // https://eslint.style/rules/js/padding-line-between-statements
      "@stylistic/js/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "*" },
        // ディレクティブが続く場合は空行を入れない
        { blankLine: "never", prev: "directive", next: "directive" },
        // importが続く場合は空行を入れない
        { blankLine: "never", prev: "import", next: "import" },
        // 変数宣言の間の空行は自由（複数行連続で宣言できる）
        { blankLine: "any", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
      ],
    } satisfies Partial<Record<`@stylistic/js/${keyof typeof stylisticJs.rules}`, Linter.RulesRecord[string]>>,
  },
]);
