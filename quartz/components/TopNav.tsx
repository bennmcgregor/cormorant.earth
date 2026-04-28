import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"
import { i18n } from "../i18n"
import style from "./styles/topnav.scss"
import searchStyle from "./styles/search.scss"
// @ts-ignore
import searchScript from "./scripts/search.inline"

const TopNav: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
  if (fileData.slug === "map") return null
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
      <div class="social-icons">
        <a href="https://instagram.com/canarybenn" target="_blank" rel="noopener" aria-label="Instagram">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="17.5" cy="6.5" r="1.5" />
          </svg>
        </a>
        <a href="https://tiktok.com/@canarybenn" target="_blank" rel="noopener" aria-label="TikTok">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
          </svg>
        </a>
        <a href="https://youtube.com/@canarybenn" target="_blank" rel="noopener" aria-label="YouTube">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58a2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
            <polygon points="9.75 15.02 15.5 12 9.75 8.98" />
          </svg>
        </a>
      </div>
    </div>
  )
}

TopNav.css = searchStyle + "\n" + style
TopNav.afterDOMLoaded = searchScript

export default (() => TopNav) satisfies QuartzComponentConstructor
