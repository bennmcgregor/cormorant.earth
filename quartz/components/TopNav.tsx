import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"
import { i18n } from "../i18n"
import style from "./styles/topnav.scss"
import searchStyle from "./styles/search.scss"
// @ts-ignore
import searchScript from "./scripts/search.inline"

const TopNav: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
  const baseDir = pathToRoot(fileData.slug!)
  const searchPlaceholder = i18n(cfg.locale).components.search.searchBarPlaceholder
  return (
    <div class="top-nav">
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
      <a href={`${baseDir}/map`} class="top-nav-map" aria-label="Map">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      </a>
    </div>
  )
}

TopNav.css = searchStyle + "\n" + style
TopNav.afterDOMLoaded = searchScript

export default (() => TopNav) satisfies QuartzComponentConstructor
