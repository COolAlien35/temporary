"use client"

import { motion } from "motion/react"
import { CircuitDiagram } from "./circuit-diagram"

export function AiTutorSection() {
  return (
    <section className="relative px-6 py-28 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="relative order-2 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl lg:order-1"
        >
          <div className="relative h-56">
            <CircuitDiagram />
            <motion.div
              initial={{ opacity: 0, x: -16, y: 8 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="absolute left-[38%] top-1 w-44 rounded-xl border border-[#FFB800]/40 bg-[#0A0E17]/95 p-3 text-xs leading-relaxed text-white/80 shadow-[0_0_30px_-8px_rgba(255,184,0,0.5)] sm:left-[42%]"
            >
              <span className="mb-1 block font-semibold text-[#FFB800]">AI Tutor</span>
              This X gate flips q1 before measurement — that&apos;s why your prediction was mirrored.
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="order-1 lg:order-2"
        >
          <span className="text-sm font-medium text-[#FFB800]">Circuit-aware AI tutor</span>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Explanations that point at your actual circuit — not a generic answer.
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-white/55">
            The tutor reads the exact gates you placed, tracks the state through every step, and
            tells you precisely which gate produced the result you&apos;re looking at.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/60">
            {["Understands gate order and qubit wiring", "Flags the exact gate causing an unexpected result", "Answers follow-up questions in context"].map(
              (item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFB800]" />
                  {item}
                </li>
              ),
            )}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}
