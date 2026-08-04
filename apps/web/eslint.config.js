import next from "@vaidyasala/config/eslint/next";

export default [
  // Static assets (service worker etc.) aren't part of the TS app graph.
  { ignores: ["public/**", ".next/**"] },
  ...next,
];
