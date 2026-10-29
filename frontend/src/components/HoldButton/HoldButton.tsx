// Ported from React Bits' HoldButton (reactbits.dev) to strict TypeScript, with an added
// `ariaLabel` prop so a row's button can name what it deletes, and a `title` tooltip.
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import './HoldButton.css'

/** A release this quick counts as a tap, not a cancelled hold. */
const TAP_MS = 250
/** How far (px) the pointer may drift outside the button before the hold is cancelled. */
const HIT_PAD = 10

type Phase = 'idle' | 'holding' | 'done'
type Input = 'pointer' | 'key'
type Ease = (t: number) => number

const LINEAR: Ease = (t) => t
const EASE_OUT: Ease = (t) => 1 - Math.pow(1 - t, 3)

export interface HoldButtonProps {
  /** Label shown while idle and holding. */
  children?: ReactNode
  /** Label that blurs in when the hold completes. */
  doneLabel?: ReactNode
  icon?: ReactNode
  doneIcon?: ReactNode
  /** Accessible name, when the visible label alone is not specific enough. */
  ariaLabel?: string
  /** Tooltip, e.g. to tell mouse users to hold rather than click. */
  title?: string
  backgroundColor?: string
  /** Colour of the liquid fill, its wave, the glow and the focus ring. */
  fillColor?: string
  textColor?: string
  /** Label colour inside the fill. */
  fillTextColor?: string
  size?: 'sm' | 'md' | 'lg'
  radius?: number
  fillDirection?: 'right' | 'up'
  /** How long the press must last, in milliseconds. */
  holdTime?: number
  /** How fast the fill snaps back on an early release or a reset, in milliseconds. */
  releaseTime?: number
  /** Squash of the button while a pointer holds it. 1 disables it. */
  pressScale?: number
  wave?: boolean
  waveAmplitude?: number
  glow?: boolean
  /** Milliseconds the done state stays before the button resets. 0 keeps it done. */
  resetAfter?: number
  disabled?: boolean
  /** Called once, on the frame the fill completes. */
  onHold?: () => void
  /** Called on a quick release that did not drift away. */
  onTap?: () => void
  className?: string
}

interface ReleaseOptions {
  drifted?: boolean
}

export default function HoldButton({
  children = 'Hold to delete',
  doneLabel = 'Deleted',
  icon = null,
  doneIcon = null,
  ariaLabel,
  title,
  backgroundColor = '#27272a',
  fillColor = '#5227FF',
  textColor = '#f5f5f5',
  fillTextColor = '#ffffff',
  size = 'md',
  radius = 14,
  fillDirection = 'right',
  holdTime = 2000,
  releaseTime = 200,
  pressScale = 0.97,
  wave = true,
  waveAmplitude = 6,
  glow = true,
  resetAfter = 1200,
  disabled = false,
  onHold,
  onTap,
  className = '',
}: HoldButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [input, setInput] = useState<Input | null>(null)
  // Refs mirror the state so pointer, key and animation callbacks always see the latest values.
  const phaseRef = useRef<Phase>('idle')
  const inputRef = useRef<Input | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const gesture = useRef<{ pointerId: number | null; start: number; rect: DOMRect | null }>({
    pointerId: null,
    start: 0,
    rect: null,
  })
  const timers = useRef({ complete: 0, reset: 0 })
  const motion = useRef({ raf: 0, p: 0, from: 0, to: 0, start: 0 })
  const hintId = useId()

  const go = (next: Phase, kind: Input | null = null) => {
    phaseRef.current = next
    inputRef.current = kind
    setPhase(next)
    setInput(kind)
  }

  const clearTimers = () => {
    window.clearTimeout(timers.current.complete)
    window.clearTimeout(timers.current.reset)
  }

  /** Animates the fill (the --hb-p custom property) to `to`, then calls `onDone`. */
  const drive = (to: number, duration: number, ease: Ease, onDone?: () => void) => {
    const m = motion.current
    cancelAnimationFrame(m.raf)
    m.from = m.p
    m.to = to
    m.start = performance.now()
    const step = (now: number) => {
      const t = duration > 0 ? Math.min(1, (now - m.start) / duration) : 1
      m.p = m.from + (m.to - m.from) * ease(t)
      buttonRef.current?.style.setProperty('--hb-p', m.p.toFixed(4))
      if (t < 1) {
        m.raf = requestAnimationFrame(step)
        return
      }
      m.raf = 0
      onDone?.()
    }
    m.raf = requestAnimationFrame(step)
  }

  const complete = () => {
    if (phaseRef.current !== 'holding') return
    // Guards against the backup timer firing early if animation frames were throttled.
    if (performance.now() - gesture.current.start < holdTime - 50) return
    clearTimers()
    go('done', inputRef.current)
    onHold?.()
    if (resetAfter > 0) {
      timers.current.reset = window.setTimeout(() => {
        go('idle')
        drive(0, releaseTime, EASE_OUT)
      }, resetAfter)
    }
  }

  const begin = (kind: Input): boolean => {
    if (disabled || phaseRef.current !== 'idle') return false
    const button = buttonRef.current
    if (!button) return false
    gesture.current.start = performance.now()
    gesture.current.rect = button.getBoundingClientRect()
    go('holding', kind)
    drive(1, holdTime, LINEAR, complete)
    // Backup in case animation frames stop (a background tab), so the hold still completes.
    timers.current.complete = window.setTimeout(complete, holdTime + 100)
    return true
  }

  const release = ({ drifted = false }: ReleaseOptions = {}) => {
    if (phaseRef.current !== 'holding') return
    clearTimers()
    const held = performance.now() - gesture.current.start
    go('idle')
    drive(0, releaseTime, EASE_OUT)
    if (!drifted && held < TAP_MS) onTap?.()
  }
  const releaseRef = useRef(release)
  useLayoutEffect(() => {
    releaseRef.current = release
  })

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !e.isPrimary || gesture.current.pointerId !== null) return
    if (!begin('pointer')) return
    gesture.current.pointerId = e.pointerId
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // The pointer may already be gone; the hold still works without capture.
    }
  }

  const endPointer = (e: PointerEvent<HTMLButtonElement>, options?: ReleaseOptions) => {
    if (e.pointerId !== gesture.current.pointerId) return
    gesture.current.pointerId = null
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Capture was already released.
    }
    release(options)
  }

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== gesture.current.pointerId) return
    const r = gesture.current.rect
    if (!r) return
    const out =
      e.clientX < r.left - HIT_PAD ||
      e.clientX > r.right + HIT_PAD ||
      e.clientY < r.top - HIT_PAD ||
      e.clientY > r.bottom + HIT_PAD
    if (out) endPointer(e, { drifted: true })
  }

  const handlePointerLeave = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'touch') endPointer(e, { drifted: true })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') {
      if (inputRef.current === 'key') release({ drifted: true })
      return
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (!e.repeat) begin('key')
    }
  }

  const handleKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (inputRef.current === 'key') release()
    }
  }

  // The wave mask is sized from the button's own width and height.
  useLayoutEffect(() => {
    const button = buttonRef.current
    if (!button) return undefined
    const measure = () => {
      button.style.setProperty('--hb-w', `${button.offsetWidth}px`)
      button.style.setProperty('--hb-h', `${button.offsetHeight}px`)
    }
    measure()
    // App: environments without ResizeObserver (jsdom in tests) keep the first measurement.
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(button)
    return () => ro.disconnect()
  }, [])

  // Leaving the window mid-hold cancels it, so a hold can't complete unseen.
  useEffect(() => {
    if (phase !== 'holding') return undefined
    const cancel = () => releaseRef.current({ drifted: true })
    const onVisibility = () => {
      if (document.hidden) cancel()
    }
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [phase])

  useEffect(() => {
    const t = timers.current
    const m = motion.current
    return () => {
      window.clearTimeout(t.complete)
      window.clearTimeout(t.reset)
      cancelAnimationFrame(m.raf)
    }
  }, [])

  const labels = (
    <>
      <span className="hold-button__idle" aria-hidden={phase === 'done'}>
        {icon ? <span className="hold-button__icon">{icon}</span> : null}
        {children}
      </span>
      <span className="hold-button__done" aria-hidden={phase !== 'done'}>
        {doneIcon ? <span className="hold-button__icon">{doneIcon}</span> : null}
        {doneLabel}
      </span>
    </>
  )

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      className={`hold-button hold-button--${size}${className ? ` ${className}` : ''}`}
      data-phase={phase}
      data-input={input ?? undefined}
      data-direction={fillDirection}
      data-glow={glow ? 'true' : undefined}
      aria-label={ariaLabel}
      title={title}
      aria-describedby={hintId}
      style={{
        '--hb-radius': `${radius}px`,
        '--hb-bg': backgroundColor,
        '--hb-fill': fillColor,
        '--hb-text': textColor,
        '--hb-fill-text': fillTextColor,
        '--hb-hold': `${holdTime}ms`,
        '--hb-cycles': holdTime / 1100,
        '--hb-release': `${releaseTime}ms`,
        '--hb-press': pressScale,
        '--hb-wave': `${wave ? waveAmplitude : 0}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => endPointer(e)}
      onPointerCancel={(e) => endPointer(e, { drifted: true })}
      onLostPointerCapture={(e) => endPointer(e, { drifted: true })}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="hold-button__pulse" aria-hidden="true" />
      <span className="hold-button__label">{labels}</span>
      <span className="hold-button__clip" aria-hidden="true">
        <span className="hold-button__fill">
          <span className="hold-button__label hold-button__label--fill">{labels}</span>
        </span>
        <span className="hold-button__crest" aria-hidden="true">
          <span className="hold-button__label hold-button__label--fill">{labels}</span>
        </span>
      </span>
      <span id={hintId} className="hold-button__sr">
        Press and hold for {Math.round(holdTime / 100) / 10} seconds to confirm
      </span>
    </button>
  )
}
