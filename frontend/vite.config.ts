import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        "@animate-ui/react/primitives/texts/counting-number": path.resolve(
          __dirname,
          "./src/components/animate-ui/texts/counting-number.tsx"
        ),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: false,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8080",
          changeOrigin: true,
        },
      },
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
