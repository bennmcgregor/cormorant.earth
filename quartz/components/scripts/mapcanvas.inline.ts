import React, { useEffect, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReactFlow, Background } from "@xyflow/react"
import type { FullSlug } from "../../util/path"
import {
    MapNodeContent,
    type MapDataItem,
    type MapNode,
    type MapNodeData,
} from "./mapShared"

function CustomNode({ data }: { data: MapNodeData }) {
    return React.createElement(
        "a",
        { className: "internal", href: data.href },
        React.createElement(MapNodeContent, { data }),
    )
}

const nodeTypes = { custom: CustomNode }

function MapApp() {
    const [nodes, setNodes] = useState<MapNode[]>([])

    useEffect(() => {
        fetch("/mapdata.json")
        .then((r) => r.json())
        .then((items: MapDataItem[]) => {
            setNodes(
            items.map((item) => ({
                id: item.id,
                type: "custom",
                position: { x: item.position.x, y: item.position.y },
                zIndex: item.position.z,
                data: { image: item.image, title: item.title, href: item.href },
            })),
            )
        })
    }, [])

    return React.createElement(
        ReactFlow,
        {
            nodes,
            edges: [],
            nodeTypes,
            elevateNodesOnSelect: false,
            defaultViewport: { x: 0, y: 0, zoom: 1 }, // always open map at (0,0)
            proOptions: { hideAttribution: true },
        },
        React.createElement(Background, null),
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