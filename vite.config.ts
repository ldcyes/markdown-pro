import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolveViteBase } from "./src/build/viteBase.js";

export default defineConfig({
  base: resolveViteBase(),
  plugins: [react()],
});
