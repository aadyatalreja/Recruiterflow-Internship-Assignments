import { useEffect, useLayoutEffect, useRef } from 'react'
import './PillFilter.css'

/** How much the pill overshoots as it settles, 0–1. */
const BOUNCE = 0.3
/** How far the leading edge runs ahead of the trailing edge, 0–1. */
const STRETCH = 0.5
const STIFFNESS = 520

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

interface Box {
  left: number
  top: number
  width: number
  height: number
}

/**
 * A row of radio buttons with one highlight pill that glides to the chosen option. The motion
 * follows React Bits' PillNav (reactbits.dev): the edge nearest the new option springs ahead,
 * the far edge catches up, and the pill squashes slightly while stretched. The radios stay
 * real inputs, so keyboard use and screen readers work as for any radio group.
 */
export default function PillFilter<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string
  name: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const glideRef = useRef<HTMLSpanElement>(null)
  const optionRefs = useRef<(HTMLLabelElement | null)[]>([])
  const indexRef = useRef(0)
  const wakeRef = useRef<(() => void) | null>(null)

  const index = Math.max(0, options.indexOf(value))
  useLayoutEffect(() => {
    indexRef.current = index
    wakeRef.current?.()
  }, [index])

  useEffect(() => {
    const track = trackRef.current
    const glide = glideRef.current
    if (!track || !glide) return
    // jsdom (the test environment) has neither matchMedia nor ResizeObserver.
    const reduced =
      typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Left and right edges spring separately (x0, x1); top and height follow when options wrap.
    const s = { x0: 0, x1: 0, v0: 0, v1: 0, y: 0, vy: 0, h: 0, vh: 0 }
    let raf = 0
    let last = 0

    const target = (): Box | null => {
      const option = optionRefs.current[indexRef.current]
      return option
        ? { left: option.offsetLeft, top: option.offsetTop, width: option.offsetWidth, height: option.offsetHeight }
        : null
    }

    const snap = (box: Box) => {
      s.x0 = box.left
      s.x1 = box.left + box.width
      s.y = box.top
      s.h = box.height
      s.v0 = s.v1 = s.vy = s.vh = 0
    }

    const render = (box: Box) => {
      const width = Math.max(0, s.x1 - s.x0)
      const squash = 1 - clamp((width / Math.max(box.width, 1) - 1) * 0.3, 0, 0.14)
      glide.style.width = `${width}px`
      glide.style.height = `${s.h}px`
      glide.style.transform = `translate3d(${s.x0}px, ${s.y}px, 0) scaleY(${squash})`
    }

    const tick = (now: number) => {
      raf = 0
      const box = target()
      if (!box) return
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now
      const t0 = box.left
      const t1 = box.left + box.width
      const zeta = 1 - 0.55 * BOUNCE
      const direction = Math.sign((t0 + t1) / 2 - (s.x0 + s.x1) / 2)
      const lead = STIFFNESS * (1 + 0.9 * STRETCH)
      const trail = STIFFNESS * (1 - 0.5 * STRETCH)
      const k0 = direction < 0 ? lead : direction > 0 ? trail : STIFFNESS
      const k1 = direction > 0 ? lead : direction < 0 ? trail : STIFFNESS
      const damp = (k: number) => 2 * zeta * Math.sqrt(k)
      const steps = Math.ceil(dt / (1 / 240))
      const h = dt / steps
      for (let i = 0; i < steps; i++) {
        s.v0 += (-k0 * (s.x0 - t0) - damp(k0) * s.v0) * h
        s.x0 += s.v0 * h
        s.v1 += (-k1 * (s.x1 - t1) - damp(k1) * s.v1) * h
        s.x1 += s.v1 * h
        s.vy += (-STIFFNESS * (s.y - box.top) - damp(STIFFNESS) * s.vy) * h
        s.y += s.vy * h
        s.vh += (-STIFFNESS * (s.h - box.height) - damp(STIFFNESS) * s.vh) * h
        s.h += s.vh * h
      }
      const moving =
        Math.abs(s.x0 - t0) + Math.abs(s.x1 - t1) + Math.abs(s.y - box.top) + Math.abs(s.h - box.height) > 0.1 ||
        Math.abs(s.v0) + Math.abs(s.v1) + Math.abs(s.vy) + Math.abs(s.vh) > 1
      if (!moving) snap(box)
      render(box)
      if (moving) raf = requestAnimationFrame(tick)
    }

    const wake = () => {
      const box = target()
      if (!box) return
      if (reduced) {
        snap(box)
        render(box)
        return
      }
      if (!raf) {
        last = 0
        raf = requestAnimationFrame(tick)
      }
    }
    wakeRef.current = wake

    // Place the pill on the current option straight away, then glide on later changes.
    const place = () => {
      const box = target()
      if (!box) return
      cancelAnimationFrame(raf)
      raf = 0
      snap(box)
      render(box)
    }
    place()
    track.dataset.ready = 'true'

    // Wrapping or font loading moves the options; jump the pill to the new spot.
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)
    resizeObserver?.observe(track)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver?.disconnect()
      wakeRef.current = null
    }
  }, [])

  return (
    <fieldset className="filter">
      <legend>{legend}</legend>
      <div ref={trackRef} className="pill-filter">
        <span ref={glideRef} className="pill-filter-glide" aria-hidden="true" />
        {options.map((option, i) => (
          <label
            key={option}
            ref={(element) => {
              optionRefs.current[i] = element
            }}
            className="pill-filter-option"
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
