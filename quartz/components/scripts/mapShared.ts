import React, { useState, type SyntheticEvent } from "react"
import { Controls, ControlButton, useReactFlow, type Node } from "@xyflow/react"

export type MapDataItem = {
    id: string
    position: { x: number; y: number, z: number, }
    image: string
    title: string
    href: string
}

export type MapNodeData = { image: string; title: string; href: string }
export type MapNode = Node<MapNodeData, "custom">

const zoomInIcon = React.createElement("svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24" },
    React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
    React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" }),
)
const zoomOutIcon = React.createElement("svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24" },
    React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" }),
)
const homeIcon = React.createElement("svg",
    { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24" },
    React.createElement("path", { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }),
    React.createElement("polyline", { points: "9 22 9 12 15 12 15 22" }),
)

/** Shared zoom/home Controls panel used by both the full map and the preview.
 *  "reset-origin" snaps the viewport to (0,0); "fit-view" fits all nodes. */
export function MapControls({ homeAction }: { homeAction: "reset-origin" | "fit-view" }) {
    const { setViewport, zoomIn, zoomOut, fitView } = useReactFlow()

    const handleHome = homeAction === "reset-origin"
        ? () => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 600 })
        : () => fitView({ duration: 600, padding: 0.1 })

    return React.createElement(
        Controls,
        { showZoom: false, showFitView: false, showInteractive: false, position: "top-right" },
        React.createElement(ControlButton, { onClick: () => zoomIn({ duration: 300 }), title: "Zoom in" }, zoomInIcon),
        React.createElement(ControlButton, { onClick: () => zoomOut({ duration: 300 }), title: "Zoom out" }, zoomOutIcon),
        React.createElement(ControlButton, { onClick: handleHome, title: homeAction === "reset-origin" ? "Reset view" : "Fit view" }, homeIcon),
    )
}

/** Image tile with shortest-edge-fixed orientation behavior. Used by both the
 *  live site (wrapped in <a class="internal"> for popovers) and the editor
 *  (rendered bare). Wrapping is the consumer's responsibility. */
export function MapNodeContent({ data }: { data: MapNodeData }) {
    const [orientation, setOrientation] = useState<"portrait" | "landscape" | "square">("square")

    return React.createElement(
        "div",
        { className: "map-node" },
        React.createElement("img", {
            src: data.image,
            alt: data.title,
            draggable: false,
            "data-orientation": orientation,
            onLoad: (e: SyntheticEvent<HTMLImageElement>) => {
                const img = e.currentTarget
                setOrientation(
                img.naturalWidth > img.naturalHeight
                    ? "landscape"
                    : img.naturalHeight > img.naturalWidth
                    ? "portrait"
                    : "square",
                )
            },
        }),
    )
}