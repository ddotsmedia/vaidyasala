import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Web unit tests (structural JSON-LD validation, §7.1 exit check). `server-only`
 * is aliased to an empty module so the pure SEO builders import cleanly under
 * the node test environment.
 */
export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./test/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "test/**/*.test.ts"],
  },
});
