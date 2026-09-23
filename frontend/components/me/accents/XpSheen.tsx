"use client"

import { motion } from "motion/react"

/**
 * Overlay for the circular XP gauge in ProfileHero: a traveling light sheen
 * along the ring plus a one-time spark burst at the leading edge on load.
 */
export function XpSheen({
  radius,
  cx,
  cy,
  pct,
  reduced,
}: {
  radius: number
  cx: number
  cy: number
  pct: number
  reduced: boolean
}) {
  const circumference = 2 * Math.PI * radius
  const angle = pct * 360 - 90
  const tipX = cx + radius * Math.cos((angle * Math.PI) / 180)
  const tipY = cy + radius * Math.sin((angle * Math.PI) / 180)

  if (reduced) return null

  return (
    <g aria-hidden="true">
      <motion.circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={`${circumference * 0.06} ${circumference}`}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 270, opacity: [0, 0.6, 0] }}
        transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1.5, ease: "easeInOut" }}
        style={{ transformOrigin: `${cx}px ${cy}px`, mixBlendMode: "screen" }}
      />
      {Array.from({ length: 5 }).map((_, i) => {
        const spread = (i - 2) * 12
        const a = ((angle + spread) * Math.PI) / 180
        const x2 = cx + (radius + 6) * Math.cos(a)
        const y2 = cy + (radius + 6) * Math.sin(a)
        return (
          <motion.line
            key={i}
            x1={tipX}
            y1={tipY}
            x2={x2}
            y2={y2}
            stroke="#00D4FF"
            strokeWidth={1.4}
            strokeLinecap="round"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, delay: 1.4 }}
          />
        )
      })}
    </g>
  )
}
