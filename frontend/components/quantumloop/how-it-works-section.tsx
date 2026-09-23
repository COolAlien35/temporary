"use client"

import { motion } from "motion/react"
import { TiltCard } from "./tilt-card"
import {
  LearnIcon,
  PredictIcon,
  BuildIcon,
  RunIcon,
  ObserveIcon,
  ExplainIcon,
  DebugIcon,
  ChallengeIcon,
  MasterIcon,
} from "@/lib/quantum-icons"

const STEPS = [
  { title: "Learn", desc: "Bite-sized concept intros before you touch a circuit.", Icon: LearnIcon },
  { title: "Predict", desc: "Guess the outcome before you run anything.", Icon: PredictIcon },
  { title: "Build", desc: "Drag gates onto real qubit wires.", Icon: BuildIcon },
  { title: "Run", desc: "Execute your circuit on a live simulator.", Icon: RunIcon },
  { title: "Observe", desc: "See measurement outcomes as they happen.", Icon: ObserveIcon },
  { title: "Explain", desc: "AI breaks down exactly why the result looks that way.", Icon: ExplainIcon },
  { title: "Debug", desc: "Spot the gate that broke your intended state.", Icon: DebugIcon },
  { title: "Challenge", desc: "Apply the concept to a fresh problem set.", Icon: ChallengeIcon },
  { title: "Master", desc: "Unlock the next concept in the loop.", Icon: MasterIcon },
]

export function HowItWorksSection() {
  return (
    <section className="relative px-6 py-28 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <h2 className="text-3xl font-semibold text-white sm:text-4xl">The learning loop</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/55">
            Every concept in QuantumLoop follows the same nine-step cycle — until it clicks.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 32, rotateX: -8 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: "easeOut" }}
            >
              <TiltCard className="group relative h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-colors hover:border-[#4FD1E8]/40 hover:shadow-[0_0_40px_-10px_rgba(79,209,232,0.35)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-[#4FD1E8] transition-colors group-hover:text-[#00D4FF]">
                  <step.Icon className="h-5 w-5" />
                </div>
                <span className="mb-1 block text-xs font-mono text-white/30">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mb-1.5 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{step.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
