"use client"

/** Thin glowing horizontal shelf line with end caps, drawn beneath a badge row. */
export function ShelfLine() {
  return (
    <svg viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" className="mt-3 h-1.5 w-full opacity-40">
      <line x1={2} y1={3} x2={98} y2={3} stroke="#F5B942" strokeWidth={1} style={{ filter: "drop-shadow(0 0 3px rgba(245,185,66,0.6))" }} />
      <circle cx={2} cy={3} r={1.6} fill="#F5B942" />
      <circle cx={98} cy={3} r={1.6} fill="#F5B942" />
    </svg>
  )
}
