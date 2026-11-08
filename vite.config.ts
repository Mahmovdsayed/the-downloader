import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "node:path";

// Ensure Electron launches in desktop app mode even if launched from IDE terminals where ELECTRON_RUN_AS_NODE is set
delete process.env.ELECTRON_RUN_AS_NODE;

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: path.resolve(__dirname, "src/main/index.ts"),
        vite: {
          build: {
            outDir: path.resolve(__dirname, "dist-electron/main"),
          },
        },
      },
      preload: {
        input: path.resolve(__dirname, "src/preload/index.ts"),
        vite: {
          build: {
            outDir: path.resolve(__dirname, "dist-electron/preload"),
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/renderer/src"),
      "@shared": path.resolve(__dirname, "./src/shared"),
    },
  },
  root: path.resolve(__dirname, "src/renderer"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
