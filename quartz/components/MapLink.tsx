import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"

const MapLink: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <a href={`${baseDir}/map`} class="footer-map-link" aria-label="Map">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    </a>
  )
}

MapLink.css = `
.footer-map-link {
  display: flex;
  align-items: center;
}

.footer-map-link svg {
  width: 1rem;
  height: 1rem;
  stroke: var(--darkgray);
  stroke-width: 1.5px;
  fill: none;
  transition: stroke 0.2s ease;
}

.footer-map-link:hover svg {
  stroke: var(--secondary);
}
`

export default (() => MapLink) satisfies QuartzComponentConstructor
