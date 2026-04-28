import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/mappreview.inline"
import style from "./styles/mappreview.scss"

const MapPreview: QuartzComponent = () => null

MapPreview.afterDOMLoaded = script
MapPreview.css = style

export default (() => MapPreview) satisfies QuartzComponentConstructor
