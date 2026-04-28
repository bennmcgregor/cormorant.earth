import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"
import { Element, Parent } from "hast"

export const MapPreviewTransformer = (): QuartzTransformerPlugin => ({
  name: "MapPreviewTransformer",
  htmlPlugins() {
    return [
      () => (tree) => {
        visit(tree, "element", (node: Element, index, parent: Parent | null) => {
          const cls = node.properties?.className
          const classStr = Array.isArray(cls) ? cls.join(" ") : String(cls ?? "")
          const dataCallout =
            node.properties?.["data-callout"] ??
            (node.properties as Record<string, unknown>)?.dataCallout
          if (
            (node.tagName === "blockquote" || node.tagName === "div") &&
            classStr.includes("callout") &&
            dataCallout === "map" &&
            parent != null &&
            index != null
          ) {
            parent.children.splice(index, 1, {
              type: "element",
              tagName: "div",
              properties: { className: ["map-preview-root"] },
              children: [],
            } as Element)
          }
        })
      },
    ]
  },
})
