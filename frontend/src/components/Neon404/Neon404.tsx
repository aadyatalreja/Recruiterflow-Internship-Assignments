import { useEffect, useId, useRef, useState } from 'react'
import './Neon404.css'

/**
 * "404" drawn as a neon outline with electricity crackling along it. The crackle is the same
 * outline pushed around by SVG turbulence noise whose seed changes many times a second;
 * hovering speeds it up, widens the arcs and brightens the glow. Decorative: the page's
 * heading says what happened.
 */
export default function Neon404() {
  // useId can contain characters that are awkward inside url(#…), so keep letters and digits.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [hot, setHot] = useState(false)
  const turbulenceRefs = useRef<(SVGFETurbulenceElement | null)[]>([])
  const displaceRefs = useRef<(SVGFEDisplacementMapElement | null)[]>([])
  const boltRef = useRef<SVGGElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // [calm, hovered] displacement for the main crackle and for the stray arcs.
    const scales = hot ? [7, 16] : [3.5, 9]
    const timer = window.setInterval(
      () => {
        turbulenceRefs.current.forEach((turbulence) => {
          turbulence?.setAttribute('seed', String(Math.floor(Math.random() * 1000)))
        })
        displaceRefs.current.forEach((displace, i) => {
          const base = scales[i] ?? 0
          displace?.setAttribute('scale', (base * (0.7 + Math.random() * 0.6)).toFixed(2))
        })
        // An occasional brighter flash, more often while hovered.
        const flash = Math.random() < (hot ? 0.25 : 0.08)
        boltRef.current?.style.setProperty('opacity', flash ? '1' : hot ? '0.85' : '0.6')
      },
      hot ? 45 : 85,
    )
    return () => window.clearInterval(timer)
  }, [hot])

  const text = (className: string, filter: string) => (
    <text
      className={className}
      x="50%"
      y="54%"
      textAnchor="middle"
      dominantBaseline="middle"
      filter={`url(#${filter})`}
    >
      404
    </text>
  )

  return (
    <div
      className="neon-404"
      data-hot={hot ? 'true' : undefined}
      aria-hidden="true"
      onPointerEnter={() => setHot(true)}
      onPointerLeave={() => setHot(false)}
    >
      <svg viewBox="0 0 640 260" role="presentation">
        <defs>
          {/*
            Each layer draws filled text, then keeps only a thin ring around its edge (grow the
            shape, cut the original out). Stroking the text instead would also outline the
            overlapping pieces some glyphs are built from, like the crossbar of a 4.
          */}
          <filter id={`${id}-core`} x="-5%" y="-10%" width="110%" height="120%">
            <feMorphology in="SourceGraphic" operator="dilate" radius="1.6" result="fat" />
            <feComposite in="fat" in2="SourceGraphic" operator="out" />
          </filter>
          <filter id={`${id}-glow`} x="-25%" y="-50%" width="150%" height="200%">
            <feMorphology in="SourceGraphic" operator="dilate" radius="3.5" result="fat" />
            <feComposite in="fat" in2="SourceGraphic" operator="out" result="ring" />
            <feGaussianBlur in="ring" stdDeviation="8" />
          </filter>
          <filter id={`${id}-bloom`} x="-40%" y="-80%" width="180%" height="260%">
            <feMorphology in="SourceGraphic" operator="dilate" radius="5" result="fat" />
            <feComposite in="fat" in2="SourceGraphic" operator="out" result="ring" />
            <feGaussianBlur in="ring" stdDeviation="24" />
          </filter>
          {[0, 1].map((i) => (
            <filter key={i} id={`${id}-zap-${i}`} x="-10%" y="-20%" width="120%" height="140%">
              <feMorphology in="SourceGraphic" operator="dilate" radius={i === 0 ? 1.4 : 0.8} result="fat" />
              <feComposite in="fat" in2="SourceGraphic" operator="out" result="ring" />
              <feTurbulence
                ref={(element) => {
                  turbulenceRefs.current[i] = element
                }}
                type="turbulence"
                baseFrequency={i === 0 ? '0.035 0.09' : '0.02 0.05'}
                numOctaves={2}
                seed={i + 1}
                result="noise"
              />
              <feDisplacementMap
                ref={(element) => {
                  displaceRefs.current[i] = element
                }}
                in="ring"
                in2="noise"
                scale={i === 0 ? 3.5 : 9}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))}
        </defs>

        {text('neon-404-bloom', `${id}-bloom`)}
        {text('neon-404-glow', `${id}-glow`)}
        <g ref={boltRef} className="neon-404-bolts">
          {text('neon-404-arc', `${id}-zap-1`)}
          {text('neon-404-crackle', `${id}-zap-0`)}
        </g>
        {text('neon-404-core', `${id}-core`)}
      </svg>
    </div>
  )
}
