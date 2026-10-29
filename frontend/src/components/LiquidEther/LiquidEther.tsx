/**
 * LiquidEther: a WebGL2 fluid simulation used as an animated background. The cursor stirs a
 * coloured liquid; with no input it stirs itself gently.
 * Adapted from the LiquidEther component in React Bits (https://reactbits.dev), ported from
 * JavaScript to strict TypeScript for this project. The shaders and simulation are unchanged;
 * the port adds types and handles possibly-missing values instead of assuming them.
 *
 * It is purely decorative: the canvas is aria-hidden, it stops when off screen or in a hidden
 * tab, and it does not auto-animate when the user prefers reduced motion. Without WebGL2 (or
 * float render targets) it renders nothing and the page background shows through.
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import './LiquidEther.css'

type Rgb = readonly [number, number, number]
type Point = readonly [number, number]

export interface LiquidEtherProps {
  colors?: readonly string[]
  intensity?: number
  mouseForce?: number
  cursorSize?: number
  persistence?: number
  viscosity?: number
  resolution?: number
  bounceEdges?: boolean
  clickBurst?: boolean
  autoDemo?: boolean
  /** Keep the automatic stirring running while the cursor is on the page, not only when idle. */
  alwaysFlow?: boolean
  autoSpeed?: number
  /** How far the automatic stirrer wanders from the centre, as a fraction of the size (0–0.5). */
  autoRange?: number
  autoIntensity?: number
  autoResumeDelay?: number
  intro?: boolean
  lightMode?: boolean
  backgroundColor?: string
  maxDevicePixelRatio?: number
  className?: string
  style?: CSSProperties
}

const PIXEL_BUDGET = 2.4e6
const MAX_CELLS = 140000
const PRESSURE_STEPS = 32
const PALETTE_SIZE = 256
const DEFAULT_COLORS = ['#5227FF', '#FF9FFC', '#B497CF']

const VERTEX = `#version 300 es
const vec2 corners[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 vUv;
void main() {
  vUv = corners[gl_VertexID] * 0.5 + 0.5;
  gl_Position = vec4(corners[gl_VertexID], 0.0, 1.0);
}`

const HEADER = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 uTexel;
`

const SPLAT = `${HEADER}
uniform sampler2D uVelocity;
uniform vec2 uSize;
uniform vec4 uSegment;
uniform vec2 uForce;
uniform float uRadius;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  return length(p - a - ab * t);
}

void main() {
  float d = segment(vUv * uSize, uSegment.xy, uSegment.zw) / uRadius;
  vec2 velocity = texture(uVelocity, vUv).xy + uForce * exp(-d * d * 6.0);
  fragColor = vec4(velocity, 0.0, 1.0);
}`

const SMOOTH = `${HEADER}
uniform sampler2D uVelocity;
uniform float uAmount;

void main() {
  vec2 center = texture(uVelocity, vUv).xy;
  vec2 around =
    texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).xy +
    texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).xy +
    texture(uVelocity, vUv - vec2(0.0, uTexel.y)).xy +
    texture(uVelocity, vUv + vec2(0.0, uTexel.y)).xy;
  fragColor = vec4(mix(center, around * 0.25, uAmount), 0.0, 1.0);
}`

const DIVERGENCE = `${HEADER}
uniform sampler2D uVelocity;
uniform float uWalls;

void main() {
  vec2 center = texture(uVelocity, vUv).xy;
  float left = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float right = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float down = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float up = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  float edge = uWalls > 0.5 ? -1.0 : 0.0;
  if (vUv.x - uTexel.x < 0.0) left = edge * center.x;
  if (vUv.x + uTexel.x > 1.0) right = edge * center.x;
  if (vUv.y - uTexel.y < 0.0) down = edge * center.y;
  if (vUv.y + uTexel.y > 1.0) up = edge * center.y;
  fragColor = vec4(0.5 * (right - left + up - down), 0.0, 0.0, 1.0);
}`

const EDGE = `
uniform float uWalls;

float pressureAt(sampler2D field, vec2 uv) {
  vec2 inside = step(vec2(0.0), uv) * step(uv, vec2(1.0));
  return texture(field, uv).x * mix(inside.x * inside.y, 1.0, uWalls);
}
`

const PRESSURE = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
${EDGE}
void main() {
  vec2 reach = uTexel * 2.0;
  float sum =
    pressureAt(uPressure, vUv - vec2(reach.x, 0.0)) +
    pressureAt(uPressure, vUv + vec2(reach.x, 0.0)) +
    pressureAt(uPressure, vUv - vec2(0.0, reach.y)) +
    pressureAt(uPressure, vUv + vec2(0.0, reach.y));
  fragColor = vec4(sum * 0.25 - texture(uDivergence, vUv).x, 0.0, 0.0, 1.0);
}`

const PROJECT = `${HEADER}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
${EDGE}
void main() {
  float left = pressureAt(uPressure, vUv - vec2(uTexel.x, 0.0));
  float right = pressureAt(uPressure, vUv + vec2(uTexel.x, 0.0));
  float down = pressureAt(uPressure, vUv - vec2(0.0, uTexel.y));
  float up = pressureAt(uPressure, vUv + vec2(0.0, uTexel.y));
  vec2 velocity = texture(uVelocity, vUv).xy - 0.5 * vec2(right - left, up - down);
  fragColor = vec4(velocity, 0.0, 1.0);
}`

const ADVECT = `${HEADER}
uniform sampler2D uVelocity;
uniform vec2 uStep;
uniform float uKeep;
uniform float uWalls;

vec2 at(vec2 uv) {
  vec2 outside = max(-uv, uv - 1.0) / uTexel;
  float open = clamp(1.0 - max(outside.x, outside.y) / 1.5, 0.0, 1.0);
  return texture(uVelocity, uv).xy * mix(open, 1.0, uWalls);
}

void main() {
  vec2 start = vUv - at(vUv) * uStep;
  vec2 back = start + at(start) * uStep;
  vec2 corrected = vUv - (back - vUv) * 0.5;
  vec2 origin = corrected - at(corrected) * uStep;
  vec2 a = at(origin + vec2(-0.5, -0.5) * uTexel);
  vec2 b = at(origin + vec2(0.5, -0.5) * uTexel);
  vec2 c = at(origin + vec2(-0.5, 0.5) * uTexel);
  vec2 d = at(origin + vec2(0.5, 0.5) * uTexel);
  vec2 velocity = clamp(at(origin), min(min(a, b), min(c, d)), max(max(a, b), max(c, d)));
  fragColor = vec4(velocity * uKeep, 0.0, 1.0);
}`

const DISPLAY = `${HEADER}
uniform sampler2D uVelocity;
uniform sampler2D uPalette;
uniform vec2 uSimSize;
uniform float uSpeedScale;
uniform float uLight;
uniform vec4 uBackground;

vec2 velocityAt(vec2 uv) {
  vec2 st = uv * uSimSize - 0.5;
  vec2 i = floor(st);
  vec2 f = st - i;
  vec2 f2 = f * f;
  vec2 f3 = f2 * f;
  vec2 w0 = (-f3 + 3.0 * f2 - 3.0 * f + 1.0) / 6.0;
  vec2 w1 = (3.0 * f3 - 6.0 * f2 + 4.0) / 6.0;
  vec2 w2 = (-3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 g0 = w0 + w1;
  vec2 g1 = w2 + w3;
  vec2 h0 = (i - 0.5 + w1 / g0) / uSimSize;
  vec2 h1 = (i + 1.5 + w3 / g1) / uSimSize;
  vec2 a = texture(uVelocity, vec2(h0.x, h0.y)).xy;
  vec2 b = texture(uVelocity, vec2(h1.x, h0.y)).xy;
  vec2 c = texture(uVelocity, vec2(h0.x, h1.y)).xy;
  vec2 d = texture(uVelocity, vec2(h1.x, h1.y)).xy;
  return g0.y * (g0.x * a + g1.x * b) + g1.y * (g0.x * c + g1.x * d);
}

void main() {
  float speed = length(velocityAt(vUv)) * uSpeedScale;
  float level = speed < 0.75 ? speed : 0.75 + 0.25 * tanh((speed - 0.75) * 4.0);
  vec3 ink = texture(uPalette, vec2(level, 0.5)).rgb;
  float alpha = level;
  if (uLight > 0.5) {
    float hollow = smoothstep(0.7, 1.6, speed);
    alpha = smoothstep(0.08, 0.5, level) * mix(0.85, 0.1, hollow);
  } else {
    float hot = 1.0 - exp(-max(speed - 0.75, 0.0) * 1.2);
    ink = mix(ink, min(ink * 1.8 + 0.06, vec3(1.0)), hot);
  }
  vec3 color = ink * alpha + uBackground.rgb * uBackground.a * (1.0 - alpha);
  float coverage = alpha + uBackground.a * (1.0 - alpha);
  float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  color += (grain - 0.5) / 255.0 * step(0.002, coverage);
  fragColor = vec4(clamp(color, vec3(0.0), vec3(coverage)), coverage);
}`

/** A linked program and a lookup for its active uniforms. */
interface Program {
  program: WebGLProgram
  loc: (name: string) => WebGLUniformLocation | null
}

interface Target {
  texture: WebGLTexture
  framebuffer: WebGLFramebuffer
}

/** The simulation's textures. Each "Next" target is written to, then swapped with its pair. */
interface Targets {
  velocity: Target
  velocityNext: Target
  divergence: Target
  pressure: Target
  pressureNext: Target
}

interface Splat {
  ax: number
  ay: number
  bx: number
  by: number
  vx: number
  vy: number
  radius: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Fraction of velocity kept after dt seconds; higher persistence keeps motion longer. */
const keepFor = (persistence: number, dt: number) => Math.pow(0.5, dt / (0.35 + persistence * persistence * 12))

/** "#abc", "#aabbcc" or "rgb(…)" to 0–1 RGB, or null for anything else. */
const parseColor = (value: string): Rgb | null => {
  const text = value.trim()
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text)?.[1]
  if (hex) {
    const full = hex.length === 3 ? hex.replace(/./g, (digit) => digit + digit) : hex
    const channel = (index: number) => parseInt(full.slice(index, index + 2), 16) / 255
    return [channel(0), channel(2), channel(4)]
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text)
  if (rgb) {
    const channel = (raw: string | undefined) => clamp(parseFloat(raw ?? '0') / 255, 0, 1)
    return [channel(rgb[1]), channel(rgb[2]), channel(rgb[3])]
  }
  return null
}

const toLinear = (channel: number) =>
  channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)

/** A 256-pixel gradient through the colours, blended in linear light, as RGBA bytes. */
const buildPalette = (colors: readonly string[]): Uint8Array<ArrayBuffer> => {
  const stops: Rgb[] = []
  for (const color of colors) {
    const parsed = parseColor(color)
    if (parsed) stops.push(parsed)
  }
  const values: Rgb[] = (stops.length > 0 ? stops : [[1, 1, 1] as const]).map(
    (c): Rgb => [toLinear(c[0]), toLinear(c[1]), toLinear(c[2])],
  )
  const data = new Uint8Array(PALETTE_SIZE * 4)
  for (let index = 0; index < PALETTE_SIZE; index++) {
    const t = clamp((index / (PALETTE_SIZE - 1)) * values.length - 0.5, 0, values.length - 1)
    const from = Math.min(Math.floor(t), Math.max(values.length - 2, 0))
    const to = Math.min(from + 1, values.length - 1)
    const k = t - from
    const eased = k * k * (3 - 2 * k)
    const a = values[from] ?? [1, 1, 1]
    const b = values[to] ?? a
    for (let channel = 0; channel < 3; channel++) {
      const start = a[channel] ?? 0
      const value = start + ((b[channel] ?? 0) - start) * eased
      data[index * 4 + channel] = Math.round(clamp(value, 0, 1) * 255)
    }
    data[index * 4 + 3] = 255
  }
  return data
}

const compile = (gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader | null => {
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

const link = (gl: WebGL2RenderingContext, fragmentSource: string): Program | null => {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
    return null
  }
  const program = gl.createProgram()
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
  const count = Number(gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS))
  for (let index = 0; index < count; index++) {
    const info = gl.getActiveUniform(program, index)
    if (info) uniforms.set(info.name, gl.getUniformLocation(program, info.name))
  }
  return { program, loc: (name) => uniforms.get(name) ?? null }
}

export default function LiquidEther({
  colors = DEFAULT_COLORS,
  intensity = 1,
  mouseForce = 20,
  cursorSize = 100,
  persistence = 0.75,
  viscosity = 0,
  resolution = 0.5,
  bounceEdges = false,
  clickBurst = true,
  autoDemo = true,
  alwaysFlow = false,
  autoSpeed = 0.5,
  autoRange = 0.41,
  autoIntensity = 2.2,
  autoResumeDelay = 1000,
  intro = true,
  lightMode = false,
  backgroundColor = 'transparent',
  maxDevicePixelRatio = 2,
  className = '',
  style,
}: LiquidEtherProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wakeRef = useRef<(() => void) | null>(null)
  // Bumped when the browser restores a lost WebGL context, which rebuilds everything.
  const [generation, setGeneration] = useState(0)
  const background = backgroundColor === 'transparent' ? null : parseColor(backgroundColor)

  const settings = {
    colors,
    paletteKey: colors.join(','),
    intensity: Math.max(0, intensity),
    force: Math.max(0, mouseForce),
    radius: clamp(cursorSize, 4, 600),
    persistence: clamp(persistence, 0, 1),
    viscosity: clamp(viscosity, 0, 1),
    resolution: clamp(resolution, 0.05, 1),
    walls: bounceEdges,
    clickBurst,
    autoDemo,
    alwaysFlow,
    autoSpeed: Math.max(0, autoSpeed),
    autoRange: clamp(autoRange, 0, 0.5),
    autoIntensity: Math.max(0, autoIntensity),
    autoResumeDelay: Math.max(0, autoResumeDelay),
    intro,
    light: lightMode,
    background: background ? ([...background, 1] as const) : ([0, 0, 0, 0] as const),
    maxRatio: clamp(maxDevicePixelRatio, 0.5, 3),
  }
  type Settings = typeof settings
  // The loop reads the latest props from this ref, so prop changes never restart WebGL.
  const settingsRef = useRef<Settings>(settings)

  useLayoutEffect(() => {
    settingsRef.current = settings
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
    if (!gl) return
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return

    const splatProgram = link(gl, SPLAT)
    const smoothProgram = link(gl, SMOOTH)
    const divergenceProgram = link(gl, DIVERGENCE)
    const pressureProgram = link(gl, PRESSURE)
    const projectProgram = link(gl, PROJECT)
    const advectProgram = link(gl, ADVECT)
    const displayProgram = link(gl, DISPLAY)
    if (
      !splatProgram ||
      !smoothProgram ||
      !divergenceProgram ||
      !pressureProgram ||
      !projectProgram ||
      !advectProgram ||
      !displayProgram
    )
      return
    const allPrograms = [
      splatProgram,
      smoothProgram,
      divergenceProgram,
      pressureProgram,
      projectProgram,
      advectProgram,
      displayProgram,
    ]

    const reduced =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const vao = gl.createVertexArray()
    const size = { width: 1, height: 1 }
    const grid = { width: 0, height: 0 }
    let targets: Targets | null = null
    const pointer = { x: 0, y: 0, fromX: 0, fromY: 0, dx: 0, dy: 0, inside: false, ready: false, moved: false, last: 0 }
    const auto = { phase: Math.random() * 100, x: 0, y: 0, ready: false, ramp: 0 }
    const opening = { active: settingsRef.current.intro && !reduced && generation === 0, time: 0 }
    const splats: Splat[] = []
    const puffs: Splat[] = []
    let energy = 1
    let lastInput = -Infinity
    let raf = 0
    let last = 0
    let visible = true
    let pageVisible = document.visibilityState !== 'hidden'
    let lost = false
    let paletteKey = ''

    const paletteTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, paletteTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const updatePalette = (s: Settings) => {
      if (s.paletteKey === paletteKey) return
      paletteKey = s.paletteKey
      gl.bindTexture(gl.TEXTURE_2D, paletteTexture)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        PALETTE_SIZE,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        buildPalette(s.colors),
      )
    }

    const makeTarget = (width: number, height: number, channels: 1 | 2): Target => {
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        channels === 2 ? gl.RG16F : gl.R16F,
        width,
        height,
        0,
        channels === 2 ? gl.RG : gl.RED,
        gl.HALF_FLOAT,
        null,
      )
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      const framebuffer = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      return { texture, framebuffer }
    }

    const dropTargets = () => {
      if (!targets) return
      const { velocity, velocityNext, divergence, pressure, pressureNext } = targets
      for (const target of [velocity, velocityNext, divergence, pressure, pressureNext]) {
        gl.deleteTexture(target.texture)
        gl.deleteFramebuffer(target.framebuffer)
      }
      targets = null
    }

    const resize = () => {
      const s = settingsRef.current
      const rect = container.getBoundingClientRect()
      const cssWidth = Math.max(1, rect.width)
      const cssHeight = Math.max(1, rect.height)
      const ratio = Math.min(window.devicePixelRatio || 1, s.maxRatio, Math.sqrt(PIXEL_BUDGET / (cssWidth * cssHeight)))
      const width = Math.max(1, Math.round(cssWidth * ratio))
      const height = Math.max(1, Math.round(cssHeight * ratio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      size.width = cssWidth
      size.height = cssHeight
      const base = s.resolution * 0.5
      const scale = base * Math.min(1, Math.sqrt(MAX_CELLS / (cssWidth * cssHeight * base * base)))
      const gridWidth = clamp(Math.round(cssWidth * scale), 16, 1024)
      const gridHeight = clamp(Math.round(cssHeight * scale), 16, 1024)
      if (targets && gridWidth === grid.width && gridHeight === grid.height) return
      dropTargets()
      grid.width = gridWidth
      grid.height = gridHeight
      targets = {
        velocity: makeTarget(gridWidth, gridHeight, 2),
        velocityNext: makeTarget(gridWidth, gridHeight, 2),
        divergence: makeTarget(gridWidth, gridHeight, 1),
        pressure: makeTarget(gridWidth, gridHeight, 1),
        pressureNext: makeTarget(gridWidth, gridHeight, 1),
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    const swapVelocity = (t: Targets) => {
      ;[t.velocity, t.velocityNext] = [t.velocityNext, t.velocity]
    }
    const swapPressure = (t: Targets) => {
      ;[t.pressure, t.pressureNext] = [t.pressureNext, t.pressure]
    }

    const bindTexture = (unit: number, texture: WebGLTexture, location: WebGLUniformLocation | null) => {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.uniform1i(location, unit)
    }

    /** Runs one full-screen pass of `entry` into `output` (or the canvas when null). */
    const run = (entry: Program, output: Target | null, bind: (u: Program['loc']) => void) => {
      gl.useProgram(entry.program)
      gl.uniform2f(entry.loc('uTexel'), 1 / grid.width, 1 / grid.height)
      bind(entry.loc)
      gl.bindFramebuffer(gl.FRAMEBUFFER, output ? output.framebuffer : null)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    /** One fluid step: add forces, optional smoothing, make it incompressible, then move it. */
    const simulate = (t: Targets, s: Settings, dt: number) => {
      gl.viewport(0, 0, grid.width, grid.height)
      const walls = s.walls ? 1 : 0
      for (const splat of splats) {
        run(splatProgram, t.velocityNext, (u) => {
          bindTexture(0, t.velocity.texture, u('uVelocity'))
          gl.uniform2f(u('uSize'), size.width, size.height)
          gl.uniform4f(u('uSegment'), splat.ax, splat.ay, splat.bx, splat.by)
          gl.uniform2f(u('uForce'), splat.vx, splat.vy)
          gl.uniform1f(u('uRadius'), splat.radius)
        })
        swapVelocity(t)
      }
      splats.length = 0
      const passes = Math.ceil(s.viscosity * 4)
      for (let pass = 0; pass < passes; pass++) {
        run(smoothProgram, t.velocityNext, (u) => {
          bindTexture(0, t.velocity.texture, u('uVelocity'))
          gl.uniform1f(u('uAmount'), Math.min(1, s.viscosity * 4 - pass) * 0.9)
        })
        swapVelocity(t)
      }
      run(divergenceProgram, t.divergence, (u) => {
        bindTexture(0, t.velocity.texture, u('uVelocity'))
        gl.uniform1f(u('uWalls'), walls)
      })
      for (let iteration = 0; iteration < PRESSURE_STEPS; iteration++) {
        run(pressureProgram, t.pressureNext, (u) => {
          bindTexture(0, t.pressure.texture, u('uPressure'))
          bindTexture(1, t.divergence.texture, u('uDivergence'))
          gl.uniform1f(u('uWalls'), walls)
        })
        swapPressure(t)
      }
      run(projectProgram, t.velocityNext, (u) => {
        bindTexture(0, t.pressure.texture, u('uPressure'))
        bindTexture(1, t.velocity.texture, u('uVelocity'))
        gl.uniform1f(u('uWalls'), walls)
      })
      swapVelocity(t)
      run(advectProgram, t.velocityNext, (u) => {
        bindTexture(0, t.velocity.texture, u('uVelocity'))
        gl.uniform2f(u('uStep'), dt / size.width, dt / size.height)
        gl.uniform1f(u('uKeep'), keepFor(s.persistence, dt))
        gl.uniform1f(u('uWalls'), walls)
      })
      swapVelocity(t)
    }

    const render = (t: Targets, s: Settings) => {
      gl.viewport(0, 0, canvas.width, canvas.height)
      run(displayProgram, null, (u) => {
        bindTexture(0, t.velocity.texture, u('uVelocity'))
        bindTexture(1, paletteTexture, u('uPalette'))
        gl.uniform2f(u('uSimSize'), grid.width, grid.height)
        gl.uniform1f(u('uSpeedScale'), (1.25 * s.intensity) / (0.84 * Math.max(size.width, size.height)))
        gl.uniform1f(u('uLight'), s.light ? 1 : 0)
        gl.uniform4f(u('uBackground'), s.background[0], s.background[1], s.background[2], s.background[3])
      })
    }

    /** The automatic stirrer's path: a smooth wander around the centre, out to `range` of the size. */
    const wander = (t: number, range: number): Point => {
      const x = 0.62 * Math.sin(t * 0.83 + 1.3) + 0.38 * Math.sin(t * 1.71 + 0.4)
      const y = 0.6 * Math.sin(t * 1.07 + 2.1) + 0.4 * Math.cos(t * 0.61 + 0.7)
      return [(0.5 + range * x) * size.width, (0.5 + range * y) * size.height]
    }

    /** The intro's path: a spiral sweeping out from the centre. */
    const sweep = (t: number): Point => {
      const k = clamp(t / 1.4, 0, 1)
      const eased = 1 - Math.pow(1 - k, 3)
      const angle = -0.6 + eased * 3.6
      const reach = 0.08 + 0.3 * eased
      return [
        (0.5 + Math.cos(angle) * reach * 1.1) * size.width,
        (0.5 + Math.sin(angle) * reach * (size.width / size.height) * 0.75) * size.height,
      ]
    }

    const addStroke = (from: Point, to: Point, dt: number, scale: number, radius: number) => {
      splats.push({
        ax: from[0],
        ay: from[1],
        bx: to[0],
        by: to[1],
        vx: clamp(((to[0] - from[0]) / dt) * scale, -6000, 6000),
        vy: clamp(((to[1] - from[1]) / dt) * scale, -6000, 6000),
        radius,
      })
    }

    const frame = (now: number) => {
      raf = 0
      if (lost || !targets) return
      const s = settingsRef.current
      updatePalette(s)
      const dt = clamp((now - last) / 1000 || 0, 0, 1 / 30)
      last = Math.max(last, now)
      const pace = Math.min(1, dt * 60)
      // With alwaysFlow the stirring never pauses; the cursor adds its own strokes on top.
      const idle = s.alwaysFlow || (now - lastInput > s.autoResumeDelay && !pointer.inside)

      if (opening.active && dt > 0) {
        const from = sweep(opening.time)
        opening.time += dt
        const fade = Math.sin(Math.min(1, opening.time / 1.4) * Math.PI)
        addStroke(from, sweep(opening.time), dt, 0.2 * fade, s.radius)
        energy = 1
        if (opening.time > 1.4) opening.active = false
      } else if (s.autoDemo && !reduced && idle && dt > 0) {
        auto.ramp = Math.min(1, auto.ramp + dt / 0.8)
        auto.phase += dt * s.autoSpeed * 1.6
        const spot = wander(auto.phase, s.autoRange)
        if (auto.ready) {
          const gust = 0.3 + 0.7 * Math.pow(0.5 + 0.5 * Math.sin(auto.phase * 2.6), 2)
          const scale = (s.force / 20) * 0.45 * s.autoIntensity * auto.ramp * auto.ramp * gust * pace
          addStroke([auto.x, auto.y], spot, dt, scale, s.radius)
        }
        auto.x = spot[0]
        auto.y = spot[1]
        auto.ready = true
        energy = 1
      } else {
        auto.ramp = 0
      }

      if (pointer.moved && dt > 0) {
        pointer.moved = false
        const span = Math.max(now - pointer.last, 8) / 1000
        addStroke([pointer.fromX, pointer.fromY], [pointer.x, pointer.y], span, (s.force / 20) * 0.15 * pace, s.radius)
        pointer.fromX = pointer.x
        pointer.fromY = pointer.y
        pointer.last = now
        energy = 1
      }

      const puff = puffs.shift()
      if (puff) splats.push(puff)

      gl.bindVertexArray(vao)
      gl.disable(gl.BLEND)
      if (dt > 0) simulate(targets, s, dt)
      render(targets, s)

      energy *= keepFor(s.persistence, dt)
      const busy = opening.active || (s.autoDemo && !reduced) || energy > 0.002 || puffs.length > 0 || pointer.moved
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

    /** Pointer position in canvas space (origin bottom-left, like the simulation). */
    const locate = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: rect.bottom - event.clientY,
        inside:
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom,
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      const spot = locate(event)
      pointer.inside = spot.inside
      if (!spot.inside) {
        pointer.ready = false
        return
      }
      lastInput = performance.now()
      opening.active = false
      if (!pointer.ready) {
        pointer.fromX = spot.x
        pointer.fromY = spot.y
        pointer.x = spot.x
        pointer.y = spot.y
        pointer.last = lastInput
        pointer.ready = true
      }
      const travelX = spot.x - pointer.x
      const travelY = spot.y - pointer.y
      if (Math.hypot(travelX, travelY) > 0.5) {
        pointer.dx = pointer.dx * 0.7 + travelX * 0.3
        pointer.dy = pointer.dy * 0.7 + travelY * 0.3
      }
      pointer.x = spot.x
      pointer.y = spot.y
      pointer.moved = true
      wake()
    }

    const onPointerDown = (event: PointerEvent) => {
      const s = settingsRef.current
      const spot = locate(event)
      if (!spot.inside) return
      lastInput = performance.now()
      if (!s.clickBurst || reduced) return
      const angle =
        Math.hypot(pointer.dx, pointer.dy) > 1 ? Math.atan2(pointer.dy, pointer.dx) : Math.random() * Math.PI * 2
      const dirX = Math.cos(angle)
      const dirY = Math.sin(angle)
      const reach = s.radius * 0.5
      const push = 1400 * (s.force / 20)
      puffs.push({
        ax: spot.x - dirX * reach,
        ay: spot.y - dirY * reach,
        bx: spot.x + dirX * reach,
        by: spot.y + dirY * reach,
        vx: dirX * push,
        vy: dirY * push,
        radius: s.radius * 0.9,
      })
      if (puffs.length > 4) puffs.shift()
      energy = 1
      wake()
    }

    const onLeave = () => {
      pointer.inside = false
      pointer.ready = false
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
        dropTargets()
        gl.deleteTexture(paletteTexture)
        gl.deleteVertexArray(vao)
        for (const entry of allPrograms) gl.deleteProgram(entry.program)
      }
    }
  }, [generation])

  return (
    <div ref={containerRef} className={`liquid-ether${className ? ` ${className}` : ''}`} style={style}>
      <canvas ref={canvasRef} className="liquid-ether__canvas" aria-hidden="true" />
    </div>
  )
}
