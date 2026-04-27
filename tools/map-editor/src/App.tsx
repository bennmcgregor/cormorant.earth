import React, { useCallback, useEffect, useState } from "react"
import {
    ReactFlow,
    Background,
    applyNodeChanges,
    type OnNodesChange,
    type OnNodeDrag,
} from "@xyflow/react"
import {
    MapNodeContent,
    type MapDataItem,
    type MapNode,
    type MapNodeData,
} from "../../../quartz/components/scripts/mapShared"

// Editor wrapper: no <a> wrapping (no navigation); uses the shared image renderer.
function CustomNode({ data }: { data: MapNodeData }) {
    return <MapNodeContent data={data} />
}

const nodeTypes = { custom: CustomNode }

export default function App() {
    const [nodes, setNodes] = useState<MapNode[]>([])

    useEffect(() => {
        fetch("/api/map")
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

    const onNodesChange: OnNodesChange<MapNode> = useCallback((changes) => {
        setNodes((ns) => applyNodeChanges(changes, ns))
    }, [])

    const onNodeDragStop: OnNodeDrag<MapNode> = useCallback((_, node) => {
        fetch(`/api/map/${encodeURIComponent(node.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ position: node.position }),
        })
    }, [])

    return (
        <ReactFlow
            nodes={nodes}
            edges={[]}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onNodeDragStop={onNodeDragStop}
            autoPanOnNodeDrag={false}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            proOptions={{ hideAttribution: true }}
            elevateNodesOnSelect={false}
        >
        <Background />
        </ReactFlow>
    )
}
