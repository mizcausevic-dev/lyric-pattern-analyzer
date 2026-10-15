import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"

export default defineConfig({
  root: "src/preview",
  base: "./",
  publicDir: resolve("src/preview/public"),
  plugins: [react()],
  build: {
    outDir: resolve("preview-dist"),
    emptyOutDir: true
  }
})
