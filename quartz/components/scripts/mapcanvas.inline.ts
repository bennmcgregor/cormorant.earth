import React, { useCallback, useEffect, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReactFlow, Background } from "@xyflow/react"
import type { FullSlug } from "../../util/path"
import { MAP_MAX_ZOOM, MAP_TILE_DISPLAY_WIDTH } from "../../util/imageSizes"
import {
    MapControls,
    MapNodeContent,
    type MapDataItem,
    type MapNode,
    type MapNodeData,
} from "./mapShared"

const APPROX_TILE_HALF = MAP_TILE_DISPLAY_WIDTH / 2
const VIEWPORT_KEY = "map-viewport"

function CustomNode({ data }: { data: MapNodeData }) {
    return React.createElement(
        "a",
        { className: "internal", href: data.href },
        React.createElement(MapNodeContent, { data }),
    )
}

const nodeTypes = { custom: CustomNode }

function findCentermostTileId(items: MapDataItem[]): string | null {
    if (items.length === 0) return null
    let bestId = items[0].id
    let bestDistSq = Infinity
    for (const item of items) {
        // Approximate tile center: position is the top-left corner; tiles
        // render at ~MAP_TILE_DISPLAY_WIDTH on the shortest side, so adding
        // half is close enough without computer per-tile aspect.
        const cx = item.position.x + APPROX_TILE_HALF
        const cy = item.position.y + APPROX_TILE_HALF
        const distSq = cx * cx + cy * cy
        if (distSq < bestDistSq) {
            bestDistSq = distSq
            bestId = item.id
        }
    }
    return bestId
}

function MapApp() {
    const [nodes, setNodes] = useState<MapNode[]>([])
    const [defaultViewport] = useState(() => {
        try {
            const saved = sessionStorage.getItem(VIEWPORT_KEY)
            if (saved) return JSON.parse(saved)
        } catch {}
        return { x: window.innerWidth / 2, y: window.innerHeight / 2, zoom: 1 }
    })

    useEffect(() => {
        fetch("/mapdata.json")
        .then((r) => r.json())
        .then((items: MapDataItem[]) => {
            const lcpId = findCentermostTileId(items)
            setNodes(
            items.map((item) => ({
                id: item.id,
                type: "custom",
                position: { x: item.position.x, y: item.position.y },
                zIndex: item.position.z,
                data: { 
                    image: item.image,
                    video: item.video,
                    title: item.title,
                    href: item.href,
                    width: item.width,
                    height: item.height,
                    eager: item.id == lcpId,
                },
            })),
            )
        })
    }, [])

    useEffect(() => {
        const trigger = () => {
            // 500ms delay after load to let any post-load layout settle.
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent("map-videos-ready"))
            }, 500)
        }
        if (document.readyState === "complete") {
            trigger()
        } else {
            window.addEventListener("load", trigger, { once: true })
        }
    }, [])

    const saveViewport = useCallback((_: unknown, vp: { x: number; y: number; zoom: number }) => {
        try { sessionStorage.setItem(VIEWPORT_KEY, JSON.stringify(vp)) } catch {}
    }, [])

    return React.createElement(
        ReactFlow,
        {
            nodes,
            edges: [],
            nodeTypes,
            elevateNodesOnSelect: false,
            defaultViewport,
            proOptions: { hideAttribution: true },
            maxZoom: MAP_MAX_ZOOM,
            onMoveEnd: saveViewport,
        },
        React.createElement(Background, null),
        React.createElement(MapControls, { homeAction: "reset-origin" }),
    )
}

let root: Root | null = null
let isReDispatchingNav = false

function mount() {
    const el = document.getElementById("map-canvas-root")
    if (!el || root) return
    root = createRoot(el)
    root.render(React.createElement(MapApp))

    // After React commits the mount, fire nav so popover (and other nav-listening
    // scripts) can re-scan the DOM and find our newly-rendered <a.internal>s.
    // The 100ms setTimeout gives React Flow time to fully commit its DOM
    // (including measuring nodes and creating the <a> wrappers) before popover
    // scans for links
    requestAnimationFrame(() => {
        setTimeout(() => {
            isReDispatchingNav = true
            document.dispatchEvent(
                new CustomEvent("nav", {
                    detail: { url: window.location.pathname.slice(1) as FullSlug },
                }),
            )
            isReDispatchingNav = false
        }, 100)
    })
}

function unmount() {
    root?.unmount()
    root = null
}

document.addEventListener("nav", () => {
    if (isReDispatchingNav) return  // skip our own synthetic dispatch
    unmount()
    mount()
})
window.addEventListener("beforeunload", unmount)