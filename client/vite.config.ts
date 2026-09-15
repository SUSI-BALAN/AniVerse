import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  define: { __APP_BUILD_ID__: JSON.stringify(process.env.BUILD_ID ?? process.env.COMMIT_REF ?? 'development') },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET ?? "http://localhost:4000",
        changeOrigin: true
      }
    }
  }
});
