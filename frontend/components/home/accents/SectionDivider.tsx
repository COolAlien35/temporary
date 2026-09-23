"use client"

export function SectionDivider() {
  return (
    <div className="relative my-2 h-6 w-full overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 1000 24" preserveAspectRatio="none" className="h-full w-full opacity-40">
        <path d="M0,12 Q125,2 250,12 T500,12 T750,12 T1000,12" fill="none" stroke="#00D4FF" strokeWidth={1} opacity={0.25} />
        <circle r={2.5} fill="#00D4FF" style={{ filter: "drop-shadow(0 0 5px rgba(0,212,255,0.9))" }}>
          <animateMotion dur="7s" repeatCount="indefinite" path="M0,12 Q125,2 250,12 T500,12 T750,12 T1000,12" />
        </circle>
      </svg>
    </div>
  )
}
