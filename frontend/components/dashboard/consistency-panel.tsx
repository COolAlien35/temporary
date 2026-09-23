"use client"

import { motion } from "motion/react"

const days = Array.from({ length: 14 }).map((_, i) => {
  if (i === 12) return "today"
  if (i > 12) return "future"
  return i % 5 === 4 ? "empty" : "filled"
})

export function ConsistencyPanel() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="flex items-center gap-1.5">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 text-[#00D4FF]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
        <h3 className="text-xs font-semibold text-white">Consistency &middot; 12 days active</h3>
      </div>

      <div className="mt-3 flex items-center gap-1" aria-hidden="true">
        {days.map((state, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: 0.2 + i * 0.03, ease: "easeOut" }}
            className={
              state === "today"
                ? "h-2.5 w-2.5 rounded-full bg-[#00D4FF] ring-2 ring-[#00D4FF]/30"
                : state === "filled"
                  ? "h-2.5 w-2.5 rounded-full bg-[#4ADE80]"
                  : state === "future"
                    ? "h-2.5 w-2.5 rounded-full bg-white/10"
                    : "h-2.5 w-2.5 rounded-full bg-white/15"
            }
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-white/40">Keep it up &mdash; longest streak so far is 18 days.</p>
    </motion.section>
  )
}
