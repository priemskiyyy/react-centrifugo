import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    restoreMocks: true,
    projects: ["react-centrifugo", "codegen", "devtools"].map((name) => ({
      extends: true,
      resolve: {
        alias: {
          src: fileURLToPath(
            new URL(`./packages/${name}/src`, import.meta.url),
          ),
        },
      },
      test: { name, include: [`packages/${name}/src/**/*.test.{ts,tsx}`] },
    })),
  },
});
