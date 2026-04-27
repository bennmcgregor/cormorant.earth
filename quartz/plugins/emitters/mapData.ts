import matter from "gray-matter"
import { readFileSync } from "fs"
import path from "path"
import { QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"
import { FullSlug, FilePath } from "../../util/path"
import { BuildCtx } from "../../util/ctx"
import { Node as UnistNode } from "unist"
import { QuartzPluginData } from "../vfile"

type MapItem = {
    id: string
    position: { x: number; y: number }
    image: string
    title: string
    href: string
}

async function* emitMapData(
    ctx: BuildCtx,
    content: [UnistNode, { data: QuartzPluginData }][],
): AsyncGenerator<FilePath> {
    const items: MapItem[] = []
    for (const [, file] of content) {
        const filePath = file.data.filePath
        if (!filePath) continue

        let fm: Record<string, unknown>
        try {
            fm = matter(readFileSync(filePath, "utf-8")).data
        } catch {
            continue
        }

        const mapFlag = fm.map
        const isOnMap =
        mapFlag === true || mapFlag === "true" || mapFlag === 1 || mapFlag === "1"
        if (!isOnMap) continue

        const image = String(fm.map_image ?? "").trim()
        if (!image) continue

        const slug = file.data.slug!
        const resolvedImage = image.startsWith("/") ? image : "/" + image

        items.push({
            id: slug,
            position: { x: Number(fm.map_x ?? 0), y: Number(fm.map_y ?? 0) },
            image: resolvedImage,
            title: String(fm.title ?? slug),
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