import React, { useState, type SyntheticEvent } from "react"
import type { Node } from "@xyflow/react"

export type MapDataItem = {
    id: string
    position: { x: number; y: number, z: number, }
    image: string
    title: string
    href: string
}

export type MapNodeData = { image: string; title: string; href: string }
export type MapNode = Node<MapNodeData, "custom">

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