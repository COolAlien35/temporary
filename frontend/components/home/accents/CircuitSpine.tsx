"use client"

export function CircuitSpine() {
  return (
    <svg
      viewBox="0 0 20 400"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-y-0 left-3 -z-10 hidden h-full w-5 opacity-[0.14] sm:block"
      aria-hidden="true"
    >
      <line x1={10} y1={0} x2={10} y2={400} stroke="#00D4FF" strokeWidth={1} />
      <circle r={2.5} fill="#00D4FF" style={{ filter: "drop-shadow(0 0 4px rgba(0,212,255,0.8))" }}>
        <animateMotion dur="6s" repeatCount="indefinite" path="M10,0 L10,400" />
      </circle>
    </svg>
  )
}
