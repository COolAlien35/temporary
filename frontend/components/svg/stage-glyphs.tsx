import type { TimelineStage } from "@/lib/quantum-passport-data"

type StageGlyphProps = {
  stage: TimelineStage
  className?: string
}

export function StageGlyph({ stage, className }: StageGlyphProps) {
  switch (stage) {
    case "Predict":
      return (
        <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Predict stage">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.5 2.5" />
          <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )
    case "Build":
      return (
        <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Build stage">
          <rect x="5" y="13" width="5" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="14" y="9" width="5" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9.5" y="16" width="5" height="3" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case "Run":
      return (
        <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Run stage">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10 8.5 16 12 10 15.5Z" fill="currentColor" />
        </svg>
      )
    case "Observe":
      return (
        <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Observe stage">
          <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2.6" fill="currentColor" />
        </svg>
      )
    case "Explain":
      return (
        <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Explain stage">
          <path
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v6A2.5 2.5 0 0 1 17.5 15H11l-4 4v-4H6.5A2.5 2.5 0 0 1 4 12.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M7.5 9.5c1-1.6 2-1.6 3 0s2 1.6 3 0 2-1.6 3 0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )
    case "Debug":
      return (
        <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Debug stage">
          <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M15 15l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M10.5 7.5v6M7.5 10.5h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.6 1.6" />
        </svg>
      )
    case "Challenge":
      return (
        <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Challenge stage">
          <path d="M7 4h10v5a5 5 0 0 1-10 0Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M5 6h2v2a2 2 0 0 1-2-2Zm14 0h-2v2a2 2 0 0 0 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M12 14v3M9 20h6M10 17h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )
    case "Master":
      return (
        <svg viewBox="0 0 24 24" className={className} role="img" aria-label="Master stage">
          <path
            d="M12 3.5 14 8.5 19.5 9.2 15.6 13 16.7 18.5 12 15.7 7.3 18.5 8.4 13 4.5 9.2 10 8.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      )
    default:
      return null
  }
}
