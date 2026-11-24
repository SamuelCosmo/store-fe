import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    // localStorage/location existen en jsdom — lib/ es "use client" por diseño
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
});
