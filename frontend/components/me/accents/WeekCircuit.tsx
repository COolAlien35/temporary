"use client"

import { motion } from "motion/react"

/** Pulsing ring drawn around the current day's node in the weekly momentum chart. */
export function WeekCircuit({ cx, cy, reduced }: { cx: number; cy: number; reduced: boolean }) {
  if (reduced) return null
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={6}
      fill="none"
      stroke="#FFB800"
      strokeWidth={1.5}
      initial={{ scale: 1, opacity: 0.8 }}
      animate={{ scale: [1, 1.9, 1], opacity: [0.8, 0, 0.8] }}
      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    />
  )
}
