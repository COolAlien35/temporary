"use client"

/**
 * "Level-up horizon" — a large dashed arc behind the identity card hinting
 * at the next level, with a marker at its end. The per-level orbit rings
 * around the avatar itself already live in ProfileHero; this is the
 * additional ambient layer requested for the hero section.
 */
export function AvatarOrbits({ nextLevel, reduced }: { nextLevel: number; reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden="true"
      className="pointer-events-none absolute -right-16 -top-24 -z-10 h-[420px] w-[420px] opacity-[0.16] sm:block"
      style={{ animation: reduced ? undefined : "home-orbit-spin 90s linear infinite" }}
    >
      <path
        d="M200 30a170 170 0 1 1-120 50"
        fill="none"
        stroke="#F5B942"
        strokeWidth={1.2}
        strokeDasharray="3 7"
      />
      <g transform="translate(80 80)">
        <circle r={9} fill="none" stroke="#F5B942" strokeWidth={1.2} />
        <text x={0} y={3} textAnchor="middle" fontSize="8" fill="#F5B942">
          {nextLevel}
        </text>
      </g>
    </svg>
  )
}
