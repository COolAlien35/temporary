"use client"

const HEX = "M12 0 L24 7 L24 21 L12 28 L0 21 L0 7 Z"

/** Faint drifting hexagonal lattice pattern behind the mastery ledger card. */
export function LatticeBackdrop({ reduced }: { reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.06]"
      style={{ animation: reduced ? undefined : "passport-lattice-drift 32s ease-in-out infinite alternate" }}
    >
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 6 }).map((_, col) => (
          <path
            key={`${row}-${col}`}
            d={HEX}
            transform={`translate(${col * 26 + (row % 2 === 0 ? 0 : 13)} ${row * 22})`}
            fill="none"
            stroke="#00D4FF"
            strokeWidth={0.8}
          />
        )),
      )}
    </svg>
  )
}
