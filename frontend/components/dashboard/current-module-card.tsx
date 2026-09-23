"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { TiltCard } from "@/components/quantumloop/tilt-card"
import { MiniCircuit } from "@/components/dashboard/mini-circuit"
import { MiniSphere } from "@/components/dashboard/mini-sphere"
import { AmplitudeBarsAccent } from "@/components/home/accents/AmplitudeBarsAccent"
import { handleGlowPointerMove } from "@/lib/home-glow"

const stages = [
  { label: "Setup", status: "done" },
  { label: "Superposition", status: "done" },
  { label: "Entangle", status: "done" },
  { label: "Oracle", status: "current" },
  { label: "Diffuser", status: "upcoming" },
  { label: "Measure", status: "upcoming" },
  { label: "Analyze", status: "upcoming" },
  { label: "Optimize", status: "upcoming" },
  { label: "Submit", status: "upcoming" },
] as const

export function CurrentModuleCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
    >
      <TiltCard strength={4}>
        <section
          onPointerMove={handleGlowPointerMove}
          className="home-glow-card relative overflow-hidden rounded-2xl border border-white/10 border-l-2 border-l-[#00D4FF] bg-white/[0.03] p-5 sm:p-6"
        >
          <AmplitudeBarsAccent />
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-[#00D4FF]/10 px-2.5 py-1 text-[11px] font-medium text-[#00D4FF]">
              In progress &middot; Stage 4 of 9
            </span>
            <span className="text-[11px] text-white/40">2-qubit register &middot; State |&psi;&rang;</span>
          </div>

          <h2
            className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl"
            style={{ fontFamily: "var(--font-space-grotesk)" }}
          >
            Grover&apos;s Search Algorithm
          </h2>
          <p className="mt-1.5 text-sm text-white/55">
            Construct the oracle for a 2-qubit search space and verify amplitude amplification converges in a single
            iteration.
          </p>

          <ol className="mt-6 flex items-center" aria-label="Module progress">
            {stages.map((stage, i) => (
              <li key={stage.label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  {stage.status === "current" ? (
                    <motion.span
                      className="flex h-3 w-3 rounded-full bg-[#00D4FF]"
                      animate={{
                        boxShadow: [
                          "0 0 0 4px rgba(0,212,255,0.25)",
                          "0 0 0 9px rgba(0,212,255,0.05)",
                          "0 0 0 4px rgba(0,212,255,0.25)",
                        ],
                      }}
                      transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    />
                  ) : (
                    <span
                      className={
                        stage.status === "done"
                          ? "flex h-2.5 w-2.5 rounded-full bg-[#00D4FF]"
                          : "flex h-2.5 w-2.5 rounded-full border border-white/25 bg-transparent"
                      }
                    />
                  )}
                  <span
                    className={
                      stage.status === "upcoming"
                        ? "hidden text-[10px] text-white/35 sm:block"
                        : "hidden text-[10px] font-medium text-white/75 sm:block"
                    }
                  >
                    {stage.label}
                  </span>
                </div>
                {i < stages.length - 1 &&
                  (stage.status === "done" ? (
                    <div className="relative mx-1.5 flex-1 overflow-hidden">
                      <motion.div
                        className="h-px origin-left bg-[#00D4FF]/50"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.4, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                      />
                      {stages[i + 1]?.status === "current" && (
                        <motion.span
                          aria-hidden="true"
                          className="absolute top-1/2 left-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#00D4FF]"
                          style={{ filter: "drop-shadow(0 0 5px rgba(0,212,255,0.9))" }}
                          animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="mx-1.5 h-px flex-1 bg-white/15" />
                  ))}
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] font-medium text-white/50">Active circuit slice</p>
              <div className="mt-2 h-28">
                <MiniCircuit />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-medium text-white/50">State amplitude</p>
                <MiniSphere />
              </div>
              <dl className="mt-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-white/45">P(|00&rang;)</dt>
                  <dd className="font-medium text-white/85">6.2%</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-white/45">P(|11&rang;)</dt>
                  <dd className="font-medium text-[#00D4FF]">93.8%</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-white/45">Fidelity</dt>
                  <dd className="font-medium text-white/85">0.996</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href="/lab/grovers" className="home-btn-sheen group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#4FD1E8] px-5 py-2.5 text-xs font-semibold text-[#0A0E17] shadow-[0_0_25px_-5px_rgba(0,212,255,0.6)] transition-shadow hover:shadow-[0_0_35px_-5px_rgba(0,212,255,0.9)]">
              Continue lab
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </Link>
            <Link href="/lab/grovers" className="text-xs font-medium text-white/60 underline-offset-4 hover:text-white hover:underline">Open notebook</Link>
            <span className="ml-auto rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10 px-2.5 py-1 text-[11px] font-medium text-[#FFB800]">
              Due in 2 days
            </span>
          </div>
        </section>
      </TiltCard>
    </motion.div>
  )
}
