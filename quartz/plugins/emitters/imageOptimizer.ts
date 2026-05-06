import sharp from "sharp"
import path from "path"
import { promises as fs } from "fs"
import { QuartzEmitterPlugin } from "../types"
import { FilePath } from "../../util/path"
import {
    CONTENT_MAX_WIDTH,
    MAP_TILE_MAX_WIDTH,
    WEBP_QUALITY,
    VIDEO_CRF,
    VIDEO_FPS,
} from "../../util/imageSizes"
import { execFileSync } from "child_process"
import ffmpegPath from "ffmpeg-static"

const VIDEO_EXTS = [".mp4", ".webm", ".mov", ".m4v"]

const CONVERTABLE_EXTS = [".jpg", ".jpeg", ".png"]
const CACHE_DIR = path.join(process.cwd(), ".cache/image-optimizer")

const FFMPEG = ffmpegPath as string

async function walk(dir: string): Promise<string[]> {
    const out: string[] = []
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
        if (e.name.startsWith(".")) continue
        const full = path.join(dir, e.name)
        if (e.isDirectory()) out.push(...(await walk(full)))
        else if (e.isFile()) {
            const ext = path.extname(e.name).toLowerCase()
            if (CONVERTABLE_EXTS.includes(ext) || VIDEO_EXTS.includes(ext)) {
                out.push(full)
            }
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

async function compressVideoIfStale(
    src: string,
    cachePath: string,
    maxWidth: number,
    crf: number,
    fps: number,
) {
    let needs = true
    try {
        const [s, c] = await Promise.all([fs.stat(src), fs.stat(cachePath)])
        if (c.mtimeMs >= s.mtimeMs) needs = false
    } catch {
        // cache miss — compress
    }
    if (!needs) return
    await fs.mkdir(path.dirname(cachePath), { recursive: true })
    try {
        execFileSync(
            FFMPEG,
            [
                "-y",
                "-i", src,
                "-c:v", "libx264",
                "-crf", String(crf),
                "-preset", "slow",
                "-an",
                "-vf", `fps=${fps},scale='min(${maxWidth},iw)':-2:flags=lanczos`,
                "-movflags", "+faststart",
                cachePath,
            ],
            { stdio: ["ignore", "ignore", "inherit"] },
        )
    } catch (err) {
        throw new Error(
            `[imageOptimizer] ffmpeg failed compressing video ${src}. Is ffmpeg installed and on PATH? (${err})`,
        )
    }
}

async function extractPosterIfStale(
    src: string,
    cachePath: string,
    maxWidth: number,
) {
    let needs = true
    try {
        const [s, c] = await Promise.all([fs.stat(src), fs.stat(cachePath)])
        if (c.mtimeMs >= s.mtimeMs) needs = false
    } catch {
        // cache miss — extract
    }
    if (!needs) return
    await fs.mkdir(path.dirname(cachePath), { recursive: true })

    // ffmpeg extracts the first frame as PNG to stdout. Then sharp resizes
    // and encodes WebP. Avoids the "ffmpeg webp encoder disabled" issue
    // that affects Homebrew/most-distro ffmpeg builds.
    let pngBuffer: Buffer
    try {
        pngBuffer = execFileSync(
            FFMPEG,
            [
                "-y",
                "-i", src,
                "-frames:v", "1",
                "-f", "image2pipe",
                "-vcodec", "png",
                "-",
            ],
            {
                stdio: ["ignore", "pipe", "inherit"],
                maxBuffer: 64 * 1024 * 1024, // 64MB — generous for 4K source frames
            },
        )
    } catch (err) {
        throw new Error(
            `[imageOptimizer] ffmpeg failed extracting frame from ${src}. (${err})`,
        )
    }

    await sharp(pngBuffer)
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(cachePath)
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
        const ext = path.extname(src).toLowerCase()
        const rel = path.relative(srcRoot, src)

        if (CONVERTABLE_EXTS.includes(ext)) {
            // Content variant — every image
            const contentRel = rel.replace(/\.(jpe?g|png)$/i, ".webp")
            yield await emitVariant(src, rel, contentRel, CONTENT_MAX_WIDTH, dstRoot)

            // Map variant — only for images used as map_image
            if (mapImages.has(rel)) {
                const mapRel = rel.replace(/\.(jpe?g|png)$/i, ".map.webp")
                yield await emitVariant(src, rel, mapRel, MAP_TILE_MAX_WIDTH, dstRoot)
            }
        } else if (VIDEO_EXTS.includes(ext)) {
            const baseRel = rel.replace(/\.(mp4|webm|mov|m4v)$/i, "")

            // Content variant — every video
            const cVid = `${baseRel}.web.mp4`
            const cVidCache = path.join(CACHE_DIR, `${baseRel}.web.w${CONTENT_MAX_WIDTH}.crf${VIDEO_CRF}.mp4`)
            const cVidDst = path.join(dstRoot, cVid)
            await compressVideoIfStale(src, cVidCache, CONTENT_MAX_WIDTH, VIDEO_CRF, VIDEO_FPS)
            await fs.mkdir(path.dirname(cVidDst), { recursive: true })
            await fs.copyFile(cVidCache, cVidDst)
            yield cVidDst as FilePath

            const cPos = `${baseRel}.poster.webp`
            const cPosCache = path.join(CACHE_DIR, `${baseRel}.poster.w${CONTENT_MAX_WIDTH}.webp`)
            const cPosDst = path.join(dstRoot, cPos)
            await extractPosterIfStale(cVidCache, cPosCache, CONTENT_MAX_WIDTH)
            await fs.mkdir(path.dirname(cPosDst), { recursive: true })
            await fs.copyFile(cPosCache, cPosDst)
            yield cPosDst as FilePath

            // Map variant — only for map_image videos
            if (mapImages.has(rel)) {
                const mVid = `${baseRel}.map.web.mp4`
                const mVidCache = path.join(CACHE_DIR, `${baseRel}.map.web.w${MAP_TILE_MAX_WIDTH}.crf${VIDEO_CRF}.mp4`)
                const mVidDst = path.join(dstRoot, mVid)
                await compressVideoIfStale(src, mVidCache, MAP_TILE_MAX_WIDTH, VIDEO_CRF, VIDEO_FPS)
                await fs.mkdir(path.dirname(mVidDst), { recursive: true })
                await fs.copyFile(mVidCache, mVidDst)
                yield mVidDst as FilePath

                const mPos = `${baseRel}.map.poster.webp`
                const mPosCache = path.join(CACHE_DIR, `${baseRel}.map.poster.w${MAP_TILE_MAX_WIDTH}.webp`)
                const mPosDst = path.join(dstRoot, mPos)
                await extractPosterIfStale(mVidCache, mPosCache, MAP_TILE_MAX_WIDTH)
                await fs.mkdir(path.dirname(mPosDst), { recursive: true })
                await fs.copyFile(mPosCache, mPosDst)
                yield mPosDst as FilePath
            }
        }
    }
}

export const ImageOptimizer: QuartzEmitterPlugin = () => ({
    name: "ImageOptimizer",
    getQuartzComponents: () => [],
    emit: emitWebp,
    partialEmit: emitWebp,
})
