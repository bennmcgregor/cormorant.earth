import React, { useEffect, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReactFlow, Background } from "@xyflow/react"
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
                position: item.position,
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
        fitView: true,
        proOptions: { hideAttribution: true },
        },
        React.createElement(Background, null),
    )
}

let root: Root | null = null

function mount() {
    const el = document.getElementById("map-canvas-root")
    if (!el || root) return
    root = createRoot(el)
    root.render(React.createElement(MapApp))
}

function unmount() {
    root?.unmount()
    root = null
}

document.addEventListener("nav", () => {
    unmount()
    mount()
})
window.addEventListener("beforeunload", unmount)