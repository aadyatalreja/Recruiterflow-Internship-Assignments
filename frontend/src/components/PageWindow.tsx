import type { ReactNode } from 'react'

/**
 * A near-opaque "window" around a page's content, with a small title bar, so the animated
 * background stays decorative and never sits behind anything the user reads or clicks.
 * The title bar repeats the page name visually only; the page's own <h1> is the real heading.
 */
export default function PageWindow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="page-window">
      <div className="page-window-bar" aria-hidden="true">
        {title}
      </div>
      <div className="page-window-body">{children}</div>
    </div>
  )
}
