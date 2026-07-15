import base from "./base.js";

/**
 * ESLint config for Next.js apps. The Next plugin is applied via the app's own
 * eslint config where the plugin dependency is installed; this layer only adds
 * React-server-safe defaults shared across apps.
 */
export default [
  ...base,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@vaidyasala/db/*/internal"],
              message: "Import the typed client from @vaidyasala/db, not internals.",
            },
          ],
        },
      ],
    },
  },
];
