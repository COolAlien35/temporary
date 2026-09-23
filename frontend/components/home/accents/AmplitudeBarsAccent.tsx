"use client"

const BARS = [24, 40, 60, 44]

export function AmplitudeBarsAccent() {
  return (
    <svg
      viewBox="0 0 240 160"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-y-0 right-0 -z-10 hidden h-full w-1/2 opacity-[0.1] sm:block"
      aria-hidden="true"
    >
      <line x1={0} y1={80} x2={240} y2={80} stroke="#00D4FF" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
      {BARS.map((h, i) => {
        const x = 20 + i * 55
        return (
          <g key={i} style={{ animation: `home-amp-flip 5.5s ease-in-out ${i * 0.5}s infinite`, transformOrigin: `${x + 15}px 80px` }}>
            <rect x={x} y={80 - h} width={30} height={h} rx={3} fill="#00D4FF" />
            <rect x={x} y={80} width={30} height={h} rx={3} fill="#00D4FF" opacity={0.3} />
          </g>
        )
      })}
    </svg>
  )
}
