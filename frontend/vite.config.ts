import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  /** Same-origin /api in dev → no CORS preflight hangs. */
  const apiProxy = {
    "/api": {
      target: env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000",
      changeOrigin: true,
    },
  };
  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@/app": path.resolve(__dirname, "src/app"),
        "@/config": path.resolve(__dirname, "src/config"),
        "@/domain": path.resolve(__dirname, "src/domain"),
        "@/infrastructure": path.resolve(__dirname, "src/infrastructure"),
        "@/services": path.resolve(__dirname, "src/services"),
        "@/i18n": path.resolve(__dirname, "src/i18n"),
        "@/ui": path.resolve(__dirname, "src/ui"),
        "@/assets": path.resolve(__dirname, "src/assets"),
      },
    },
    plugins: [react()],
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
  };
});
