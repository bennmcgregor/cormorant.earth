import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [
    Component.TopNav({
      desktopLogo: "static/text-logo.png",
      mobileLogo: "static/textless-logo.png",
    }),
    Component.MapTopNav({
      desktopLogo: "static/text-logo.png",
      mobileLogo: "static/textless-logo.png",
    }),
  ],
  afterBody: [],
  footer: Component.Footer(),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [Component.BackButton()],
  left: [],
  right: [],
  afterBody: [
    Component.TopNav({
      desktopLogo: "static/text-logo.png",
      mobileLogo: "static/textless-logo.png",
    }),
    Component.MapTopNav({
      desktopLogo: "static/text-logo.png",
      mobileLogo: "static/textless-logo.png",
    }),
    Component.MapCanvas(),
    Component.MapPreview()
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.BackButton()],
  left: [],
  right: [],
  afterBody: [
    Component.TopNav({
      desktopLogo: "static/text-logo.png",
      mobileLogo: "static/textless-logo.png",
    }),
    Component.MapTopNav({
      desktopLogo: "static/text-logo.png",
      mobileLogo: "static/textless-logo.png",
    }),
  ],
}
