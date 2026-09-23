"use client"

import { motion } from "motion/react"

export function FacultyDispatch() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <svg
        viewBox="0 0 60 60"
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 bottom-2 -z-10 h-16 w-16 text-[#00D4FF] opacity-10"
        style={{ animation: "home-motif-bob 9s ease-in-out infinite" }}
      >
        <text x={0} y={48} fontSize={56} fontFamily="Georgia, serif" fill="currentColor">
          &rdquo;
        </text>
      </svg>
      <div className="relative flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4FD1E8] to-[#00D4FF] text-[11px] font-semibold text-[#0A0E17]">
          RK
        </div>
        <div>
          <p className="text-xs font-medium text-white">Dr. Rina Kapoor</p>
          <p className="text-[11px] text-white/40">Lead Faculty, Quantum Algorithms</p>
        </div>
      </div>

      <blockquote className="mt-3 border-l-2 border-white/15 pl-3 text-xs italic leading-relaxed text-white/65">
        &ldquo;Don&apos;t just verify Grover&apos;s speedup&mdash;predict the amplitude before you measure. That habit
        is what separates people who use quantum algorithms from people who understand them.&rdquo;
      </blockquote>

      <p className="mt-2 text-[11px] text-white/35">Faculty dispatch &middot; Week 6</p>
      <motion.a
        href="#"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="mt-1 inline-block text-[11px] font-medium text-[#00D4FF] hover:underline hover:drop-shadow-[0_0_6px_rgba(0,212,255,0.6)]"
      >
        Read dispatch &rarr;
      </motion.a>
    </motion.section>
  )
}
