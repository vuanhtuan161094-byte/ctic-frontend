import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function normalizeHttpUrl(value: string | undefined, name: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`${name} phải là URL http/https hợp lệ.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} chỉ hỗ trợ http:// hoặc https://.`);
  }

  return url;
}

function validateProductionBuildEnvironment(env: Record<string, string>) {
  if (env.VITE_DEPLOYMENT_TARGET?.trim().toLowerCase() !== "production") return;

  for (const name of ["VITE_API_BASE_URL", "VITE_PUBLIC_API_BASE_URL"]) {
    const url = normalizeHttpUrl(env[name], name);
    if (!url) continue; // same-origin deployment is the preferred zero-config production mode.

    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
      throw new Error(`${name} không được trỏ localhost khi VITE_DEPLOYMENT_TARGET=production.`);
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  validateProductionBuildEnvironment(env);

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
    },
    preview: {
      host: "0.0.0.0",
      port: 5173,
    },
    build: {
      sourcemap: false,
    },
  };
});
