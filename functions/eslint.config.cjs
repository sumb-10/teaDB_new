// functions/eslint.config.cjs
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const globals = require("globals");

module.exports = [
  { ignores: ["dist/**", "lib/**", "node_modules/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended, // TS 권장(빠르고 type-aware 아님)

  {
    files: ["**/*.{ts,js}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      // 충돌 유발하던 규칙 끔 (필요시 나중에 켜세요)
      "@typescript-eslint/no-unused-expressions": "off",
      "no-unused-expressions": "off",
    },
  },
];
