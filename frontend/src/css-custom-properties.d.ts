// Lets inline styles set CSS custom properties (style={{ '--name': value }}) with type checking.
import 'react'

declare module 'react' {
  interface CSSProperties {
    [property: `--${string}`]: string | number | undefined
  }
}
