import matter from "gray-matter"
import { readFileSync } from "fs"
import { QuartzTransformerPlugin } from "../types"

declare module "vfile" {
    interface DataMap {
        rawFrontmatter?: Record<string, unknown>
    }
}

export const RawFrontmatter: QuartzTransformerPlugin = () => ({
    name: "RawFrontmatter",
    markdownPlugins() {
        return [
        () => (_tree, file) => {
            const filePath = (file.history?.[0] ?? file.path) as string | undefined
            if (!filePath) return
            try {
                const raw = readFileSync(filePath, "utf-8")
                file.data.rawFrontmatter = matter(raw).data
            } catch {
                // file may not exist on disk during partial-emit flows; skip silently
            }
        },
        ]
    },
})