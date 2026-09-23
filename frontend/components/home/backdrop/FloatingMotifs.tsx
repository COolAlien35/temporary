"use client"

function BlochSphere({ x, y, scale, duration, delay }: { x: number; y: number; scale: number; duration: number; delay: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      opacity={0.12}
      style={{ animation: `home-motif-bob ${duration}s ease-in-out ${delay}s infinite` }}
    >
      <circle r={34} fill="none" stroke="#00D4FF" strokeWidth={1} />
      <ellipse rx={34} ry={10} fill="none" stroke="#00D4FF" strokeWidth={0.8} />
      <line x1={0} y1={0} x2={22} y2={-26} stroke="#F5B942" strokeWidth={1.2} />
      <circle cx={22} cy={-26} r={2.4} fill="#F5B942" />
    </g>
  )
}

function CircuitFragment({ x, y, scale, duration, delay }: { x: number; y: number; scale: number; duration: number; delay: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      opacity={0.13}
      style={{ animation: `home-motif-bob ${duration}s ease-in-out ${delay}s infinite` }}
    >
      <line x1={-30} y1={0} x2={30} y2={0} stroke="#00D4FF" strokeWidth={1} />
      <rect x={-10} y={-10} width={20} height={20} rx={3} fill="none" stroke="#00D4FF" strokeWidth={1} />
      <circle cx={-10} cy={0} r={2} fill="#00D4FF" />
      <line x1={38} y1={-10} x2={38} y2={10} stroke="#F5B942" strokeWidth={1} />
      <circle cx={38} cy={0} r={2.4} fill="#F5B942" />
    </g>
  )
}

function KetSymbol({ x, y, text, duration, delay }: { x: number; y: number; text: string; duration: number; delay: number }) {
  return (
    <text
      x={x}
      y={y}
      fontFamily="var(--font-mono, monospace)"
      fontSize={20}
      fill="#4FD1E8"
      opacity={0.14}
      style={{ animation: `home-motif-bob ${duration}s ease-in-out ${delay}s infinite` }}
    >
      {text}
    </text>
  )
}

const SPHERES = [
  { x: 140, y: 180, scale: 1, duration: 9, delay: 0 },
  { x: 860, y: 460, scale: 1.3, duration: 11, delay: 2 },
]
const FRAGMENTS = [
  { x: 700, y: 140, scale: 0.9, duration: 8, delay: 1 },
  { x: 260, y: 700, scale: 1.1, duration: 10, delay: 3 },
]
const KETS = [
  { x: 460, y: 90, text: "|0\u27E9", duration: 7, delay: 0.5 },
  { x: 900, y: 300, text: "|1\u27E9", duration: 8.5, delay: 1.5 },
  { x: 80, y: 500, text: "|+\u27E9", duration: 9.5, delay: 2.5 },
  { x: 620, y: 780, text: "|\u03C8\u27E9", duration: 8, delay: 3.5 },
]

export function FloatingMotifs({ reduced }: { reduced: boolean }) {
  return (
    <svg viewBox="0 0 1000 900" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      {SPHERES.map((s, i) => (
        <BlochSphere key={`sphere-${i}`} {...s} duration={reduced ? 0 : s.duration} />
      ))}
      {FRAGMENTS.map((f, i) => (
        <CircuitFragment key={`frag-${i}`} {...f} duration={reduced ? 0 : f.duration} />
      ))}
      {KETS.map((k, i) => (
        <KetSymbol key={`ket-${i}`} {...k} duration={reduced ? 0 : k.duration} />
      ))}
    </svg>
  )
}
