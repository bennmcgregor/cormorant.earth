declare const fetchData: Promise<Record<string, { title?: string }>>

document.addEventListener("nav", () => {
  if (document.body.getAttribute("data-slug") !== "index") return

  fetchData.then((data) => {
    document.querySelectorAll<HTMLAnchorElement>('a:has(> img[alt="featured"])').forEach((link) => {
      const slug = (link.getAttribute("href") ?? "").replace(/^\//, "").replace(/\/$/, "")
      const title = data[slug]?.title
      if (title) link.setAttribute("data-page-title", title)
    })
  })
})
