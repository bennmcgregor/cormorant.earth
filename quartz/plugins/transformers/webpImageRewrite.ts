import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"
import path from "path"
import fs from "fs"
import { imageSize } from "image-size"
import { CONTENT_MAX_WIDTH } from "../../util/imageSizes"

const dimsCache = new Map<string, { width: number; height: number } | null>()

function getOutputDims(srcAbs: string, maxWidth: number) {
    const key = srcAbs + ":" + maxWidth
    if (dimsCache.has(key)) return dimsCache.get(key)!
    let result: { width: number; height: number } | null = null
    try {
        const { width, height } = imageSize(fs.readFileSync(srcAbs))
        if (width && height) {
            if (width > maxWidth) {
                result = {
                    width: maxWidth,
                    height: Math.round((height * maxWidth) / width),
                }
            } else {
                result = { width, height }
            }
        }
    } catch {}
    dimsCache.set(key, result)
    return result
}

function normalizeSrc(src: string): string {
    return src.replace(/^(\.?\/)+/, "")
}

function resolveSrcAbs(
    contentDir: string,
    src: string,
    pageSlug: string | undefined,
): string | null {
    const rel = normalizeSrc(src)
    const rootCandidate = path.join(contentDir, rel)
    try {
        if (fs.statSync(rootCandidate).isFile()) return rootCandidate
    } catch {}
    if (pageSlug) {
        const pageDir = path.dirname(pageSlug)
        if (pageDir && pageDir !== ".") {
            const pageCandidate = path.join(contentDir, pageDir, rel)
            try {
                if (fs.statSync(pageCandidate).isFile()) return pageCandidate
            } catch {}
        }
    }
    return null
}

function altHasToken(alt: unknown, token: string): boolean {
    return typeof alt === "string" && alt.split(/\s+/).includes(token)
}

export const WebpImageRewrite: QuartzTransformerPlugin = () => ({
    name: "WebpImageRewrite",
    htmlPlugins(ctx) {
        const contentDir = path.resolve(ctx.argv.directory)
        return [
            () => (tree: any, file: any) => {
                const slug = file?.data?.slug as string | undefined

                visit(tree, "element", (node: any) => {
                    if (node.tagName !== "img") return
                    const origSrc = node.properties?.src
                    if (typeof origSrc !== "string") return
                    if (origSrc.startsWith("http://") || origSrc.startsWith("https://")) return

                    const srcAbs = resolveSrcAbs(contentDir, origSrc, slug)
                    if (srcAbs) {
                        const dims = getOutputDims(srcAbs, CONTENT_MAX_WIDTH)
                        if (dims) {
                            node.properties.width = dims.width
                            node.properties.height = dims.height
                        }
                    }

                    if (/\.(jpe?g|png)$/i.test(origSrc)) {
                        node.properties.src = origSrc.replace(/\.(jpe?g|png)$/i, ".webp")
                    }

                    if (altHasToken(node.properties?.alt, "eager")) {
                        node.properties.loading = "eager"
                        node.properties.fetchpriority = "high"
                    }
                })
            },
        ]
    },
})
