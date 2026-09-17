import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    restoreMocks: true,
    projects: [
      {
        extends: true,
        resolve: { alias: { src: source("./packages/react-centrifugo/src") } },
        test: {
          name: "react-centrifugo",
          include: ["packages/react-centrifugo/src/**/*.test.{ts,tsx}"],
        },
      },
      {
        extends: true,
        resolve: { alias: { src: source("./examples/expo/src") } },
        test: {
          name: "expo",
          include: ["examples/expo/src/**/*.test.ts"],
        },
      },
    ],
  },
});
