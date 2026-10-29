import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { ChevronDownIcon } from '../Icons'
import './Select.css'

export interface SelectOption {
  value: string
  label: string
  description?: string
  /** Shown in a small tile before the label, in the menu and in the closed button. */
  icon?: ReactNode
}

interface SelectProps {
  /** Id of the button, so a <label htmlFor> points at it. */
  id: string
  /** Id of the visible label, which names both the button and the menu. */
  labelId: string
  value: string
  options: readonly SelectOption[]
  placeholder: string
  onChange: (value: string) => void
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * A select-only combobox (the WAI-ARIA APG pattern) whose menu is styled after React Bits'
 * AnimatedList (reactbits.dev): a frosted panel of tiles that pop in one after another, with a
 * ring that springs to the highlighted option. Focus stays on the button the whole time; the
 * highlighted option is announced through aria-activedescendant.
 *
 * Keys: Down/Up/Enter/Space open it; while open, Down/Up/Home/End move, Enter/Space choose,
 * Escape closes, and typing a letter jumps to the next option starting with it.
 */
export default function Select({
  id,
  labelId,
  value,
  options,
  placeholder,
  onChange,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLSpanElement>(null)
  const optionRefs = useRef<(HTMLDivElement | null)[]>([])

  const listId = `${id}-listbox`
  const optionId = (index: number) => `${id}-option-${index}`
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = options[selectedIndex]
  const last = options.length - 1

  function openAt(index: number) {
    setActive(Math.min(last, Math.max(0, index)))
    setOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    if (option) onChange(option.value)
    setOpen(false)
  }

  /** The next option after `from` whose label starts with `letter`, wrapping round. */
  function findByLetter(letter: string, from: number): number {
    const lower = letter.toLowerCase()
    for (let step = 1; step <= options.length; step++) {
      const index = (from + step) % options.length
      if (options[index]?.label.toLowerCase().startsWith(lower)) return index
    }
    return -1
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const { key } = event
    const letter = key.length === 1 && key !== ' ' && !event.altKey && !event.ctrlKey && !event.metaKey

    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault()
        openAt(selectedIndex >= 0 ? selectedIndex : key === 'ArrowUp' ? last : 0)
      } else if (key === 'Home' || key === 'End') {
        event.preventDefault()
        openAt(key === 'Home' ? 0 : last)
      } else if (letter) {
        const match = findByLetter(key, selectedIndex)
        if (match >= 0) openAt(match)
      }
      return
    }

    switch (key) {
      case 'ArrowDown':
        event.preventDefault()
        setActive(Math.min(last, active + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActive(Math.max(0, active - 1))
        break
      case 'Home':
      case 'PageUp':
        event.preventDefault()
        setActive(0)
        break
      case 'End':
      case 'PageDown':
        event.preventDefault()
        setActive(last)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        choose(active)
        break
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        if (letter) {
          const match = findByLetter(key, active)
          if (match >= 0) setActive(match)
        }
    }
  }

  // Slides the ring onto the highlighted option and keeps that option scrolled into view.
  // The first placement after opening jumps there; later moves animate (see Select.css).
  const placedRef = useRef(false)
  useLayoutEffect(() => {
    const list = listRef.current
    const ring = ringRef.current
    const option = optionRefs.current[active]
    if (!open || !list || !ring || !option) {
      placedRef.current = false
      return
    }
    ring.dataset.animate = placedRef.current ? 'true' : 'false'
    ring.style.transform = `translateY(${option.offsetTop}px)`
    ring.style.height = `${option.offsetHeight}px`
    placedRef.current = true

    const top = option.offsetTop
    const bottom = top + option.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top - 6
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 6
  }, [open, active])

  const lead = (icon: ReactNode) => (icon ? <span className="select-lead">{icon}</span> : null)

  return (
    <div className="select" data-open={open ? 'true' : undefined}>
      <button
        id={id}
        type="button"
        className="select-trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelId}
        aria-activedescendant={open ? optionId(active) : undefined}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={handleKeyDown}
        // Space activates buttons on key up; it has already been handled on key down.
        onKeyUp={(event) => {
          if (event.key === ' ') event.preventDefault()
        }}
        onBlur={() => setOpen(false)}
      >
        {selected ? (
          <span className="select-value">
            {lead(selected.icon)}
            <span className="select-value-label">{selected.label}</span>
          </span>
        ) : (
          <span className="select-placeholder">{placeholder}</span>
        )}
        <span className="select-chevron" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          className="select-menu"
          role="listbox"
          aria-labelledby={labelId}
          tabIndex={-1}
          // Keep focus on the button while the pointer is used inside the menu.
          onPointerDown={(event) => event.preventDefault()}
        >
          <div className="select-track">
            {options.map((option, index) => (
              <div
                key={option.value}
                ref={(element) => {
                  optionRefs.current[index] = element
                }}
                id={optionId(index)}
                className="select-option"
                role="option"
                aria-selected={index === selectedIndex}
                data-active={index === active ? 'true' : undefined}
                style={{ '--select-index': index }}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(index)}
              >
                {lead(option.icon)}
                <span className="select-option-text">
                  <span className="select-option-label">{option.label}</span>
                  {option.description && <span className="select-option-description">{option.description}</span>}
                </span>
                {index === selectedIndex && <span className="select-check" aria-hidden="true" />}
                <span className="select-option-rim" aria-hidden="true" />
              </div>
            ))}
            <span ref={ringRef} className="select-ring" aria-hidden="true" />
          </div>
        </div>
      )}
    </div>
  )
}
