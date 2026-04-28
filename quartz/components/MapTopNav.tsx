import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"
import { i18n } from "../i18n"
import style from "./styles/maptopnav.scss"
import searchStyle from "./styles/search.scss"
// @ts-ignore
import searchScript from "./scripts/search.inline"

const MapTopNav: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
  if (fileData.slug !== "map") return null
  const baseDir = pathToRoot(fileData.slug!)
  const searchPlaceholder = i18n(cfg.locale).components.search.searchBarPlaceholder
  return (
    <div class="top-nav">
      <div class="top-nav-left">
        <a href={baseDir} class="top-nav-logo">
          <img src={`${baseDir}/static/text-logo.png`} alt="Home" />
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

export default (() => MapTopNav) satisfies QuartzComponentConstructor
