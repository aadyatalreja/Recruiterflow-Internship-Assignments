// Small inline SVG icons. All are decorative (aria-hidden); the text next to them carries the meaning.

const common = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function PlusIcon() {
  return (
    <svg {...common}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg {...common}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  )
}

export function CheckCircleIcon() {
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  )
}

export function ReceiptIcon() {
  return (
    <svg {...common} strokeWidth={1.5}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  )
}

export function SunIcon() {
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export function MoonIcon() {
  return (
    <svg {...common}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  )
}

/** The app's logo: a split circle. */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="var(--on-primary)" strokeWidth="2.5" />
      <path d="M16 8v16" stroke="var(--on-primary)" strokeWidth="2.5" />
      <path d="M16 8a8 8 0 0 1 0 16Z" fill="var(--on-primary)" />
    </svg>
  )
}

/** Money coming back to someone. */
export function ArrowDownLeftIcon() {
  return (
    <svg {...common}>
      <path d="M17 7 7 17M16 17H7V8" />
    </svg>
  )
}

/** Money someone still has to pay. */
export function ArrowUpRightIcon() {
  return (
    <svg {...common}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg {...common}>
      <path d="m5 12 5 5 9-10" />
    </svg>
  )
}
