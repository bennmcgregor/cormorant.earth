import { readFileSync } from "fs"
import { createRequire } from "module"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import script from "./scripts/mapcanvas.inline"
import style from "./styles/mapcanvas.scss"

const require = createRequire(import.meta.url)
const reactFlowCss = readFileSync(
    require.resolve("@xyflow/react/dist/style.css"),
    "utf-8",
)

const MapCanvas: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    if (fileData.slug !== "map") return null
    return <div id="map-canvas-root"></div>
}

MapCanvas.afterDOMLoaded = script
MapCanvas.css = reactFlowCss + "\n" + style

export default (() => MapCanvas) satisfies QuartzComponentConstructor