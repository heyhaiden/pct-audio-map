import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import unusedImports from "eslint-plugin-unused-imports"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      // React Compiler readiness rules (eslint-plugin-react-hooks v6). This app
      // doesn't use the compiler, and the flagged code is deliberate: latest-value
      // refs read in the per-frame scroll/camera loop, and state seeded from
      // sessionStorage or reset on prop changes before paint. Rewriting them
      // shifts timing in the scroll pipeline. Revisit if the compiler is enabled.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
])

export default eslintConfig
