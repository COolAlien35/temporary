"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"

const RADIUS = 18
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Floating "back to top" button with a scroll-progress ring, shown once the page has scrolled a bit. */
export function BackToTop() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const doc = document.documentElement
        const max = Math.max(1, doc.scrollHeight - window.innerHeight)
        const y = window.scrollY
        setProgress(Math.min(1, y / max))
        setVisible(y > 480)
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#0f1420]/90 text-white/70 shadow-lg backdrop-blur transition-colors hover:text-[#00D4FF]"
        >
          <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx={22} cy={22} r={RADIUS} fill="none" stroke="white" strokeOpacity={0.08} strokeWidth={2} />
            <circle
              cx={22}
              cy={22}
              r={RADIUS}
              fill="none"
              stroke="#00D4FF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            />
          </svg>
          <svg viewBox="0 0 24 24" className="relative h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
