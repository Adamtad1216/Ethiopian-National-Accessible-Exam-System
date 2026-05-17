import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("react-router")
          ) {
            return "react-vendor";
          }

          if (id.includes("framer-motion") || id.includes("@tanstack")) {
            return "app-vendor";
          }

          if (id.includes("xlsx") || id.includes("recharts")) {
            return "data-vendor";
          }

          if (id.includes("@radix-ui") || id.includes("lucide-react")) {
            return "ui-vendor";
          }

          return "vendor";
        },
      },
    },
  },
}));
