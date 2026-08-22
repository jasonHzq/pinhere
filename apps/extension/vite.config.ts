import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "node:path";
import { copyFileSync } from "node:fs";

export default defineConfig(({ mode }) => {
  const safari = mode === "safari";
  const outDir = safari ? "dist-safari" : "dist";
  return {
    plugins: [
      tailwindcss(),
      react(),
      {
        name: "pinhere-browser-manifest",
        closeBundle() {
          copyFileSync(resolve(import.meta.dirname, "manifests", safari ? "safari.json" : "chrome.json"), resolve(import.meta.dirname, outDir, "manifest.json"));
        }
      }
    ],
    resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(import.meta.dirname, "popup.html"),
          background: resolve(import.meta.dirname, "src/background.ts")
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]"
        }
      }
    }
  };
});
