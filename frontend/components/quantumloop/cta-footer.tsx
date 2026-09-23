"use client"

import { motion } from "motion/react"

export function CtaFooter() {
  return (
    <footer className="relative px-6 pb-12 pt-28 sm:px-10 lg:px-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-semibold text-white sm:text-5xl">
          Start Learning Quantum, <span className="text-[#4FD1E8]">Free</span>
        </h2>
        <p className="mt-4 text-white/55">
          No installs, no prerequisites. Just you, a qubit, and a loop that never lets you stay stuck.
        </p>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="mt-8 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#4FD1E8] px-8 py-3.5 text-sm font-semibold text-[#0A0E17] shadow-[0_0_30px_-5px_rgba(0,212,255,0.6)] transition-shadow hover:shadow-[0_0_50px_-5px_rgba(0,212,255,0.9)]"
        >
          Start Learning Quantum, Free
        </motion.button>
      </motion.div>

      <div className="mx-auto mt-24 flex max-w-6xl flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
        <span className="text-sm font-semibold text-white/70">QuantumLoop</span>
        <nav className="flex gap-6 text-sm text-white/45">
          <a href="#" className="transition-colors hover:text-white">
            About
          </a>
          <a href="#" className="transition-colors hover:text-white">
            Docs
          </a>
          <a href="#" className="transition-colors hover:text-white">
            Contact
          </a>
        </nav>
        <span className="text-xs text-white/30">© 2026 QuantumLoop. Built for students.</span>
      </div>
    </footer>
  )
}
