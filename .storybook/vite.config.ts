import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Isolated component tooling: never import deployment config or load .env.
export default defineConfig({
  plugins: [react()],
  envDir: false,
});
