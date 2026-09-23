"use client"

const RINGS = [
  { cx: 780, cy: 220, rx: 260, ry: 100, rotate: -18, color: "#00D4FF", duration: 46, dotDelay: 0 },
  { cx: 220, cy: 520, rx: 300, ry: 120, rotate: 24, color: "#F5B942", duration: 58, dotDelay: 6 },
  { cx: 620, cy: 680, rx: 220, ry: 90, rotate: 8, color: "#00D4FF", duration: 38, dotDelay: 12 },
]

export function OrbitRings({
  reduced,
  variant = "roadmap",
}: {
  reduced: boolean
  variant?: "roadmap" | "passport"
}) {
  return (
    <svg viewBox="0 0 1000 900" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      {RINGS.map((ring, i) => {
        const pathId = `orbit-path-${variant}-${i}`
        const strokeColor = variant === "passport" ? "#F5B942" : ring.color
        const dotColor = variant === "passport" ? "#00D4FF" : ring.color
        return (
          <g key={i} opacity={0.14} style={reduced ? undefined : { animation: `home-orbit-spin ${ring.duration}s linear infinite`, transformOrigin: `${ring.cx}px ${ring.cy}px` }}>
            <ellipse
              id={pathId}
              cx={ring.cx}
              cy={ring.cy}
              rx={ring.rx}
              ry={ring.ry}
              transform={`rotate(${ring.rotate} ${ring.cx} ${ring.cy})`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1}
            />
            {!reduced && (
              <circle r={3} fill={dotColor}>
                <animateMotion dur={`${ring.duration * 0.6}s`} repeatCount="indefinite" begin={`${ring.dotDelay}s`}>
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            )}
          </g>
        )
      })}
    </svg>
  )
}
