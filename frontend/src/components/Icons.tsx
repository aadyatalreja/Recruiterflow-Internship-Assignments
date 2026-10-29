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

export function ChevronDownIcon() {
  return (
    <svg {...common}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function FoodIcon() {
  return (
    <svg {...common}>
      <path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2 1-3.5 3.5-3.5 7 0 2 1.5 3 3.5 3" />
    </svg>
  )
}

export function TravelIcon() {
  return (
    <svg {...common}>
      <path d="M5 12.5 6.6 8.3A2 2 0 0 1 8.5 7h7a2 2 0 0 1 1.9 1.3l1.6 4.2" />
      <rect x="3" y="12.5" width="18" height="5.5" rx="1.5" />
      <path d="M6 18v2M18 18v2M7 15.25h.01M17 15.25h.01" />
    </svg>
  )
}

export function StayIcon() {
  return (
    <svg {...common}>
      <path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6M7 12.5a1.5 1.5 0 1 0 0-.01" />
    </svg>
  )
}

export function ActivitiesIcon() {
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  )
}

export function OtherIcon() {
  return (
    <svg {...common}>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </svg>
  )
}

/** Equal split: everyone pays the same. */
export function EqualsIcon() {
  return (
    <svg {...common}>
      <path d="M5 9h14M5 15h14" />
    </svg>
  )
}

/** Exact amounts: a rupee sign. */
export function RupeeIcon() {
  return (
    <svg {...common}>
      <path d="M6 4h12M6 9h12M9 4h1.5a5 5 0 0 1 0 10H6l8 6" />
    </svg>
  )
}

/** Percentages. */
export function PercentIcon() {
  return (
    <svg {...common}>
      <path d="M19 5 5 19" />
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
    </svg>
  )
}
