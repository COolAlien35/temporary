"use client"

import { motion } from "motion/react"

const tracks = [
  {
    id: "01",
    title: "Deutsch–Jozsa",
    description: "Determine constant vs. balanced functions in a single query.",
    progress: 6,
    total: 6,
    status: "mastered" as const,
  },
  {
    id: "02",
    title: "Quantum Fourier Transform",
    description: "Decompose periodic states into frequency amplitudes.",
    progress: 6,
    total: 6,
    status: "mastered" as const,
  },
  {
    id: "03",
    title: "Grover's Search",
    description: "Amplify the marked state with iterative oracle + diffuser passes.",
    progress: 4,
    total: 9,
    status: "in-progress" as const,
  },
  {
    id: "04",
    title: "Shor's Factoring",
    description: "Reduce integer factoring to order-finding via modular exponentiation.",
    progress: 0,
    total: 8,
    status: "next" as const,
  },
  {
    id: "05",
    title: "Quantum Error Correction",
    description: "Detect and correct bit-flip and phase-flip errors with stabilizer codes.",
    progress: 0,
    total: 7,
    status: "locked" as const,
  },
]

const statusStyles = {
  mastered: { border: "border-l-[#4ADE80]", pill: "bg-[#4ADE80]/10 text-[#4ADE80]", dot: "bg-[#4ADE80]", label: "Mastered" },
  "in-progress": { border: "border-l-[#00D4FF]", pill: "bg-[#00D4FF]/10 text-[#00D4FF]", dot: "bg-[#00D4FF]", label: "In progress" },
  next: { border: "border-l-[#FFB800]", pill: "bg-[#FFB800]/10 text-[#FFB800]", dot: "bg-[#FFB800]", label: "Next up" },
  locked: { border: "border-l-white/15", pill: "bg-white/5 text-white/40", dot: "bg-white/20", label: "Locked" },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", delay: 0.16 } },
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.4 } },
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
}

export function AlgorithmsList() {
  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
            Quantum algorithms
          </h3>
          <p className="mt-0.5 text-xs text-white/45">Core curriculum tracks &middot; 5 sequences</p>
        </div>
        <span className="text-[11px] font-medium text-white/40">Sorted by progress</span>
      </div>

      <motion.ul variants={listVariants} className="mt-4 space-y-2">
        {tracks.map((track) => {
          const style = statusStyles[track.status]
          const isLocked = track.status === "locked"
          const isMastered = track.status === "mastered"
          return (
            <motion.li
              key={track.id}
              variants={rowVariants}
              className={`flex items-center gap-4 rounded-xl border border-white/5 border-l-2 ${style.border} bg-black/20 px-4 py-3 transition-all duration-200 ease-out ${
                isLocked
                  ? "opacity-50"
                  : "hover:-translate-y-0.5 hover:border-l-[3px] hover:bg-black/30 hover:shadow-lg hover:shadow-black/30"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-white">{track.title}</p>
                  <span className="shrink-0 text-[10px] font-medium text-white/35">Track {track.id}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-white/45">{track.description}</p>
              </div>

              <div className="hidden shrink-0 items-center gap-1 sm:flex" aria-hidden="true">
                {Array.from({ length: track.total }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${i < track.progress ? style.dot : "bg-white/10"}`}
                  />
                ))}
              </div>

              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${style.pill}`}
              >
                {isLocked && (
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="11" width="14" height="9" rx="1.5" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                )}
                {isMastered && (
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {style.label}
              </span>
            </motion.li>
          )
        })}
      </motion.ul>
    </motion.section>
  )
}
