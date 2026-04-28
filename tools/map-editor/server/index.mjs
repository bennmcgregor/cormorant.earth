import express from "express"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import { spawn } from "child_process"
import matter from "gray-matter"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..")

// Vault path. Override with VAULT_PUBLISH_DIR env var if your layout differs.
const VAULT_PUBLISH_DIR = process.env.VAULT_PUBLISH_DIR ?? path.join(
    os.homedir(),
    "Documents/Zettelkasten/cormorant.earth",
)
const PUBLISH_SCRIPT = path.join(REPO_ROOT, "publish.py")
const PORT = 3002

const app = express()
app.use(express.json())

app.get("/api/map", async (_req, res) => {
    try {
        res.json(await collectMapNotes())
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: String(err) })
    }
})

app.patch("/api/map/:id", async (req, res) => {
    try {
        const { position } = req.body
        if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
            return res.status(400).json({ error: "position {x,y} required" })
        }
        await updatePosition(req.params.id, position)
        runPublish()
        res.json({ ok: true })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: String(err) })
    }
})

async function collectMapNotes() {
    const items = []
    const files = await walkMd(VAULT_PUBLISH_DIR)
    for (const file of files) {
        const raw = await fs.readFile(file, "utf-8")
        const { data: fm } = matter(raw)

        // Drafts/unpublished notes don't make it to the live site, so skip them in the editor too
        if (String(fm.publish).toLowerCase() === "false") continue

        const mapFlag = fm.map
        const isOnMap =
        mapFlag === true || mapFlag === "true" || mapFlag === 1 || mapFlag === "1"
        if (!isOnMap) continue

        const image = String(fm.map_image ?? "").trim()
        if (!image) continue

        const slug = path
            .relative(VAULT_PUBLISH_DIR, file)
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
        if (e.name.startsWith(".")) continue
        const full = path.join(dir, e.name)
        if (e.isDirectory()) out.push(...(await walkMd(full)))
        else if (e.isFile() && e.name.endsWith(".md")) out.push(full)
    }
    return out
}

async function updatePosition(slug, position) {
    const file = path.join(VAULT_PUBLISH_DIR, ...slug.split("/")) + ".md"
    const raw = await fs.readFile(file, "utf-8")
    const parsed = matter(raw)
    parsed.data.map_x = Math.round(position.x)
    parsed.data.map_y = Math.round(position.y)
    await fs.writeFile(file, matter.stringify(parsed.content, parsed.data), "utf-8")
}

// Spawn publish.py after a vault write. Coalesces rapid drags into one publish run.
let publishInFlight = false
let publishQueued = false
function runPublish() {
    if (publishInFlight) {
        publishQueued = true
        return
    }
    publishInFlight = true
    const proc = spawn("python3", [PUBLISH_SCRIPT, "--yes"], {
        cwd: REPO_ROOT,
        stdio: ["ignore", "inherit", "inherit"],
    })
    proc.on("close", () => {
        publishInFlight = false
        if (publishQueued) {
            publishQueued = false
            runPublish()
        }
    })
}

app.listen(PORT, () => console.log(`Map editor API on :${PORT}`))