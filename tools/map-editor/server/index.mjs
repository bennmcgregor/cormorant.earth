import express from "express"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import matter from "gray-matter"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..")
const CONTENT_DIR = path.join(REPO_ROOT, "content")
const PORT = 3002

const app = express()
app.use(express.json())

app.get("/api/map", async (_req, res) => {
    try {
        const items = await collectMapNotes()
        res.json(items)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: String(err) })
    }
})

app.patch("/api/map/:id", async (req, res) => {
    try {
        const id = req.params.id
        const { position } = req.body
        if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
            return res.status(400).json({ error: "position {x,y} required" })
        }
        await updatePosition(id, position)
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: String(err) })
    }
})

async function collectMapNotes() {
    const items = []
    const files = await walkMd(CONTENT_DIR)
    for (const file of files) {
        const raw = await fs.readFile(file, "utf-8")
        const { data: fm } = matter(raw)
        const mapFlag = fm.map
        const isOnMap =
            mapFlag === true || mapFlag === "true" || mapFlag === 1 || mapFlag === "1"
        if (!isOnMap) continue
        const image = String(fm.map_image ?? "").trim()
        if (!image) continue
        const slug = path
            .relative(CONTENT_DIR, file)
            .replace(/\.md$/, "")
            .split(path.sep)
            .join("/")
        const resolvedImage = image.startsWith("/") ? image : "/" + image
        items.push({
            id: slug,
            position: { 
                x: Number(fm.map_x ?? 0),
                y: Number(fm.map_y ?? 0),
                z: Number(fm.map_z ?? 0),
            },
            image: resolvedImage,
            title: String(fm.title ?? slug),
            href: "/" + slug,
        })
    }
    return items
}

async function walkMd(dir) {
    const out = []
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const e of entries) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) out.push(...(await walkMd(full)))
        else if (e.isFile() && e.name.endsWith(".md")) out.push(full)
    }
    return out
}

async function updatePosition(slug, position) {
    // slug uses forward slashes; convert to OS-native for fs
    const file = path.join(CONTENT_DIR, ...slug.split("/")) + ".md"
    const raw = await fs.readFile(file, "utf-8")
    const parsed = matter(raw)
    parsed.data.map_x = Math.round(position.x)
    parsed.data.map_y = Math.round(position.y)
    const updated = matter.stringify(parsed.content, parsed.data)
    await fs.writeFile(file, updated, "utf-8")
}

app.listen(PORT, () => console.log(`Map editor API on :${PORT}`))