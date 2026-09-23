"use client"

import { motion } from "motion/react"
import { BlochSphere } from "./bloch-sphere"

const STATES = [
  { label: "|00⟩", predicted: 0.5, actual: 0.47 },
  { label: "|01⟩", predicted: 0, actual: 0.03 },
  { label: "|10⟩", predicted: 0, actual: 0.04 },
  { label: "|11⟩", predicted: 0.5, actual: 0.46 },
]

export function PredictSection() {
  return (
    <section className="relative px-6 py-28 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-sm font-medium text-[#4FD1E8]">Predict before you run</span>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Before you run a circuit, predict the outcome — then see how close you were.
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-white/55">
            Every simulation starts with a guess. QuantumLoop compares your predicted distribution
            against the real measurement histogram, so intuition builds with every run — not just
            memorized formulas.
          </p>
          <div className="mt-10 max-w-xs">
            <BlochSphere />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl"
        >
          <div className="mb-6 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-white/50">
              <span className="h-2 w-2 rounded-full bg-[#4FD1E8]" /> Predicted
            </span>
            <span className="flex items-center gap-2 text-white/50">
              <span className="h-2 w-2 rounded-full bg-[#FFB800]" /> Actual
            </span>
          </div>

          <div className="flex h-56 items-end justify-between gap-4">
            {STATES.map((state, i) => (
              <div key={state.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end justify-center gap-1.5">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${state.predicted * 100}%` }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ type: "spring", stiffness: 120, damping: 16, delay: i * 0.08 }}
                    className="w-4 rounded-t-sm bg-[#4FD1E8]/70"
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${state.actual * 100}%` }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ type: "spring", stiffness: 120, damping: 16, delay: i * 0.08 + 0.15 }}
                    className="w-4 rounded-t-sm bg-[#FFB800]/70"
                  />
                </div>
                <span className="text-xs font-mono text-white/45">{state.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
