import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
<<<<<<< HEAD
import { fileURLToPath } from "url";

// These two lines recreate __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
=======
>>>>>>> 023d848cb55d990840adf7b5a461f94e7a41f4e8

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
<<<<<<< HEAD
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
=======
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
>>>>>>> 023d848cb55d990840adf7b5a461f94e7a41f4e8
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
<<<<<<< HEAD
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
=======
    // === FIX: Synchronizing target port to 5000 ===
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // CORRECTED PORT to match Express output
        changeOrigin: true,
        secure: false, 
      },
    },
    // ===========================================
>>>>>>> 023d848cb55d990840adf7b5a461f94e7a41f4e8
  },
});
