import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

export function CircuitBuilderIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
      <path d="M9 6h4a2 2 0 0 1 2 2v4" />
      <path d="M12 18H8a2 2 0 0 1-2-2V9" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
    </svg>
  )
}

export function AiTutorIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h16v10H9l-4 4V5Z" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function AnalyticsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M20 20v-3" />
      <path d="M3 20h18" />
    </svg>
  )
}

export function LearnIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5c2.5-1 5-1 8 0v13c-3-1-5.5-1-8 0v-13Z" />
      <path d="M20 5.5c-2.5-1-5-1-8 0v13c3-1 5.5-1 8 0v-13Z" />
    </svg>
  )
}

export function PredictIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

export function BuildIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 3.5 17 6l-2 2 3 3 2-2 2.5 2.5a3.5 3.5 0 0 1-5 5L9 8" />
      <path d="M9 8 5 12l7 7 4-4" />
      <circle cx="5" cy="19" r="1.5" />
    </svg>
  )
}

export function RunIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ObserveIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <path d="M8 12h1.5l1-2.5 2 5 1-2.5H16" />
    </svg>
  )
}

export function ExplainIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4h16v10H9l-4 4V4Z" />
      <path d="M12 6.5v2.7" />
      <circle cx="12" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function DebugIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="13" r="5" />
      <path d="M9 8.5 7.5 6M15 8.5 16.5 6M6 13H3M21 13h-3M9 17.5 7.5 20M15 17.5 16.5 20" />
      <path d="M9 10.5h6" />
    </svg>
  )
}

export function ChallengeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MasterIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 14.5 9l6 .8-4.3 4.1 1 6-5.2-3-5.2 3 1-6L3.5 9.8l6-.8 2.5-5.5Z" />
    </svg>
  )
}
