import sharp from "sharp"
import path from "path"
import { promises as fs } from "fs"
import { QuartzEmitterPlugin } from "../types"
import { FilePath } from "../../util/path"

const CONVERTABLE_EXTS = [".jpg", ".jpeg", ".png"]
const QUALITY = 85
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

async function* emitWebp(ctx: any): AsyncGenerator<FilePath> {
    const srcRoot = ctx.argv.directory
    const dstRoot = ctx.argv.output
    const files = await walk(srcRoot)

    for (const src of files) {
        const rel = path.relative(srcRoot, src)
        const dstRel = rel.replace(/\.(jpe?g|png)$/i, ".webp")
        const cachePath = path.join(CACHE_DIR, dstRel)
        const dst = path.join(dstRoot, dstRel)

        // Re-encode only if cache is missing or stale
        let needsEncode = true
        try {
            const [srcStat, cacheStat] = await Promise.all([fs.stat(src), fs.stat(cachePath)])
            if (cacheStat.mtimeMs >= srcStat.mtimeMs) needsEncode = false
        } catch {
        // cache miss — encode
        }

        if (needsEncode) {
            await fs.mkdir(path.dirname(cachePath), { recursive: true })
            await sharp(src).rotate().webp({ quality: QUALITY }).toFile(cachePath)
        }

        // Always copy cache → public/ (fast) and yield
        await fs.mkdir(path.dirname(dst), { recursive: true })
        await fs.copyFile(cachePath, dst)
        yield dst as FilePath
    }
}

export const ImageOptimizer: QuartzEmitterPlugin = () => ({
    name: "ImageOptimizer",
    getQuartzComponents: () => [],
    emit: emitWebp,
    partialEmit: emitWebp,
})