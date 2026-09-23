"use client"

import { motion } from "motion/react"
import { TiltCard } from "@/components/quantumloop/tilt-card"
import { PlaygroundWave } from "@/components/home/accents/PlaygroundWave"
import { handleGlowPointerMove } from "@/lib/home-glow"

const bars = [18, 34, 52, 88, 46, 28, 14]

export function PlaygroundCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <TiltCard strength={4}>
        <section
          onPointerMove={handleGlowPointerMove}
          className="home-glow-card relative mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
        >
          <PlaygroundWave />
          <div className="relative flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-[#4FD1E8]">Interactive playground</span>
              <h3
                className="mt-1 text-base font-semibold text-white sm:text-lg"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                Run circuits on live simulator state
              </h3>
            </div>
            <motion.a
              href="#"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="whitespace-nowrap text-xs font-medium text-[#00D4FF] hover:underline hover:drop-shadow-[0_0_6px_rgba(0,212,255,0.6)]"
            >
              Launch studio &rarr;
            </motion.a>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/25 p-4 sm:col-span-1">
              <p className="text-[11px] font-medium text-white/50">Measurement histogram</p>
              <svg viewBox="0 0 140 80" className="mt-3 h-20 w-full" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="bar-gradient" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#4FD1E8" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                {bars.map((h, i) => {
                  const barWidth = 140 / bars.length - 4
                  const x = i * (140 / bars.length) + 2
                  const height = (h / 100) * 76
                  return (
                    <motion.rect
                      key={i}
                      x={x}
                      width={barWidth}
                      rx={2}
                      fill="url(#bar-gradient)"
                      initial={{ height: 0, y: 80 }}
                      whileInView={{ height, y: 80 - height }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease: "easeOut" }}
                      style={{
                        transformOrigin: `${x + barWidth / 2}px 80px`,
                        animation: `home-jitter ${1.4 + (i % 3) * 0.2}s ease-in-out ${0.6 + i * 0.15}s infinite`,
                      }}
                    />
                  )
                })}
              </svg>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/25 p-4 sm:col-span-1">
              <label className="flex items-center justify-between text-[11px] font-medium text-white/50">
                Shots
                <span className="text-white/80">4,096</span>
              </label>
              <input
                type="range"
                defaultValue={70}
                className="mt-3 h-1 w-full appearance-none rounded-full bg-white/10 accent-[#00D4FF]"
                aria-label="Shots"
              />
              <label className="mt-4 flex items-center justify-between text-[11px] font-medium text-white/50">
                Noise model
                <span className="text-white/80">Low</span>
              </label>
              <input
                type="range"
                defaultValue={20}
                className="mt-3 h-1 w-full appearance-none rounded-full bg-white/10 accent-[#4FD1E8]"
                aria-label="Noise model"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-black/25 p-4 sm:col-span-1">
              <p className="text-[11px] font-medium text-white/50">Hardware status</p>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/45">Backend</span>
                  <span className="text-white/80">ibm_sim_27q</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/45">Queue</span>
                  <span className="text-white/80">0 jobs</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 rounded-full bg-[#4ADE80]/10 px-2.5 py-1 text-[#4ADE80]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
                  Ready
                </div>
              </div>
            </div>
          </div>
        </section>
      </TiltCard>
    </motion.div>
  )
}
