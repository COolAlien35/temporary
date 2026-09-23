"use client"

/** One-time scanning sweep across the heatmap grid, played when the section enters view. */
export function HeatmapSweep({ play, reduced }: { play: boolean; reduced: boolean }) {
  if (reduced || !play) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-transparent via-[#00D4FF]/25 to-transparent"
      style={{ animation: "passport-scanner-sweep 1.6s ease-in-out 0.3s 1" }}
    />
  )
}

const CONTOUR_LINES = [
  "M0,20 Q60,5 120,20 T240,20 T360,20",
  "M0,50 Q60,35 120,50 T240,50 T360,50",
  "M0,80 Q60,65 120,80 T240,80 T360,80",
]

/** Faint drifting topographic-style contour lines behind the heatmap card. */
export function HeatmapLattice({ reduced }: { reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 360 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.08]"
      style={{ animation: reduced ? undefined : "passport-lattice-drift 26s ease-in-out infinite alternate" }}
    >
      {CONTOUR_LINES.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#F5B942" strokeWidth={1} />
      ))}
    </svg>
  )
}
