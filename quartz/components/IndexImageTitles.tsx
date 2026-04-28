import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore
import script from "./scripts/indexImageTitles.inline"

const IndexImageTitles: QuartzComponent = () => null

IndexImageTitles.afterDOMLoaded = script

export default (() => IndexImageTitles) satisfies QuartzComponentConstructor
