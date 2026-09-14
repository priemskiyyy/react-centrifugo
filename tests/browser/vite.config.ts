import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL("./app", import.meta.url)),
  resolve: {
    alias: {
      "react-centrifugo/devtools": fileURLToPath(
        new URL(
          "../../packages/react-centrifugo/dist/devtools.js",
          import.meta.url,
        ),
      ),
      "react-centrifugo-devtools": fileURLToPath(
        new URL("../../packages/devtools/dist/index.js", import.meta.url),
      ),
      "react-centrifugo": fileURLToPath(
        new URL(
          "../../packages/react-centrifugo/dist/index.js",
          import.meta.url,
        ),
      ),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: {
      "/connection": { target: "http://127.0.0.1:4175", ws: true },
      "/test-api": {
        target: "http://127.0.0.1:4174",
        rewrite: (url) => url.replace(/^\/test-api/, ""),
      },
    },
  },
});
