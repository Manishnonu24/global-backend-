import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Third-party vendored libraries in public/ must never be linted
    "public/**",
    // Dev/scratch scripts
    "scratch/**",
    "scripts/**",
  ]),
  {
    rules: {
      // React Compiler strict-mode rules — downgraded to warnings because these
      // patterns are pervasive throughout the existing codebase and do not cause
      // runtime bugs under the current Next.js render model.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/static-components": "warn",
      // Unescaped entity literals in JSX — downgrade to warn; prefer fixing
      // incrementally rather than blocking CI on existing content files.
      "react/no-unescaped-entities": "warn",
      // jsx-no-comment-textnodes is a quality-of-life rule, not a bug
      "react/jsx-no-comment-textnodes": "warn",
    },
  },
]);

export default eslintConfig;
