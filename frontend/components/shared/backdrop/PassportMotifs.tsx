"use client"

function LaurelWreath({ x, y, scale, duration, delay }: { x: number; y: number; scale: number; duration: number; delay: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      opacity={0.13}
      style={{ animation: `home-motif-bob ${duration}s ease-in-out ${delay}s infinite` }}
    >
      <path d="M-26 0c4-14 12-22 26-22" fill="none" stroke="#F5B942" strokeWidth={1.1} strokeLinecap="round" />
      <path d="M26 0c-4-14-12-22-26-22" fill="none" stroke="#F5B942" strokeWidth={1.1} strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => (
        <g key={`l-${i}`} transform={`translate(${-24 + i * 2} ${-2 - i * 5.5}) rotate(${-30 - i * 6})`}>
          <ellipse rx={5} ry={2.4} fill="none" stroke="#F5B942" strokeWidth={0.9} />
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <g key={`r-${i}`} transform={`translate(${24 - i * 2} ${-2 - i * 5.5}) rotate(${30 + i * 6})`}>
          <ellipse rx={5} ry={2.4} fill="none" stroke="#F5B942" strokeWidth={0.9} />
        </g>
      ))}
    </g>
  )
}

function HexBadge({ x, y, scale, duration, delay }: { x: number; y: number; scale: number; duration: number; delay: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      opacity={0.13}
      style={{ animation: `home-motif-bob ${duration}s ease-in-out ${delay}s infinite` }}
    >
      <polygon points="0,-24 21,-12 21,12 0,24 -21,12 -21,-12" fill="none" stroke="#F5B942" strokeWidth={1.1} />
      <circle r={9} fill="none" stroke="#00D4FF" strokeWidth={0.9} />
    </g>
  )
}

function TrophyCup({ x, y, scale, duration, delay }: { x: number; y: number; scale: number; duration: number; delay: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      opacity={0.13}
      style={{ animation: `home-motif-bob ${duration}s ease-in-out ${delay}s infinite` }}
    >
      <path d="M-12 -18h24v10a12 12 0 0 1-24 0v-10Z" fill="none" stroke="#F5B942" strokeWidth={1.1} />
      <path d="M-12 -14c-8 0-8 12 0 12" fill="none" stroke="#F5B942" strokeWidth={0.9} />
      <path d="M12 -14c8 0 8 12 0 12" fill="none" stroke="#F5B942" strokeWidth={0.9} />
      <line x1={0} y1={4} x2={0} y2={12} stroke="#F5B942" strokeWidth={1.1} />
      <line x1={-8} y1={12} x2={8} y2={12} stroke="#F5B942" strokeWidth={1.1} />
    </g>
  )
}

function StarSpark({ x, y, scale, duration, delay }: { x: number; y: number; scale: number; duration: number; delay: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      opacity={0.15}
      style={{ animation: `home-motif-bob ${duration}s ease-in-out ${delay}s infinite` }}
    >
      <path d="M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z" fill="none" stroke="#00D4FF" strokeWidth={1} />
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
      opacity={0.12}
      style={{ animation: `home-motif-bob ${duration}s ease-in-out ${delay}s infinite` }}
    >
      {text}
    </text>
  )
}

const WREATHS = [{ x: 160, y: 200, scale: 1.1, duration: 10, delay: 0 }]
const BADGES = [{ x: 840, y: 500, scale: 1, duration: 9, delay: 2 }]
const TROPHIES = [{ x: 700, y: 160, scale: 1, duration: 11, delay: 1 }]
const STARS = [
  { x: 260, y: 680, scale: 1, duration: 7, delay: 0.5 },
  { x: 900, y: 260, scale: 0.8, duration: 8, delay: 1.5 },
]
const KETS = [
  { x: 460, y: 100, text: "|\u03C8\u27E9", duration: 8, delay: 0.5 },
  { x: 90, y: 480, text: "|\u03A6+\u27E9", duration: 9, delay: 2 },
  { x: 620, y: 780, text: "|1\u27E9", duration: 7.5, delay: 3 },
]

export function PassportMotifs({ reduced }: { reduced: boolean }) {
  return (
    <svg viewBox="0 0 1000 900" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      {WREATHS.map((s, i) => (
        <LaurelWreath key={`wreath-${i}`} {...s} duration={reduced ? 0 : s.duration} />
      ))}
      {BADGES.map((b, i) => (
        <HexBadge key={`badge-${i}`} {...b} duration={reduced ? 0 : b.duration} />
      ))}
      {TROPHIES.map((t, i) => (
        <TrophyCup key={`trophy-${i}`} {...t} duration={reduced ? 0 : t.duration} />
      ))}
      {STARS.map((s, i) => (
        <StarSpark key={`star-${i}`} {...s} duration={reduced ? 0 : s.duration} />
      ))}
      {KETS.map((k, i) => (
        <KetSymbol key={`ket-${i}`} {...k} duration={reduced ? 0 : k.duration} />
      ))}
    </svg>
  )
}
