import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/backbutton.scss"

const BackButton: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    if (fileData.slug === "index" || fileData.slug === "map") return null
    return (
        <div class="back-button-row">
            <a href="javascript:history.back()" class="back-button" aria-label="Back">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                </svg>
            </a>
        </div>
    )
}

BackButton.css = style

export default (() => BackButton) satisfies QuartzComponentConstructor