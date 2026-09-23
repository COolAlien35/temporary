"use client"

import { motion, useReducedMotion } from "motion/react"
import { MASTERY_CONCEPTS } from "@/lib/quantum-passport-data"

const TARGET = 80

export function MasteryLedger() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
        Concept Mastery Ledger
      </h3>
      <p className="mt-1 text-xs text-white/45">Mastery target is {TARGET}% per concept.</p>

      <ul className="mt-5 flex flex-1 flex-col gap-4">
        {MASTERY_CONCEPTS.map((row, i) => {
          const mastered = row.value >= TARGET
          return (
            <li key={row.concept}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-white/85">{row.concept}</span>
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
              <div className="relative mt-2 h-2 w-full rounded-full bg-white/[0.06]">
                <div
                  className="absolute top-0 h-full w-px bg-white/30"
                  style={{ left: `${TARGET}%` }}
                  aria-hidden="true"
                />
                <motion.div
                  className={mastered ? "h-full rounded-full bg-[#4ADE80]" : "h-full rounded-full bg-[#FFB800]"}
                  initial={{ width: reduceMotion ? `${row.value}%` : "0%" }}
                  whileInView={{ width: `${row.value}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: reduceMotion ? 0 : i * 0.08, ease: "easeOut" }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
