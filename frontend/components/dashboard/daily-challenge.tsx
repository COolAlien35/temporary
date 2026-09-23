"use client"

import { useState } from "react"
import { motion } from "motion/react"

const options = [
  "It collapses to a single classical bit",
  "It remains entangled with the ancilla qubit",
  "It becomes an equal superposition of |0⟩ and |1⟩",
]

export function DailyChallenge() {
  const [selected, setSelected] = useState(2)

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-[#FFB800]/25 bg-[#FFB800]/[0.05] p-4"
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-6 -z-10 h-28 w-28 opacity-20"
        style={{ animation: "home-orbit-spin 22s linear infinite" }}
      >
        <circle cx={50} cy={50} r={38} fill="none" stroke="#FFB800" strokeWidth={1.5} strokeDasharray="6 8" />
      </svg>
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#FFB800]">Daily challenge</span>
        <motion.span
          className="rounded-full bg-[#FFB800]/15 px-2 py-0.5 text-[10px] font-medium text-[#FFB800]"
          animate={{ opacity: [1, 0.55, 1] }}
          transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY, repeatDelay: 2, ease: "easeInOut" }}
        >
          +25 XP
        </motion.span>
      </div>

      <h4 className="mt-2 text-sm font-semibold text-white">What happens after a Hadamard gate on |0&rang;?</h4>
      <p className="mt-1 text-xs text-white/55">
        Consider a single qubit initialized to |0&rang; passed through one H gate with no further operations applied.
      </p>

      <fieldset className="mt-3 space-y-2">
        <legend className="sr-only">Answer options</legend>
        {options.map((option, i) => {
          const isSelected = selected === i
          return (
            <label
              key={option}
              className="group flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/75 transition-colors duration-200 hover:border-[#FFB800]/50 hover:bg-black/30"
            >
              <span>{option}</span>
              <input
                type="radio"
                name="daily-challenge"
                checked={isSelected}
                onChange={() => setSelected(i)}
                className="sr-only"
              />
              <span
                className={`relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                  isSelected ? "border-[#FFB800]" : "border-white/30 group-hover:border-[#FFB800]/60"
                }`}
              >
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="h-1.5 w-1.5 rounded-full bg-[#FFB800]"
                  />
                )}
              </span>
            </label>
          )
        })}
      </fieldset>
    </motion.section>
  )
}
