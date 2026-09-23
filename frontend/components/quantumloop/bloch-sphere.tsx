"use client"

import { motion } from "motion/react"

export function BlochSphere() {
  return (
    <div
      className="relative mx-auto h-48 w-48 sm:h-56 sm:w-56"
      style={{ perspective: 800 }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-full border border-[#00D4FF]/30 bg-gradient-to-br from-[#00D4FF]/10 to-transparent shadow-[0_0_60px_-10px_rgba(0,212,255,0.5)]" />

      {[0, 60, 120].map((rotate, i) => (
        <motion.div
          key={rotate}
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d", rotate }}
          animate={{ rotateY: 360 }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 10 + i * 3, ease: "linear" }}
        >
          <div className="absolute inset-4 rounded-full border border-[#4FD1E8]/25" />
        </motion.div>
      ))}

      <motion.div
        className="absolute left-1/2 top-1/2 h-24 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full bg-gradient-to-t from-[#FFB800] to-[#FFB800]/20"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateZ: [0, 15, -10, 0] }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 8, ease: "easeInOut" }}
      >
        <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#FFB800] shadow-[0_0_12px_2px_rgba(255,184,0,0.7)]" />
      </motion.div>

      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
    </div>
  )
}
