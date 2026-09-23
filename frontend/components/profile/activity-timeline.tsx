"use client"

"use client"

import { motion, useReducedMotion } from "motion/react"
import { TIMELINE } from "@/lib/quantum-passport-data"
import { StageGlyph } from "@/components/svg/stage-glyphs"
import { MiniCircuit } from "@/components/dashboard/mini-circuit"
import { TimelineDraw } from "@/components/me/accents/TimelineDraw"
import { useCountUp } from "@/hooks/use-count-up"
import { handleGlowPointerMove } from "@/lib/home-glow"

function XpChip({ xp }: { xp: number }) {
  const value = useCountUp(xp, { duration: 700 })
  return (
    <span className="rounded-full bg-[#FFB800]/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-[#FFB800]">
      +{value} XP
    </span>
  )
}

export function ActivityTimeline() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
        Recent Experiments
      </h3>

      <ol className="relative mt-5 flex flex-col gap-6 border-l border-white/10 pl-6" aria-label="Recent experiment timeline">
        <TimelineDraw reduced={!!reduceMotion} />
        {TIMELINE.map((entry, i) => (
          <motion.li
            key={entry.id}
            className="relative"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
          >
            <motion.span
              className="absolute -left-[29px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#00D4FF]/40 bg-[#0f1420] text-[#00D4FF]"
              initial={{ scale: 0.5, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: reduceMotion ? 0 : 0.15 + i * 0.06 }}
              style={{ filter: "drop-shadow(0 0 4px rgba(0,212,255,0.5))" }}
            >
              <StageGlyph stage={entry.stage} className="h-3.5 w-3.5" />
            </motion.span>

            <div
              onPointerMove={handleGlowPointerMove}
              className="home-glow-card flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{entry.algorithm}</p>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/60">
                    {entry.stage}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/40">{entry.date}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#4ADE80]/10 px-2 py-0.5 text-[10px] font-medium text-[#4ADE80]">
                    {entry.accuracy}% accuracy
                  </span>
                  <XpChip xp={entry.xp} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden h-12 w-24 shrink-0 sm:block">
                  <MiniCircuit />
                </div>
                <a
                  href="#"
                  className="group inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-[#00D4FF] hover:underline"
                >
                  Resume Lab
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  )
}
