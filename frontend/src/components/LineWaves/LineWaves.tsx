// Ported from React Bits' LineWaves (reactbits.dev) to strict TypeScript.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import './LineWaves.css'

/** Upper bound on canvas pixels, so large screens lower the pixel ratio instead of the frame rate. */
const PIXEL_BUDGET = 2.4e6
const MAX_RIPPLES = 4

const VERTEX = `#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uPixel;
uniform float uTime;
uniform float uLines;
uniform float uWidth;
uniform float uGlow;
uniform float uBrightness;
uniform float uHighlight;
uniform float uHighlightWidth;
uniform float uWarp;
uniform float uScale;
uniform float uRotation;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uCycle;
uniform float uEdge;
uniform vec4 uMouse;
uniform vec4 uRipples[${MAX_RIPPLES}];
uniform float uReveal;
uniform float uLight;
uniform float uOpacity;
out vec4 fragColor;

vec2 rotate(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), w.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), w.x), w.y);
}

float smootherstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float bend(vec2 p, float t) {
  vec2 q = p * 2.0 / uScale;
  float w = 0.6 * sin(q.x * 0.55 + t * 0.4 + 0.6 * sin(q.y * 0.9 - t * 0.28));
  w += 0.21 * sin(q.x * 1.3 - t * 0.33 + q.y * 0.8 + 1.3);
  w += 0.12 * sin(q.y * 2.3 + q.x * 0.9 - t * 0.37 + 0.4);
  return w * uWarp * uScale * 0.46;
}

float river(vec2 p, float y, float t) {
  float drift = 0.7 * (0.18 * sin(p.x * 1.6 - t * 0.33 + 0.7) + 0.1 * sin(p.x * 3.1 + t * 0.21));
  float center = 0.5 * (0.2 * sin(t * 0.17) + 0.08 * sin(t * 0.29 + 1.3));
  float width = 0.13 * uHighlightWidth;
  float near = (y - center - drift) / width;
  float far = (y + 0.22 * sin(t * 0.13 + 2.0) - drift * 0.6 + 0.3) / (width * 0.55);
  return max(exp(-near * near), exp(-far * far) * 0.7);
}

vec3 palette(float x) {
  x = fract(x) * 3.0;
  if (x < 1.0) return mix(uColor1, uColor2, smoothstep(0.0, 1.0, x));
  if (x < 2.0) return mix(uColor2, uColor3, smoothstep(1.0, 2.0, x));
  return mix(uColor3, uColor1, smoothstep(2.0, 3.0, x));
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = rotate((gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y, uRotation);
  float t = uTime;

  vec2 mouse = rotate(uMouse.xy, uRotation);
  vec2 toMouse = p - mouse;
  float lens = exp(-dot(toMouse, toMouse) / (uMouse.w * uMouse.w));
  p.y -= (p.y - mouse.y) * lens * uMouse.z;

  float ring = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 ripple = uRipples[i];
    if (ripple.w <= 0.0) continue;
    float x = (length(p - rotate(ripple.xy, uRotation)) - ripple.z * 0.6) / 0.08;
    float fade = exp(-ripple.z * 1.3) * smoothstep(0.0, 0.12, ripple.z);
    float bump = exp(-x * x);
    p.y -= x * bump * 0.07 * fade;
    ring += bump * fade;
  }

  float w = bend(p, t);
  float y = p.y + w;
  float phi = y * uLines;
  float fw = max(fwidth(phi), 1e-5);
  float crowd = smoothstep(0.18, 0.5, fw);

  float fold = smoothstep(1.3, 2.2, fw * uResolution.y / uLines);
  float shimmer = mix(1.0, smoothstep(0.15, 0.85, noise(vec2(y * 1.6 + t * 0.07, p.x * 0.55 - t * 0.22))), 0.5);
  float lit = max(river(p, y, t), fold * 0.9) * shimmer;
  float light = mix(1.0, 0.07 + 0.93 * lit, uHighlight);
  light += (1.0 - light) * min(lens * step(0.0001, uMouse.z) * 0.9 + ring * 0.6, 1.0);

  float dist = abs(fract(phi + 0.5) - 0.5) / fw;
  float width = uWidth * uPixel * (1.0 + mix(1.5, 0.6, uLight) * lit * uHighlight);
  float cover = clamp(min(dist + width * 0.5, 0.5) - max(dist - width * 0.5, -0.5), 0.0, 1.0);
  cover = mix(cover, min(width * fw, 1.0), crowd);
  float halo = exp(-dist / (2.2 * uPixel)) * (1.0 - crowd) * uGlow;
  float thread = mix(1.0, 0.55 + 0.45 * hash(vec2(floor(phi + 0.5), 7.3)), 0.45 * (1.0 - crowd));

  float span = 0.5 * sqrt(aspect * aspect + 1.0);
  float sweep = -span + (2.0 * span + 0.6) * uReveal;
  float reveal = 1.0 - smoothstep(sweep - 0.6, sweep, p.x);

  float edge = 1.0;
  if (uEdge > 0.0) {
    float ex = min(uv.x, 1.0 - uv.x) * aspect;
    float ey = min(uv.y, 1.0 - uv.y);
    edge = smootherstep(0.0, uEdge * 0.5, ex) * smootherstep(0.0, uEdge * 0.5, ey);
  }

  vec3 tint = palette(y * 0.3 + p.x * 0.2 + uCycle);
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;

  if (uLight > 0.5) {
    float low = min(tint.r, min(tint.g, tint.b));
    float chroma = max(tint.r, max(tint.g, tint.b)) - low;
    vec3 hue = (tint - low) / max(chroma, 1e-3);
    vec3 ink = mix(vec3(0.08), hue * 0.56 + 0.06, smoothstep(0.04, 0.2, chroma));
    float alpha = (cover + halo * 0.35) * thread * light * uBrightness * reveal * edge * 0.78 * uOpacity;
    alpha = clamp(alpha + grain, 0.0, 1.0);
    fragColor = vec4(ink * alpha, alpha);
    return;
  }

  float strength = (cover + halo) * thread * light * uBrightness * reveal * edge;
  vec3 color = clamp(tint * strength * uOpacity, 0.0, 1.0);
  float alpha = max(color.r, max(color.g, color.b));
  color = clamp(color + grain, 0.0, 1.0);
  fragColor = vec4(min(color, vec3(alpha)), alpha);
}`

type Rgb = [number, number, number]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** "#a855f7", "#fff" or "rgb(…)" as 0–1 channels; anything else falls back to white. */
function parseColor(value: string): Rgb {
  const text = value.trim()
  const digits = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text)?.[1]
  if (digits !== undefined) {
    const full = digits.length === 3 ? digits.replace(/./g, (digit) => digit + digit) : digits
    const channel = (index: number) => parseInt(full.slice(index, index + 2), 16) / 255
    return [channel(0), channel(2), channel(4)]
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text)
  if (rgb) {
    const channel = (part: string | undefined) => clamp(parseFloat(part ?? '255') / 255, 0, 1)
    return [channel(rgb[1]), channel(rgb[2]), channel(rgb[3])]
  }
  return [1, 1, 1]
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

interface Shader {
  program: WebGLProgram
  uniforms: Map<string, WebGLUniformLocation | null>
}

function link(gl: WebGL2RenderingContext): Shader | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
  const program = vertex && fragment ? gl.createProgram() : null
  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
    return null
  }
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  const uniforms = new Map<string, WebGLUniformLocation | null>()
  const count: unknown = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  for (let index = 0; index < (typeof count === 'number' ? count : 0); index++) {
    const info = gl.getActiveUniform(program, index)
    // Arrays are reported as "name[0]"; store them under the plain name.
    if (info) uniforms.set(info.name.replace(/\[0\]$/, ''), gl.getUniformLocation(program, info.name))
  }
  return { program, uniforms }
}

export interface LineWavesProps {
  /** The three colours the lines blend through. */
  color1?: string
  color2?: string
  color3?: string
  /** How fast the colours drift across the lines. 0 keeps them in place. */
  colorCycleSpeed?: number
  /** How fast the waves flow. 0 freezes them. */
  speed?: number
  /** Number of lines across the height of the container. */
  lineCount?: number
  /** Line thickness in px. */
  lineWidth?: number
  glow?: number
  brightness?: number
  /** Strength of the band of light drifting through the lines, 0–1. */
  highlight?: number
  highlightWidth?: number
  /** How strongly the lines bend into waves. */
  warpIntensity?: number
  /** Size of the waves. */
  warpScale?: number
  /** Angle of the lines, in degrees. */
  rotation?: number
  /** Fades the lines out towards the container's edges, 0–1. */
  edgeFade?: number
  /** The lines spread apart and light up around the cursor. */
  enableMouseInteraction?: boolean
  mouseInfluence?: number
  /** Clicking sends a wave rolling out through the lines. */
  clickRipple?: boolean
  /** The lines draw in across the container on mount. */
  intro?: boolean
  /** Draws the lines as ink for light backgrounds. */
  lightMode?: boolean
  opacity?: number
  maxDevicePixelRatio?: number
  className?: string
  style?: CSSProperties
}

interface Ripple {
  x: number
  y: number
  age: number
}

export default function LineWaves({
  color1 = '#ffffff',
  color2 = '#ffffff',
  color3 = '#ffffff',
  colorCycleSpeed = 1,
  speed = 0.3,
  lineCount = 72,
  lineWidth = 1.3,
  glow = 0.6,
  brightness = 1,
  highlight = 1,
  highlightWidth = 1,
  warpIntensity = 1,
  warpScale = 1,
  rotation = -33,
  edgeFade = 0,
  enableMouseInteraction = true,
  mouseInfluence = 2,
  clickRipple = true,
  intro = true,
  lightMode = false,
  opacity = 1,
  maxDevicePixelRatio = 2,
  className = '',
  style,
}: LineWavesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wakeRef = useRef<(() => void) | null>(null)
  // Bumped when a lost WebGL context is restored, which re-runs the setup effect.
  const [generation, setGeneration] = useState(0)

  const settings = {
    color1: parseColor(color1),
    color2: parseColor(color2),
    color3: parseColor(color3),
    cycleSpeed: colorCycleSpeed,
    speed: Math.max(0, speed),
    lines: clamp(lineCount, 2, 400),
    width: clamp(lineWidth, 0.25, 12),
    glow: Math.max(0, glow),
    brightness: Math.max(0, brightness),
    highlight: clamp(highlight, 0, 1),
    highlightWidth: clamp(highlightWidth, 0.2, 5),
    warp: clamp(warpIntensity, 0, 3),
    scale: clamp(warpScale, 0.2, 4),
    rotation: (rotation * Math.PI) / 180,
    edge: clamp(edgeFade, 0, 1),
    mouse: enableMouseInteraction,
    influence: clamp(mouseInfluence, 0, 3),
    clickRipple,
    intro,
    light: lightMode,
    opacity: clamp(opacity, 0, 1),
    maxRatio: clamp(maxDevicePixelRatio, 0.5, 3),
  }
  // The render loop reads the latest props from here, so changing them never restarts WebGL.
  const settingsRef = useRef(settings)
  useLayoutEffect(() => {
    settingsRef.current = settings
  })

  // After every render, resize and restart the loop in case new props need a frame.
  useEffect(() => {
    wakeRef.current?.()
  })

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    })
    const shader = gl ? link(gl) : null
    if (!gl || !shader) return
    const vao = gl.createVertexArray()
    const uniform = (name: string) => shader.uniforms.get(name) ?? null

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const size = { width: 1, height: 1, ratio: 1 }
    const pointer = { x: 0, y: 0, inside: false }
    const lens = { x: 0, y: 0, presence: 0, ready: false }
    const ripples: Ripple[] = []
    const rippleData = new Float32Array(MAX_RIPPLES * 4)
    let time = Math.random() * 60
    let cycle = 0
    let reveal = settingsRef.current.intro && !reduced && generation === 0 ? 0 : 1
    let raf = 0
    let last = 0
    let visible = true
    let pageVisible = document.visibilityState !== 'hidden'
    let lost = false

    const resize = () => {
      const s = settingsRef.current
      const rect = container.getBoundingClientRect()
      const cssWidth = Math.max(1, rect.width)
      const cssHeight = Math.max(1, rect.height)
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        s.maxRatio,
        Math.sqrt(PIXEL_BUDGET / (cssWidth * cssHeight)),
      )
      const width = Math.max(1, Math.round(cssWidth * ratio))
      const height = Math.max(1, Math.round(cssHeight * ratio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      size.width = cssWidth
      size.height = cssHeight
      size.ratio = width / cssWidth
    }

    /** CSS pixels in the container to the shader's centred, height-normalised coordinates. */
    const toField = (x: number, y: number): [number, number] => [
      (x - size.width / 2) / size.height,
      (size.height / 2 - y) / size.height,
    ]

    const frame = (now: number) => {
      raf = 0
      if (lost) return
      const s = settingsRef.current
      const dt = clamp((now - last) / 1000 || 0, 0, 0.05)
      last = Math.max(last, now)
      time += dt * s.speed * 2.5 * (reduced ? 0.25 : 1)
      cycle += dt * s.speed * s.cycleSpeed * 0.05
      if (reveal < 1) reveal = Math.min(1, reveal + dt / 1.8)

      const tracking = s.mouse && pointer.inside && !reduced
      if (tracking) {
        const [x, y] = toField(pointer.x, pointer.y)
        if (!lens.ready) {
          lens.x = x
          lens.y = y
          lens.ready = true
        }
        const follow = 1 - Math.exp(-dt * 10)
        lens.x += (x - lens.x) * follow
        lens.y += (y - lens.y) * follow
      }
      const presence = tracking ? 1 : 0
      lens.presence += (presence - lens.presence) * (1 - Math.exp(-dt * 5))
      if (lens.presence < 0.002 && !tracking) lens.ready = false

      for (let index = ripples.length - 1; index >= 0; index--) {
        const ripple = ripples[index]
        if (!ripple) continue
        ripple.age += dt
        if (ripple.age > 2.6) ripples.splice(index, 1)
      }
      rippleData.fill(0)
      ripples.forEach((ripple, index) => {
        rippleData.set([ripple.x, ripple.y, ripple.age, 1], index * 4)
      })

      const eased = 1 - Math.pow(1 - reveal, 3)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.useProgram(shader.program)
      gl.bindVertexArray(vao)
      gl.uniform2f(uniform('uResolution'), canvas.width, canvas.height)
      gl.uniform1f(uniform('uPixel'), size.ratio)
      gl.uniform1f(uniform('uTime'), time)
      gl.uniform1f(uniform('uLines'), s.lines)
      gl.uniform1f(uniform('uWidth'), s.width)
      gl.uniform1f(uniform('uGlow'), s.glow)
      gl.uniform1f(uniform('uBrightness'), s.brightness)
      gl.uniform1f(uniform('uHighlight'), s.highlight)
      gl.uniform1f(uniform('uHighlightWidth'), s.highlightWidth)
      gl.uniform1f(uniform('uWarp'), s.warp * (0.25 + 0.75 * eased))
      gl.uniform1f(uniform('uScale'), s.scale)
      gl.uniform1f(uniform('uRotation'), s.rotation)
      gl.uniform3fv(uniform('uColor1'), s.color1)
      gl.uniform3fv(uniform('uColor2'), s.color2)
      gl.uniform3fv(uniform('uColor3'), s.color3)
      gl.uniform1f(uniform('uCycle'), cycle)
      gl.uniform1f(uniform('uEdge'), s.edge)
      gl.uniform4f(uniform('uMouse'), lens.x, lens.y, lens.presence * s.influence * 0.16, 0.2)
      gl.uniform4fv(uniform('uRipples'), rippleData)
      gl.uniform1f(uniform('uReveal'), eased)
      gl.uniform1f(uniform('uLight'), s.light ? 1 : 0)
      gl.uniform1f(uniform('uOpacity'), s.opacity)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      const settling = Math.abs(presence - lens.presence) > 0.002
      const busy = (s.speed > 0 && !reduced) || reveal < 1 || settling || ripples.length > 0 || tracking
      if (busy && visible && pageVisible) raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      if (raf || lost || !visible || !pageVisible) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    wakeRef.current = () => {
      resize()
      wake()
    }

    const locate = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        inside:
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom,
      }
    }

    // Listeners sit on the window, so the background reacts even under the app's content.
    const onPointerMove = (event: PointerEvent) => {
      const spot = locate(event)
      pointer.x = spot.x
      pointer.y = spot.y
      pointer.inside = spot.inside
      wake()
    }
    const onPointerDown = (event: PointerEvent) => {
      const s = settingsRef.current
      const spot = locate(event)
      if (!spot.inside || !s.clickRipple || reduced) return
      const [x, y] = toField(spot.x, spot.y)
      ripples.push({ x, y, age: 0 })
      if (ripples.length > MAX_RIPPLES) ripples.shift()
      wake()
    }
    const onLeave = () => {
      pointer.inside = false
      wake()
    }
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') onLeave()
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerUp, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)

    const onLost = (event: Event) => {
      event.preventDefault()
      lost = true
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onRestored = () => setGeneration((value) => value + 1)
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)

    const resizeObserver = new ResizeObserver(() => {
      resize()
      wake()
    })
    resizeObserver.observe(container)

    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      wake()
    })
    intersection.observe(container)

    const onVisibility = () => {
      pageVisible = document.visibilityState !== 'hidden'
      wake()
    }
    document.addEventListener('visibilitychange', onVisibility)

    resize()
    wake()

    return () => {
      cancelAnimationFrame(raf)
      wakeRef.current = null
      resizeObserver.disconnect()
      intersection.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      if (!gl.isContextLost()) {
        gl.deleteVertexArray(vao)
        gl.deleteProgram(shader.program)
      }
    }
  }, [generation])

  return (
    <div ref={containerRef} className={`line-waves${className ? ` ${className}` : ''}`} style={style}>
      <canvas ref={canvasRef} className="line-waves__canvas" aria-hidden="true" />
    </div>
  )
}
