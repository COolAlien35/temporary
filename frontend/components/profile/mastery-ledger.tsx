"use client"

import { motion, useReducedMotion } from "motion/react"
import { MASTERY_CONCEPTS } from "@/lib/quantum-passport-data"
import { LatticeBackdrop } from "@/components/me/accents/LatticeBackdrop"
import { handleGlowPointerMove } from "@/lib/home-glow"

const TARGET = 80

export function MasteryLedger() {
  const reduceMotion = useReducedMotion()

  return (
    <div
      onPointerMove={handleGlowPointerMove}
      className="home-glow-card relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <LatticeBackdrop reduced={!!reduceMotion} />
      <h3 className="relative text-lg font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
        Concept Mastery Ledger
      </h3>
      <p className="relative mt-1 text-xs text-white/45">Mastery target is {TARGET}% per concept.</p>

      <ul className="relative mt-5 flex flex-1 flex-col gap-4">
        {MASTERY_CONCEPTS.map((row, i) => {
          const mastered = row.value >= TARGET
          return (
            <li key={row.concept}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-white/85">
                  {row.concept}
                  {mastered && (
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-[#4ADE80]" fill="none" aria-hidden="true">
                      <motion.path
                        d="M3 8.5 6.5 12 13 4.5"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: reduceMotion ? 1 : 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.6 + i * 0.08, ease: "easeOut" }}
                      />
                    </svg>
                  )}
                </span>
                <span
                  className={
                    mastered
                      ? "rounded-full bg-[#4ADE80]/10 px-2 py-0.5 text-[10px] font-medium text-[#4ADE80]"
                      : "rounded-full bg-[#FFB800]/10 px-2 py-0.5 text-[10px] font-medium text-[#FFB800]"
                  }
                >
                  {mastered ? "Mastered" : `${row.value}%`}
                </span>
              </div>
              <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="absolute top-0 z-10 h-full w-px bg-white/30"
                  style={{ left: `${TARGET}%` }}
                  aria-hidden="true"
                />
                <motion.div
                  className={
                    mastered
                      ? "relative h-full overflow-hidden rounded-full bg-[#4ADE80]"
                      : "relative h-full overflow-hidden rounded-full bg-[#FFB800]"
                  }
                  initial={{ width: reduceMotion ? `${row.value}%` : "0%" }}
                  whileInView={{ width: `${row.value}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: reduceMotion ? 0 : i * 0.08, ease: "easeOut" }}
                >
                  {mastered && !reduceMotion && (
                    <motion.span
                      className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                      initial={{ x: "-100%" }}
                      whileInView={{ x: "300%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.6 + i * 0.08, ease: "easeInOut" }}
                    />
                  )}
                  {!mastered && !reduceMotion && (
                    <motion.span
                      className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#FFB800]"
                      animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
                    />
                  )}
                </motion.div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
