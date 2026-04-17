import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["js/modules/products/**/*.js", "js/shared/product-utils.js", "js/shared/chart-colors.js"]
    }
  }
});
