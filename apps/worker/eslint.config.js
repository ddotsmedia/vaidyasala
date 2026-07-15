import base from "@vaidyasala/config/eslint";

/** apps/worker never imports from apps/web (§3). */
export default [
  ...base,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@vaidyasala/web", "@vaidyasala/web/*"] }] },
      ],
    },
  },
];
