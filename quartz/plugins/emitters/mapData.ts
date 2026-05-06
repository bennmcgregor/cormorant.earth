import sharp from "sharp"
import path from "path"
import { promises as fsp, statSync } from "fs"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { FullSlug, FilePath } from "../../util/path"
import { BuildCtx } from "../../util/ctx"
import { Node as UnistNode } from "unist"
import { QuartzPluginData } from "../vfile"
import { imageSize } from "image-size"
import { readFileSync } from "fs"
import { MAP_TILE_MAX_WIDTH } from "../../util/imageSizes"
import { execFileSync } from "child_process"
// @ts-ignore
import ffprobeStatic from "ffprobe-static"

const FFPROBE = ffprobeStatic.path

type MapItem = {
    id: string
    position: { x: number; y: number; z: number }
    image: string
    video?: string
    width: number
    height: number
    title: string
    href: string
}

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v)$/i

function isVideoPath(p: string): boolean {
    return VIDEO_EXT_RE.test(p)
}

function videoPosterPath(p: string): string {
    return p.replace(VIDEO_EXT_RE, ".map.poster.webp")
}

function videoCompressedPath(p: string): string {
    return p.replace(VIDEO_EXT_RE, ".map.web.mp4")
}

function toMapWebp(url: string): string {
    if (/\.(jpe?g|png)$/i.test(url)) {
        return url.replace(/\.(jpe?g|png)$/i, ".map.webp")
    }
    // Animated .webp passes through unchanged (Tier 5 will handle).
    return url
}

function computeMapTileDims(
    contentDir: string,
    mapImageRel: string,
): { width: number; height: number } {
    const fullPath = path.join(contentDir, mapImageRel)
    try {
        if (VIDEO_EXT_RE.test(mapImageRel)) {
            // Use ffprobe for video dimensions
            const out = execFileSync(
                FFPROBE,
                [
                    "-v", "error",
                    "-select_streams", "v:0",
                    "-show_entries", "stream=width,height",
                    "-of", "csv=p=0:s=x",
                    fullPath,
                ],
                { encoding: "utf-8" },
            ).trim()
            const [wStr, hStr] = out.split("x")
            const width = parseInt(wStr, 10)
            const height = parseInt(hStr, 10)
            if (!width || !height) return { width: 0, height: 0 }
            // Apply same MAP_TILE_MAX_WIDTH cap as images
            if (width > MAP_TILE_MAX_WIDTH) {
                return {
                    width: MAP_TILE_MAX_WIDTH,
                    height: Math.round((height * MAP_TILE_MAX_WIDTH) / width),
                }
            }
            return { width, height }
        }
        const { width, height } = imageSize(readFileSync(fullPath))
        if (!width || !height) return { width: 0, height: 0 }
        // Mirror the resize math used by imageOptimizer for the .map.webp variant.
        if (width > MAP_TILE_MAX_WIDTH) {
            return {
                width: MAP_TILE_MAX_WIDTH,
                height: Math.round((height * MAP_TILE_MAX_WIDTH) / width),
            }
        }
        return { width, height }
    } catch {
        return { width: 0, height: 0 }
    }
}

// ---- Strict frontmatter validation ----

function fail(slug: string, msg: string): never {
    throw new Error(`[mapData] ${slug}: ${msg}`)
}

function readBoolField(fm: any, key: string, slug: string): boolean {
    const v = fm[key]
    if (v === undefined || v === null) return false
    if (typeof v !== "boolean") {
        fail(
            slug,
            `'${key}' must be a boolean (got ${typeof v}: ${JSON.stringify(v)}). ` +
                `In Obsidian, set the property type to Checkbox.`,
        )
    }
    return v
}

function readIntField(fm: any, key: string, slug: string): number {
    const v = fm[key]
    if (v === undefined || v === null) return 0
    if (typeof v !== "number" || !Number.isInteger(v)) {
        fail(
            slug,
            `'${key}' must be an integer (got ${typeof v}: ${JSON.stringify(v)}). ` +
                `In Obsidian, set the property type to Number.`,
        )
    }
    return v
}

function readMapImagePath(fm: any, slug: string, contentDir: string): string | null {
    const v = fm.map_image
    if (v === undefined || v === null) return null
    if (typeof v !== "string") {
        fail(slug, `'map_image' must be a string (got ${typeof v})`)
    }
    let trimmed = v.trim()
    if (!trimmed) return null
    if (trimmed.startsWith("./")) {
        fail(
            slug,
            `'map_image' must NOT be page-relative (got '${trimmed}'). ` +
                `Use vault-root-relative, e.g. 'materials/foo/bar.jpg'.`,
        )
    }
    // Tolerate leading slash; normalize to no-slash form.
    trimmed = trimmed.replace(/^\/+/, "")

    // Existence check — catches typos and wrong paths.
    const fullPath = path.join(contentDir, trimmed)
    try {
        if (!statSync(fullPath).isFile()) {
            fail(slug, `'map_image' must point to a file (got '${trimmed}', which is not a file)`)
        }
    } catch {
        fail(slug, `'map_image' (${trimmed}) does not exist in content/. Check the path.`)
    }
    return trimmed
}

async function* emitMapData(
    ctx: BuildCtx,
    content: [UnistNode, { data: QuartzPluginData }][],
): AsyncGenerator<FilePath> {
    const contentDir = ctx.argv.directory
    const items: MapItem[] = []
    for (const [, file] of content) {
        const fm = (file as any).data?.rawFrontmatter
        if (!fm) continue
        const slug = (file as any).data.slug as string

        if (!readBoolField(fm, "map", slug)) continue

        const image = readMapImagePath(fm, slug, contentDir)
        if (!image) continue

        const dims = computeMapTileDims(contentDir, image)
        const isVideo = isVideoPath(image)
        items.push({
            id: slug,
            position: {
                x: readIntField(fm, "map_x", slug),
                y: readIntField(fm, "map_y", slug),
                z: readIntField(fm, "map_z", slug),
            },
            image: isVideo ? "/" + videoPosterPath(image) : toMapWebp("/" + image),
            ...(isVideo && { video: "/" + videoCompressedPath(image) }),
            width: dims.width,
            height: dims.height,
            title: typeof fm.title === "string" ? fm.title : slug,
            href: "/" + slug,
        })
    }
    yield write({
        ctx,
        content: JSON.stringify(items, null, 2),
        slug: "mapdata" as FullSlug,
        ext: ".json",
    })
}

export const MapData: QuartzEmitterPlugin = () => ({
    name: "MapData",
    getQuartzComponents: () => [],
    emit: emitMapData,
    partialEmit: emitMapData,
})
