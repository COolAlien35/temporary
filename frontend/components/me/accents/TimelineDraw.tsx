"use client"

import { motion } from "motion/react"

/**
 * Vertical timeline spine that draws itself top-to-bottom once the section
 * scrolls into view. Rendered as an absolutely positioned overlay so the
 * host list's own `border-l` can stay as a static fallback underneath.
 */
export function TimelineDraw({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      aria-hidden="true"
      className="absolute -left-px top-0 w-px bg-[#00D4FF]/50"
      style={{ filter: "drop-shadow(0 0 3px rgba(0,212,255,0.6))" }}
      initial={{ height: reduced ? "100%" : "0%" }}
      whileInView={{ height: "100%" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 1.1, ease: "easeInOut" }}
    />
  )
}
