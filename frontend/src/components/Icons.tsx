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
