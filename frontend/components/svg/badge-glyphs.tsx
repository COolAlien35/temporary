import type { BadgeGlyphId } from "@/lib/quantum-passport-data"

type GlyphProps = {
  className?: string
}

export function HadamardPioneerGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-labelledby="hadamard-pioneer-title">
      <title id="hadamard-pioneer-title">Hadamard Pioneer: a ket wavefunction splitting into two paths</title>
      <circle cx="24" cy="24" r="20.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <path d="M9 24h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 24 22 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 24c4-7 8-9 13-12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 24c4 7 8 9 13 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 19v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function BellStateArchitectGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-labelledby="bell-state-title">
      <title id="bell-state-title">Bell State Architect: two entangled linked spheres</title>
      <circle cx="24" cy="24" r="20.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <circle cx="17" cy="24" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="31" cy="24" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M17 17a7.5 7.5 0 0 1 0 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeOpacity="0.7" />
      <path d="M31 17a7.5 7.5 0 0 0 0 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeOpacity="0.7" />
    </svg>
  )
}

export function DecoherenceDefierGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-labelledby="decoherence-defier-title">
      <title id="decoherence-defier-title">Decoherence Defier: a shield with a noisy wave passing through</title>
      <circle cx="24" cy="24" r="20.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <path
        d="M24 10 34 14v9c0 8-5 13-10 15-5-2-10-7-10-15v-9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M15 23h3l2-5 3 10 2-7 2 4h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function SocraticSolverGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-labelledby="socratic-solver-title">
      <title id="socratic-solver-title">Socratic Solver: a crosshair target over a circuit wire</title>
      <circle cx="24" cy="24" r="20.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="9" y1="24" x2="39" y2="24" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.55" />
      <circle cx="24" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="24" r="1.8" fill="currentColor" />
      <path d="M24 13v4M24 31v4M13 24h4M31 24h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function QuantumOracleGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-labelledby="quantum-oracle-title">
      <title id="quantum-oracle-title">Quantum Oracle: a black box function labeled U sub f</title>
      <circle cx="24" cy="24" r="20.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="8" y1="19" x2="15" y2="19" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.55" />
      <line x1="33" y1="19" x2="40" y2="19" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.55" />
      <line x1="8" y1="29" x2="15" y2="29" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.55" />
      <line x1="33" y1="29" x2="40" y2="29" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.55" />
      <rect x="15" y="13" width="18" height="22" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="24" y="27" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">
        U_f
      </text>
    </svg>
  )
}

export function InterferenceMasterGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-labelledby="interference-master-title">
      <title id="interference-master-title">Interference Master: constructive and destructive waves overlapping</title>
      <circle cx="24" cy="24" r="20.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <path d="M8 20c3-6 6-6 9 0s6 6 9 0 6-6 9 0 6 6 9 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M8 30c3 6 6 6 9 0s6-6 9 0 6 6 9 0 6-6 9 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2.5 2.5"
        strokeOpacity="0.65"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function PhaseWhispererGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-labelledby="phase-whisperer-title">
      <title id="phase-whisperer-title">Phase Whisperer: e to the i theta with a phase wheel</title>
      <circle cx="24" cy="24" r="20.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <circle cx="24" cy="27" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1="24"
          y1="27"
          x2={24 + 10 * Math.cos((angle * Math.PI) / 180)}
          y2={27 + 10 * Math.sin((angle * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="0.9"
          strokeOpacity="0.4"
        />
      ))}
      <path d="M24 27 33 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <text x="24" y="13" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="currentColor">
        e^i&theta;
      </text>
    </svg>
  )
}

export function UnitaryGrandmasterGlyph({ className }: GlyphProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-labelledby="unitary-grandmaster-title">
      <title id="unitary-grandmaster-title">Unitary Grandmaster: a large U inside a hexagon</title>
      <polygon
        points="24,4.5 39,13 39,30 24,38.5 9,30 9,13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M17 17v10a7 7 0 0 0 14 0V17" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

const GLYPHS: Record<BadgeGlyphId, (props: GlyphProps) => React.JSX.Element> = {
  hadamard: HadamardPioneerGlyph,
  bell: BellStateArchitectGlyph,
  decoherence: DecoherenceDefierGlyph,
  socratic: SocraticSolverGlyph,
  oracle: QuantumOracleGlyph,
  interference: InterferenceMasterGlyph,
  phase: PhaseWhispererGlyph,
  unitary: UnitaryGrandmasterGlyph,
}

export function BadgeGlyph({ id, className }: { id: BadgeGlyphId; className?: string }) {
  const Glyph = GLYPHS[id]
  return <Glyph className={className} />
}
