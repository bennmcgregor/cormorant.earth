import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Header: QuartzComponent = ({ children }: QuartzComponentProps) => {
  return children.length > 0 ? <header>{children}</header> : null
}

Header.css = `
header {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 1.5rem 2rem 1rem;
  gap: 1.5rem;
}
`

export default (() => Header) satisfies QuartzComponentConstructor
