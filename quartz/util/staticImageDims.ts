import { imageSize } from "image-size"
import { readFileSync, existsSync } from "fs"
import path from "path"

// Static images may live in either content/ (vault-copied) or quartz/static/
// (Quartz-shipped). Try both.
const ROOTS = [
    path.join(process.cwd(), "content"),
    path.join(process.cwd(), "quartz"),
]

const cache = new Map<string, { width: number; height: number }>()

/**
 * Read intrinsic dimensions of a static image at build time.
 * Pass the URL-style path (e.g. "static/text-logo.png" or "/static/foo.svg").
 * Returns {0, 0} if the file isn’t found or unreadable.
 */
export function getStaticImageDims(relPath: string): { width: number; height: number } {
    const key = relPath.replace(/^\/+/, "")
    if (cache.has(key)) return cache.get(key)!
    let result = { width: 0, height: 0 }
    for (const root of ROOTS) {
        const full = path.join(root, key)
        if (!existsSync(full)) continue
        try {
            const { width, height } = imageSize(readFileSync(full))
            if (width && height) {
                result = { width, height }
                break
            }
        } catch {
            // try next root
        }
    }
    cache.set(key, result)
    return result
}
