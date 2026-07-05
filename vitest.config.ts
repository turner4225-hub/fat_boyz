import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure logic tests (src/lib) — no DOM needed.
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
