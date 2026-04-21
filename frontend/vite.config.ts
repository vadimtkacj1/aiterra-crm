import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

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
