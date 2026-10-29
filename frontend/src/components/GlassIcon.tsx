import type { ReactNode } from 'react'

/** Gradients for the coloured card behind the glass, from React Bits' GlassIcons presets. */
const GRADIENTS = {
  green: 'linear-gradient(135deg, hsl(146, 66%, 54%), hsl(162, 82%, 34%))',
  red: 'linear-gradient(135deg, hsl(354, 95%, 68%), hsl(342, 80%, 52%))',
  graphite: 'linear-gradient(135deg, hsl(250, 6%, 56%), hsl(250, 8%, 30%))',
} as const

export type GlassIconColor = keyof typeof GRADIENTS

/**
 * A frosted glass tile over a tilted, coloured card, after React Bits' GlassIcons
 * (reactbits.dev). This is a CSS-only take on its look: the original is a grid of buttons
 * drawn with WebGL, but these icons are decorative, so they stay plain spans hidden from
 * screen readers and the text next to them carries the meaning.
 */
export default function GlassIcon({
  icon,
  color,
  index = 0,
}: {
  icon: ReactNode
  color: GlassIconColor
  /** Position in its list, so a row of icons swings out one after another. */
  index?: number
}) {
  return (
    <span
      className="glass-icon"
      style={{ '--glass-icon-plate': GRADIENTS[color], '--glass-icon-index': index }}
      aria-hidden="true"
    >
      <span className="glass-icon-plate" />
      <span className="glass-icon-glass" />
      <span className="glass-icon-glyph">{icon}</span>
    </span>
  )
}
