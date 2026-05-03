import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"
import { i18n } from "../i18n"
import style from "./styles/maptopnav.scss"
import searchStyle from "./styles/search.scss"
// @ts-ignore
import searchScript from "./scripts/search.inline"
import { getStaticImageDims } from "../util/staticImageDims"

export interface MapTopNavOptions {
  desktopLogo: string
  mobileLogo: string
}

const defaultOptions: MapTopNavOptions = {
  desktopLogo: "static/text-logo.png",
  mobileLogo: "static/text-logo-mobile.png",
}

export default ((userOpts?: Partial<MapTopNavOptions>) => {
  const opts = { ...defaultOptions, ...userOpts }

  const MapTopNav: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
    if (fileData.slug !== "map") return null
    const baseDir = pathToRoot(fileData.slug!)
    const searchPlaceholder = i18n(cfg.locale).components.search.searchBarPlaceholder
    const desktopDims = getStaticImageDims(opts.desktopLogo)
    const mobileDims = getStaticImageDims(opts.mobileLogo)
    return (
      <div class="top-nav">
        <div class="top-nav-left">
          <a href={baseDir} class="top-nav-logo">
            <img
                src={`${baseDir}/${opts.desktopLogo}`}
                alt="Home"
                class="logo-desktop"
                width={desktopDims.width || undefined}
                height={desktopDims.height || undefined}
            />
            <img
                src={`${baseDir}/${opts.mobileLogo}`}
                alt="Home"
                class="logo-mobile"
                width={mobileDims.width || undefined}
                height={mobileDims.height || undefined}
            />
          </a>
          <div class="search">
            <button class="search-button" aria-label={i18n(cfg.locale).components.search.title}>
              <svg role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.9 19.7">
                <title>Search</title>
                <g class="search-path" fill="none">
                  <path stroke-linecap="square" d="M18.5 18.3l-5.4-5.4" />
                  <circle cx="8" cy="8" r="7" />
                </g>
              </svg>
            </button>
            <div class="search-container">
              <div class="search-space">
                <input
                  autocomplete="off"
                  class="search-bar"
                  name="search"
                  type="text"
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                />
                <div class="search-layout" data-preview={true}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  MapTopNav.css = searchStyle + "\n" + style
  MapTopNav.afterDOMLoaded = searchScript
  return MapTopNav

}) satisfies QuartzComponentConstructor
