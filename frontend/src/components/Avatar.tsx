/** "Meera Nair" -> "MN", "Kabir" -> "KA". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const [first = '', second = ''] = words
  const letters = second ? first.charAt(0) + second.charAt(0) : first.slice(0, 2)
  return letters.toUpperCase()
}

const TONES = 6

/**
 * A coloured circle with a member's initials. Purely decorative: the name is always shown as
 * text next to it, so it is hidden from screen readers and never becomes part of a label.
 */
export default function Avatar({
  name,
  index,
  size = 'md',
}: {
  name: string
  /** The member's position in the trip, so each person keeps the same colour everywhere. */
  index: number
  size?: 'sm' | 'md'
}) {
  const tone = (index % TONES) + 1
  const sizeClass = size === 'sm' ? ' avatar-sm' : ''
  return (
    <span className={`avatar tone-${tone}${sizeClass}`} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
