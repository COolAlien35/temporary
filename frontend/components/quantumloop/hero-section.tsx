"use client"

import { motion } from "motion/react"
import { AtomSvg } from "./atom-svg"
import { LoginCard } from "./login-card"

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-24 sm:px-10 lg:px-16">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40 sm:opacity-60 lg:left-[62%] lg:opacity-100"
        aria-hidden="true"
      >
        <AtomSvg className="h-[420px] w-[420px] text-[#00D4FF] sm:h-[560px] sm:w-[560px] lg:h-[680px] lg:w-[680px]" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >

          <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Learn Quantum Computing by{" "}
            <span className="bg-gradient-to-r from-[#00D4FF] to-[#4FD1E8] bg-clip-text text-transparent">
              Experimenting
            </span>
            , Not Just Reading
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
            Predict outcomes, build real quantum circuits, and run them instantly. QuantumLoop turns
            abstract theory into hands-on intuition — one qubit at a time.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-white/40">
            <span>No setup required</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Free for students</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Real circuits, real results</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="flex justify-center lg:justify-end"
        >
          <LoginCard />
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.8, ease: "easeInOut" }}
        aria-hidden="true"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>
    </section>
  )
}
