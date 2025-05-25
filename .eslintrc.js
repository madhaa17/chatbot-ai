module.exports = {
  extends: ["next/core-web-vitals"],
  rules: {
    "@typescript-eslint/no-unused-expressions": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  overrides: [
    {
      files: ["**/generated/**/*", "**/prisma/**/*", "**/*.d.ts"],
      extends: ["./.eslintrc.generated.js"],
    },
  ],
};
