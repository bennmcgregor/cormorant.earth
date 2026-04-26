import React, { useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ReactFlow, Background, type Node, type NodeMouseHandler } from "@xyflow/react"

type MapNodeData = { image: string; title: string; href: string }
type MapNode = Node<MapNodeData, "custom">

const nodes: MapNode[] = [
    { id: "1", type: "custom", position: { x: 0,   y: 0   },
        data: { image: "/map-1.jpg", title: "First page",  href: "/some-page" } },
    { id: "2", type: "custom", position: { x: 320, y: 80  },
        data: { image: "/map-2.jpg", title: "Second page", href: "/another-page" } },
    { id: "3", type: "custom", position: { x: 120, y: 360 },
        data: { image: "/map-3.jpg", title: "Third page",  href: "https://example.com" } },
]

function CustomNode({ data }: { data: MapNodeData }) {
    return React.createElement(
        "div",
        { className: "map-node" },
        React.createElement("img", {
            src: data.image,
            alt: data.title,
            draggable: false,
        })
    )
}

function MapApp() {
    const [hover, setHover] = useState<string | null>(null)

    const onEnter: NodeMouseHandler = (_, n) => setHover((n.data as MapNodeData).title)
    const onLeave: NodeMouseHandler = () => setHover(null)
    const onClick: NodeMouseHandler = (_, n) => {
        window.location.href = (n.data as MapNodeData).href
    }

    return React.createElement(
        React.Fragment,
        null,
        React.createElement(
            ReactFlow,
            {
                nodes,
                edges: [],
                nodeTypes: { custom: CustomNode },
                onNodeMouseEnter: onEnter,
                onNodeMouseLeave: onLeave,
                onNodeClick: onClick,
                fitView: true,
                proOptions: { hideAttribution: true },
            },
            React.createElement(Background, null)
        ),
        hover && React.createElement("div", { className: "map-hover-panel" }, hover)
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