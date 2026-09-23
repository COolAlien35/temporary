"use client"

import { useEffect, useState } from "react"

type Star = {
  id: number
  x: number
  y: number
  r: number
  opacity: number
  twinkle: boolean
  delay: number
  duration: number
}

// Generated only on the client (after mount) to avoid SSR/CSR hydration
// mismatches from Math.random(); the backdrop is purely decorative so an
// empty first paint is imperceptible.
export function StarField({ reduced }: { reduced: boolean }) {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    setStars(
      Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        r: 0.3 + Math.random() * 0.9,
        opacity: 0.15 + Math.random() * 0.45,
        twinkle: i % 3 === 0,
        delay: Math.random() * 5,
        duration: 2.5 + Math.random() * 3,
      })),
    )
  }, [])

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      {stars.map((s) => (
        <circle
          key={s.id}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#EAF6FF"
          opacity={s.opacity}
          style={
            reduced
              ? undefined
              : s.twinkle
                ? { animation: `home-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite` }
                : undefined
          }
        />
      ))}
    </svg>
  )
}
