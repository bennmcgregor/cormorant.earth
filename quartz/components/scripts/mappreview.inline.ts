import React, { useEffect, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReactFlow, Background } from "@xyflow/react"
import type { FullSlug } from "../../util/path"
import {
    MapControls,
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

function MapPreviewApp() {
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
                        data: { 
                            image: item.image,
                            title: item.title,
                            href: item.href,
                            width: item.width,
                            height: item.height,
                        },
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
            fitView: true,
            fitViewOptions: { padding: 0.1 },
            minZoom: 0.1,
            maxZoom: 2,
            panOnScroll: false,
            zoomOnScroll: true,
            proOptions: { hideAttribution: true },
        },
        React.createElement(Background, null),
        React.createElement(MapControls, { homeAction: "fit-view" }),
    )
}

let roots: Root[] = []
let isReDispatchingNav = false

function mount() {
    const els = document.querySelectorAll<HTMLElement>(".map-preview-root")
    if (!els.length || roots.length) return
    els.forEach((el) => {
        const r = createRoot(el)
        r.render(React.createElement(MapPreviewApp))
        roots.push(r)
    })

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
    roots.forEach((r) => r.unmount())
    roots = []
}

document.addEventListener("nav", () => {
    if (isReDispatchingNav) return
    unmount()
    mount()
})
window.addEventListener("beforeunload", unmount)
