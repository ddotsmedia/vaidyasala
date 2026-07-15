import base from "@vaidyasala/config/eslint";

/** packages/core must never import React (§3). */
export default [
  ...base,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "packages/core must never import React (§3)." },
            { name: "react-dom", message: "packages/core must never import React (§3)." },
          ],
          patterns: [{ group: ["react", "react-dom", "next", "next/*"] }],
        },
      ],
    },
  },
];
