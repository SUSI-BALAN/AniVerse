import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // PostgreSQL suites install the same auth roles/functions in the isolated database.
    fileParallelism: false,
    clearMocks: true
  }
});
