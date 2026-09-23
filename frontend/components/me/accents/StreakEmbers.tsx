"use client"

const EMBERS = [
  { x: 24, delay: 0, duration: 2.4 },
  { x: 28, delay: 0.8, duration: 2.8 },
  { x: 20, delay: 1.6, duration: 2.2 },
]

/** Tiny rising ember particles emitted above the streak flame icon. */
export function StreakEmbers({ reduced }: { reduced: boolean }) {
  if (reduced) return null
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="pointer-events-none absolute inset-0 h-14 w-14">
      {EMBERS.map((e, i) => (
        <circle
          key={i}
          cx={e.x}
          cy={10}
          r={1.3}
          fill="#FFB800"
          className="passport-ember"
          style={{
            animation: `passport-ember-rise ${e.duration}s ease-out ${e.delay}s infinite`,
            transformOrigin: `${e.x}px 10px`,
          }}
        />
      ))}
    </svg>
  )
}
