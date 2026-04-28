import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"

export const WebpImageRewrite: QuartzTransformerPlugin = () => ({
    name: "WebpImageRewrite",
    htmlPlugins() {
        return [
        () => (tree: any) => {
            visit(tree, "element", (node: any) => {
                if (node.tagName !== "img") return
                const src = node.properties?.src
                if (typeof src !== "string") return
                if (/\.(jpe?g|png)$/i.test(src)) {
                    node.properties.src = src.replace(/\.(jpe?g|png)$/i, ".webp")
                }
            })
        },
        ]
    },
})