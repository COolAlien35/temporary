"use client"

import { motion } from "motion/react"

export function MiniSphere() {
  return (
    <div className="relative h-10 w-10 shrink-0" aria-hidden="true">
      <div className="absolute inset-0 rounded-full border border-[#00D4FF]/40 bg-gradient-to-br from-[#00D4FF]/15 to-transparent" />
      <div className="absolute inset-[3px] rounded-full border border-white/10" style={{ transform: "rotateX(70deg)" }} />
      <span className="absolute left-1/2 top-1/2 h-3.5 w-px origin-bottom -translate-x-1/2 -translate-y-full bg-[#FFB800]" />
      <motion.span
        className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#FFB800]"
        animate={{
          boxShadow: [
            "0 0 6px 1px rgba(255,184,0,0.5)",
            "0 0 10px 2px rgba(255,184,0,0.9)",
            "0 0 6px 1px rgba(255,184,0,0.5)",
          ],
        }}
        transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
    </div>
  )
}
