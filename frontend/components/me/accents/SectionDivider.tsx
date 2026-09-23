"use client"

/** Thin animated wave divider with a traveling pulse, used between /me sections. */
export function SectionDivider({ color = "#00D4FF" }: { color?: "#00D4FF" | "#F5B942" }) {
  const path = "M0,12 Q125,2 250,12 T500,12 T750,12 T1000,12"
  return (
    <div className="relative my-1 h-6 w-full overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 1000 24" preserveAspectRatio="none" className="h-full w-full opacity-40">
        <path d={path} fill="none" stroke={color} strokeWidth={1} opacity={0.25} />
        <circle r={2.5} fill={color} style={{ filter: `drop-shadow(0 0 5px ${color}99)` }}>
          <animateMotion dur="7s" repeatCount="indefinite" path={path} />
        </circle>
      </svg>
    </div>
  )
}
