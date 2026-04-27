import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..", "..")
const contentDir = path.resolve(repoRoot, "content")

export default defineConfig({
    plugins: [react()],
    publicDir: contentDir,
    server: {
        port: 5173,
        fs: {
            // Allow Vite to read the shared module that lives in quartz/components/scripts/
            allow: [repoRoot],
        },
        proxy: {
            "/api": "http://localhost:3002",
        },
    },
})