import sharp from "sharp"
import path from "path"
import { promises as fs } from "fs"
import { QuartzEmitterPlugin } from "../types"
import { FilePath } from "../../util/path"
import {
    CONTENT_MAX_WIDTH,
    MAP_TILE_MAX_WIDTH,
    WEBP_QUALITY,
} from "../../util/imageSizes"

const CONVERTABLE_EXTS = [".jpg", ".jpeg", ".png"]
const CACHE_DIR = path.join(process.cwd(), ".cache/image-optimizer")

async function walk(dir: string): Promise<string[]> {
    const out: string[] = []
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
        if (e.name.startsWith(".")) continue
        const full = path.join(dir, e.name)
        if (e.isDirectory()) out.push(...(await walk(full)))
        else if (e.isFile() && CONVERTABLE_EXTS.includes(path.extname(e.name).toLowerCase())) {
            out.push(full)
        }
    }
    return out
}

// Reads frontmatter map_image references via the rawFrontmatter transformer's
// data, which has already populated file.data.rawFrontmatter by the time the
// emitter runs. Returns vault-relative paths matching what walk() yields.
function collectMapImages(content: any[]): Set<string> {
    const set = new Set<string>()
    for (const [, file] of content) {
        const fm = file?.data?.rawFrontmatter
        if (!fm) continue
        const mp = fm.map_image
        if (typeof mp !== "string") continue
        const raw = mp.trim()
        if (!raw) continue
        // map_image is treated as vault-root-relative (matches mapData.ts).
        set.add(raw.replace(/^\/+/, ""))
    }
    return set
}

// Cache filename embeds the encode width so changing constants invalidates
// the cache automatically. Output filename stays clean.
function cacheNameFor(rel: string, width: number): string {
    return rel.replace(/\.(jpe?g|png)$/i, `.w${width}.webp`)
}

async function encodeIfStale(src: string, cachePath: string, maxWidth: number) {
    let needsEncode = true
    try {
        const [srcStat, cacheStat] = await Promise.all([fs.stat(src), fs.stat(cachePath)])
        if (cacheStat.mtimeMs >= srcStat.mtimeMs) needsEncode = false
    } catch {
        // cache miss — encode
    }
    if (!needsEncode) return
    await fs.mkdir(path.dirname(cachePath), { recursive: true })
    await sharp(src)
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(cachePath)
}

async function emitVariant(
    src: string,
    rel: string,
    dstRel: string,
    width: number,
    dstRoot: string,
): Promise<FilePath> {
    const cachePath = path.join(CACHE_DIR, cacheNameFor(rel, width))
    const dst = path.join(dstRoot, dstRel)
    await encodeIfStale(src, cachePath, width)
    await fs.mkdir(path.dirname(dst), { recursive: true })
    await fs.copyFile(cachePath, dst)
    return dst as FilePath
}

async function* emitWebp(ctx: any, content: any[] = []): AsyncGenerator<FilePath> {
    const srcRoot = ctx.argv.directory
    const dstRoot = ctx.argv.output
    const files = await walk(srcRoot)
    const mapImages = collectMapImages(content)

    for (const src of files) {
        const rel = path.relative(srcRoot, src)

        // Content variant — every image
        const contentRel = rel.replace(/\.(jpe?g|png)$/i, ".webp")
        yield await emitVariant(src, rel, contentRel, CONTENT_MAX_WIDTH, dstRoot)

        // Map variant — only for images used as map_image
        if (mapImages.has(rel)) {
            const mapRel = rel.replace(/\.(jpe?g|png)$/i, ".map.webp")
            yield await emitVariant(src, rel, mapRel, MAP_TILE_MAX_WIDTH, dstRoot)
        }
    }
}

export const ImageOptimizer: QuartzEmitterPlugin = () => ({
    name: "ImageOptimizer",
    getQuartzComponents: () => [],
    emit: emitWebp,
    partialEmit: emitWebp,
})
