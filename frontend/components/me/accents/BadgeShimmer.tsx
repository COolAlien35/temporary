"use client"

const SPARKLES = [
  { x: "18%", y: "20%", delay: 0 },
  { x: "78%", y: "30%", delay: 1.4 },
  { x: "60%", y: "78%", delay: 2.8 },
]

/** Rotating shimmer border + floating glow + occasional sparkle glints for earned badges. */
const EDGE_MASK = "radial-gradient(ellipse at center, transparent 68%, white 100%)"

export function EarnedBadgeAura({ reduced }: { reduced: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      {!reduced && (
        <span
          className="passport-badge-shine absolute inset-0 rounded-xl"
          style={{ maskImage: EDGE_MASK, WebkitMaskImage: EDGE_MASK }}
        />
      )}
      <div className={reduced ? "absolute inset-0 bg-[#FFB800]/[0.04]" : "passport-badge-float absolute inset-0 bg-[#FFB800]/[0.04]"} />
      {!reduced &&
        SPARKLES.map((s, i) => (
          <svg
            key={i}
            viewBox="0 0 10 10"
            className="passport-sparkle absolute h-2.5 w-2.5"
            style={{ left: s.x, top: s.y, animation: `passport-sparkle 3.5s ease-in-out ${s.delay}s infinite` }}
          >
            <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="#FFF3D6" />
          </svg>
        ))}
    </div>
  )
}

/** Breathing lock glyph + faint dotted orbit for locked badges. */
export function LockedBadgeAura({ reduced }: { reduced: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
    >
      <circle
        cx="24"
        cy="20"
        r="15"
        fill="none"
        stroke="white"
        strokeOpacity="0.15"
        strokeWidth="1"
        strokeDasharray="2 4"
        className={reduced ? undefined : "passport-lock-breathe"}
        style={{ transformOrigin: "24px 20px" }}
      />
    </svg>
  )
}
